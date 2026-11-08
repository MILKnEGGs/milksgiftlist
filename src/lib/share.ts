// Sharing with no server. A list travels as a compressed code inside a text message:
//
//  * Owner → family: a readable list plus a LINK. Tapping it opens the list in any phone's browser, no app
//    needed, where they can mark what they're getting. The code sits after the # in the link, and browsers
//    never send that part to the website, so the list stays between phones.
//  * Family → owner: "Send my picks" copies a short message with an MGF: code. The owner copies the whole
//    message and taps Paste in the app. (A code, not a link, because on iPhone a tapped link opens Safari,
//    which keeps its storage separate from the Home Screen app.)
//
//   payload = "z" + base64url(deflate(JSON))   (or "j" + base64url(JSON) on old browsers)

import { isAdded, listName, money, sortedItems, activeClaims, itemState, sizesText } from './data';
import type { Claim, ClaimStatus, GiftList, Item, Size } from './types';

/** How much of who's-getting-what goes out with a list. */
export type ShareMode = 'names' | 'taken' | 'none';

export interface ListShare {
  t: 'list';
  list: Pick<GiftList, 'id' | 'title' | 'forWho' | 'date' | 'updatedAt' | 'items' | 'dropped'>;
  ownerName: string;
  ownerId: string;
  claims: Claim[];
  sizes: Size[];
}

export interface ReplyShare {
  t: 'reply';
  listId: string;
  title: string;
  byName: string;
  byId: string;
  /** [itemId, status, at] */
  picks: [string, ClaimStatus, number][];
  /** Gifts they added to the list (ones they're getting that weren't on it). */
  added: Item[];
}

export type Share = ListShare | ReplyShare;

// Compact wire format: short keys and arrays keep links short enough to text.
const ST: ClaimStatus[] = ['gone', 'getting', 'bought'];
type WireItem = [id: string, name: string, links: string[], price: number, note: string, flags: number, addedAt: number, addedBy?: string, addedById?: string];

const itemToWire = (it: Item): WireItem => {
  const w: WireItem = [it.id, it.name, it.links, it.price ?? -1, it.note, (it.star ? 1 : 0) | (it.many ? 2 : 0), it.addedAt];
  if (isAdded(it)) w.push(it.addedBy ?? '', it.addedById ?? '');
  return w;
};

const itemFromWire = ([id, name, links, price, note, flags, addedAt, addedBy, addedById]: WireItem): Item => ({
  id,
  name,
  links: links ?? [],
  price: price >= 0 ? price : undefined,
  note: note ?? '',
  star: !!(flags & 1),
  many: !!(flags & 2),
  addedAt: addedAt ?? 0,
  ...(addedBy !== undefined ? { addedBy } : {}),
  ...(addedById ? { addedById } : {}),
});
type Wire =
  | {
      v: 1;
      t: 'l';
      i: string;
      n: string;
      f: string;
      d: string;
      u: number;
      o: string;
      oi: string;
      g: WireItem[];
      /** [itemId, by, byId, status, at] */
      c: [string, string, string, number, number][];
      /** dropped item ids */
      x?: string[];
      /** sizes [label, value] */
      z?: [string, string][];
    }
  | { v: 1; t: 'r'; i: string; n: string; b: string; bi: string; c: [string, number, number][]; a?: WireItem[] };

function toWire(s: Share): Wire {
  if (s.t === 'reply')
    return {
      v: 1,
      t: 'r',
      i: s.listId,
      n: s.title,
      b: s.byName,
      bi: s.byId,
      c: s.picks.map(([id, st, at]) => [id, ST.indexOf(st), at]),
      ...(s.added.length ? { a: s.added.map(itemToWire) } : {}),
    };
  const l = s.list;
  return {
    v: 1,
    t: 'l',
    i: l.id,
    n: l.title,
    f: l.forWho,
    d: l.date ?? '',
    u: l.updatedAt,
    o: s.ownerName,
    oi: s.ownerId,
    g: l.items.map(itemToWire),
    c: s.claims.map((c) => [c.itemId, c.by, c.byId, ST.indexOf(c.status), c.at]),
    ...(l.dropped.length ? { x: l.dropped } : {}),
    ...(s.sizes.length ? { z: s.sizes.map((z) => [z.label, z.value] as [string, string]) } : {}),
  };
}

function fromWire(w: Wire): Share {
  if (w?.v !== 1 || typeof w.i !== 'string' || !Array.isArray(w.c)) throw new Error('bad');
  if (w.t === 'r')
    return {
      t: 'reply',
      listId: w.i,
      title: w.n ?? '',
      byName: w.b ?? '',
      byId: w.bi,
      picks: w.c.map(([id, st, at]) => [id, ST[st] ?? 'gone', at]),
      added: Array.isArray(w.a) ? w.a.map(itemFromWire) : [],
    };
  if (w.t !== 'l' || !Array.isArray(w.g)) throw new Error('bad');
  const items = w.g.map(itemFromWire);
  return {
    t: 'list',
    list: { id: w.i, title: w.n, forWho: w.f ?? '', date: w.d || undefined, updatedAt: w.u ?? 0, items, dropped: Array.isArray(w.x) ? w.x : [] },
    sizes: Array.isArray(w.z) ? w.z.map(([label, value]) => ({ label: label ?? '', value: value ?? '' })) : [],
    ownerName: w.o ?? '',
    ownerId: w.oi ?? '',
    claims: w.c.map(([itemId, by, byId, st, at]) => ({ itemId, by, byId, status: ST[st] ?? 'gone', at })),
  };
}

/** What goes out when sharing a list. Shared copies pass along their own copy the same way (forwarding). */
export function listShare(l: GiftList, mode: ShareMode, me: { name: string; deviceId: string }, sizes: Size[] = []): ListShare {
  const claims = mode === 'none' ? [] : l.claims.map((c) => (mode === 'taken' ? { ...c, by: '' } : { ...c }));
  const { id, title, forWho, date, updatedAt, dropped } = l;
  // "Added by Grandma" stays on a gift, but with names hidden it shouldn't give away who's getting it.
  // And the person the list is for ('none') never sees gifts family added: those are already being bought.
  const items =
    mode === 'names'
      ? l.items
      : mode === 'taken'
        ? l.items.map((it) => (isAdded(it) ? { ...it, addedBy: '' } : it))
        : l.items.filter((it) => !isAdded(it));
  return {
    t: 'list',
    sizes,
    list: { id, title, forWho, date, updatedAt, items, dropped },
    ownerName: l.kind === 'shared' ? l.ownerName ?? '' : me.name,
    ownerId: l.kind === 'shared' ? l.ownerId ?? '' : me.deviceId,
    claims,
  };
}

export function replyShare(l: GiftList, me: { name: string; deviceId: string }): ReplyShare {
  return {
    t: 'reply',
    listId: l.id,
    title: listName(l),
    byName: me.name,
    byId: me.deviceId,
    picks: l.claims.filter((c) => c.byId === me.deviceId).map((c) => [c.itemId, c.status, c.at]),
    added: l.items.filter((it) => it.addedById === me.deviceId).map((it) => ({ ...it, addedBy: me.name })),
  };
}

// ---------------------------------------------------------------------------------------------
// Encoding

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export async function encodeShare(s: Share): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toWire(s)));
  if (typeof CompressionStream === 'function') return 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw')));
  return 'j' + b64url(json);
}

export async function decodeShare(payload: string): Promise<Share> {
  try {
    const kind = payload[0];
    let bytes = unb64url(payload.slice(1));
    if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (kind !== 'j') throw new Error('bad');
    return fromWire(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new Error("That code doesn't look complete. Ask for it to be sent again, and copy the whole message.");
  }
}

/** Pulls the code out of anything that contains one: a whole copied message, a list link, or just the code. */
export function payloadFrom(text: string): string | undefined {
  return text.match(/(?:MGF:|#\/s\/)([zj][A-Za-z0-9_-]{8,})/)?.[1];
}

/** The address of this app, for links (works at a site root or a GitHub Pages subpath). */
export const appUrl = (): string => location.origin + location.pathname.replace(/index\.html$/, '');

// ---------------------------------------------------------------------------------------------
// Messages

const STATUS_WORD: Record<ClaimStatus, string> = { getting: 'getting', bought: 'bought', gone: 'not getting anymore' };

function itemLine(l: GiftList, it: Item, mode: ShareMode): string {
  const price = it.price !== undefined ? ` — ${money(it.price)}` : '';
  const note = it.note.trim() ? ` (${it.note.trim().replace(/\s*\n\s*/g, '; ')})` : '';
  const state = itemState(l, it);
  let tail = '';
  if (mode === 'names' && state !== 'open') {
    const names = activeClaims(l, it.id).map((c) => c.by || 'someone');
    tail = `  ✓ ${names.join(' & ')}`;
  } else if (mode === 'taken' && (state === 'taken' || state === 'double')) tail = '  ✓ taken';
  const added = isAdded(it) && mode === 'names' && it.addedBy ? ` (added by ${it.addedBy})` : '';
  return `${it.star ? '⭐' : '•'} ${it.name}${note}${price}${it.many ? ' (more than one is OK)' : ''}${added}${tail}`;
}

export async function listMessage(l: GiftList, mode: ShareMode, me: { name: string; deviceId: string }, sizes: Size[] = []): Promise<string> {
  const lines = [`🎁 ${l.title}${l.forWho.trim() ? ` — for ${l.forWho.trim()}` : ''}`];
  if (l.date) lines.push(`📅 ${new Date(l.date + 'T12:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}`);
  if (sizes.length) lines.push(`📏 Sizes: ${sizesText(sizes)}`);
  lines.push('');
  const items = sortedItems(l).filter((it) => mode !== 'none' || !isAdded(it));
  if (!items.length) lines.push('(No gift ideas yet.)');
  for (const it of items) lines.push(itemLine(l, it, mode));
  const payload = await encodeShare(listShare(l, mode, me, sizes));
  lines.push(
    '',
    "🛍️ See the links and mark what you're getting, so nobody doubles up:",
    `${appUrl()}#/s/${payload}`,
    '',
    '(Have Milk\'s Gift List on your Home Screen? Copy this whole message and tap “Paste” in the app instead.)',
  );
  return lines.join('\n');
}

export async function replyMessage(l: GiftList, me: { name: string; deviceId: string }): Promise<string> {
  const r = replyShare(l, me);
  const byItem = new Map(l.items.map((it) => [it.id, it]));
  const lines = [`🎁 ${me.name ? `${me.name}'s` : 'My'} picks for “${listName(l)}”:`];
  // What they're getting first, then anything they changed their mind on.
  const shown = r.picks.filter(([id]) => byItem.has(id)).sort((a, b) => Number(a[1] === 'gone') - Number(b[1] === 'gone'));
  for (const [id, s] of shown) lines.push(`• ${byItem.get(id)!.name} — ${STATUS_WORD[s]}${byItem.get(id)!.addedById ? ' (I added it)' : ''}`);
  if (!shown.length) lines.push('(Nothing picked.)');
  lines.push('', "📲 Copy this whole message, open Milk's Gift List and tap “Paste”.", `MGF:${await encodeShare(r)}`);
  return lines.join('\n');
}

/**
 * Copies text that's still being built. iPhone Safari only allows copying during the tap itself, so the
 * clipboard write starts right away with a promise for the text (ClipboardItem accepts one).
 */
export async function copyText(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'function' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })) })]);
      return true;
    }
    await navigator.clipboard.writeText(await text);
    return true;
  } catch {
    return false;
  }
}
