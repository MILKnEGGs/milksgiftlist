// Pure data helpers: creating lists and items, picks ("claims") and merging picks from other phones.

import type { Claim, ClaimStatus, Data, GiftList, Got, Item, Person } from './types';

export const uid = (n = 10): string => {
  const a = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => a[b % a.length]).join('');
};

export function newData(): Data {
  return { version: 1, lists: [], people: [], settings: { theme: 'auto', name: '', deviceId: uid(12) } };
}

/** Fills in anything missing from older saves or hand-edited backups. */
export function normalize(raw: unknown): Data {
  const d = raw as Partial<Data>;
  const base = newData();
  return {
    version: 1,
    settings: { ...base.settings, ...(d?.settings ?? {}) },
    lists: (Array.isArray(d?.lists) ? d.lists : []).map(normalizeList),
    people: (Array.isArray(d?.people) ? d.people : []).map(normalizePerson),
  };
}

function normalizePerson(p: Partial<Person>): Person {
  return {
    id: p.id || uid(),
    name: p.name ?? '',
    birthday: p.birthday || undefined,
    sizes: (p.sizes ?? []).filter((z) => z && (z.label || z.value)),
    ideas: (p.ideas ?? []).map((i) => ({ id: i.id || uid(8), name: i.name ?? '', link: i.link || undefined, note: i.note ?? '', at: i.at ?? Date.now() })),
    createdAt: p.createdAt ?? Date.now(),
  };
}

function normalizeList(l: Partial<GiftList>): GiftList {
  const now = Date.now();
  return {
    id: l.id || uid(),
    title: l.title ?? 'Gift list',
    forWho: l.forWho ?? '',
    date: l.date || undefined,
    kind: l.kind === 'shared' ? 'shared' : 'mine',
    ownerName: l.ownerName,
    ownerId: l.ownerId,
    surprise: !!l.surprise,
    archived: !!l.archived,
    createdAt: l.createdAt ?? now,
    updatedAt: l.updatedAt ?? now,
    sentAt: l.sentAt,
    items: (l.items ?? []).map((it) => ({
      id: it.id || uid(8),
      name: it.name ?? '',
      links: Array.isArray(it.links) ? it.links.filter(Boolean) : [],
      price: typeof it.price === 'number' ? it.price : undefined,
      note: it.note ?? '',
      star: !!it.star,
      many: !!it.many,
      addedAt: it.addedAt ?? now,
      ...(it.addedBy !== undefined || it.addedById ? { addedBy: it.addedBy ?? '' } : {}),
      ...(it.addedById ? { addedById: it.addedById } : {}),
    })),
    claims: (l.claims ?? []).filter((c) => c && c.itemId && c.byId),
    budget: typeof l.budget === 'number' ? l.budget : undefined,
    dropped: Array.isArray(l.dropped) ? l.dropped : [],
    got: (l.got ?? []).map((g) => ({ id: g.id || uid(8), itemId: g.itemId, name: g.name ?? '', from: g.from ?? '', thanked: !!g.thanked, at: g.at ?? now })),
    sizes: Array.isArray(l.sizes) ? l.sizes : undefined,
  };
}

export function newList(title: string, forWho = '', date?: string): GiftList {
  const now = Date.now();
  return { id: uid(), title, forWho, date, kind: 'mine', surprise: false, archived: false, createdAt: now, updatedAt: now, items: [], claims: [], dropped: [], got: [] };
}

export function newItem(fields: Partial<Item> & { name: string }): Item {
  return { id: uid(8), links: [], note: '', star: false, many: false, addedAt: Date.now(), ...fields };
}

export function newPerson(name: string): Person {
  return { id: uid(), name, sizes: [], ideas: [], createdAt: Date.now() };
}

export const listName = (l: GiftList): string => (l.forWho.trim() ? `${l.title} · ${l.forWho.trim()}` : l.title);

// ---------------------------------------------------------------------------------------------
// Picks

/** Picks that count: not withdrawn. */
export const activeClaims = (l: GiftList, itemId: string): Claim[] =>
  l.claims.filter((c) => c.itemId === itemId && c.status !== 'gone');

export type ItemState = 'open' | 'taken' | 'double' | 'many';

/**
 * open: nobody has it yet. taken: one person is getting it. double: two or more people picked something
 * only one person should get (the doubling up this app exists to stop). many: more-than-one-is-fine item
 * that somebody has picked.
 */
export function itemState(l: GiftList, it: Item): ItemState {
  const n = activeClaims(l, it.id).length;
  if (!n) return 'open';
  if (it.many) return 'many';
  return n > 1 ? 'double' : 'taken';
}

/** Sets (or withdraws, with 'gone') one person's pick on an item. */
export function setClaim(l: GiftList, itemId: string, byId: string, by: string, status: ClaimStatus, at = Date.now()): void {
  const c = l.claims.find((x) => x.itemId === itemId && x.byId === byId);
  if (c) Object.assign(c, { by: by || c.by, status, at: Math.max(at, c.at + 1) });
  else if (status !== 'gone') l.claims.push({ itemId, byId, by, status, at });
}

const key = (c: Claim) => `${c.itemId}|${c.byId}`;

/**
 * Merges picks from another phone. For each item+person the newer pick wins; a pick with no name
 * (the sender hid names) keeps the name we already know. Returns how many picks changed.
 */
export function mergeClaims(l: GiftList, incoming: Claim[], accept: (c: Claim) => boolean = () => true): number {
  const items = new Set(l.items.map((it) => it.id));
  const have = new Map(l.claims.map((c) => [key(c), c]));
  let changed = 0;
  for (const inc of incoming) {
    if (!items.has(inc.itemId) || !accept(inc)) continue;
    const ex = have.get(key(inc));
    if (!ex) {
      if (inc.status === 'gone') continue;
      const c = { ...inc };
      l.claims.push(c);
      have.set(key(c), c);
      changed++;
    } else if (inc.at > ex.at) {
      const moved = ex.status !== inc.status || (inc.by && inc.by !== ex.by);
      Object.assign(ex, { status: inc.status, at: inc.at, by: inc.by || ex.by });
      if (moved) changed++;
    } else if (inc.at === ex.at && !ex.by && inc.by) ex.by = inc.by;
  }
  return changed;
}

/** Drops picks for items that no longer exist. */
export function pruneClaims(l: GiftList): void {
  const items = new Set(l.items.map((it) => it.id));
  l.claims = l.claims.filter((c) => items.has(c.itemId));
}

/** My own picks on a list that haven't been sent back to its owner yet. */
export const unsentClaims = (l: GiftList, me: string): Claim[] =>
  l.kind === 'shared' ? l.claims.filter((c) => c.byId === me && c.at > (l.sentAt ?? 0)) : [];

// ---------------------------------------------------------------------------------------------
// Ordering

/** Most-wanted first, then the order they were added. */
export const sortedItems = (l: GiftList): Item[] =>
  [...l.items].sort((a, b) => Number(b.star) - Number(a.star) || a.addedAt - b.addedAt);

/** Lists by date (soonest upcoming first), then undated newest first; past dates sink. */
export function sortedLists(lists: GiftList[], today = todayStr()): GiftList[] {
  const rank = (l: GiftList) => (l.date ? (l.date >= today ? 0 : 2) : 1);
  return [...lists].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.date && b.date) return rank(a) === 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    return b.createdAt - a.createdAt;
  });
}

// ---------------------------------------------------------------------------------------------
// Money and dates

/** "$24.99", "24", "25.5" → cents. Undefined for blank or nonsense. */
export function parsePrice(s: string): number | undefined {
  const m = s.replace(/[,\s$]/g, '').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export const money = (cents: number): string =>
  '$' + (cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from today to a YYYY-MM-DD date (negative when past). */
export function daysUntil(date: string, today = todayStr()): number {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(date) - t(today)) / 86_400_000);
}

export function whenText(date: string, today = todayStr()): string {
  const n = daysUntil(date, today);
  const nice = new Date(date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (n === 0) return `${nice} · today! 🎉`;
  if (n === 1) return `${nice} · tomorrow`;
  if (n > 1) return `${nice} · in ${n} days`;
  return nice;
}

// ---------------------------------------------------------------------------------------------
// Backup

export const backupJson = (d: Data): string => JSON.stringify({ app: 'milksgiftlist', ...d }, null, 1);

export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Gift List backup.");
  }
  if ((raw as { app?: string })?.app !== 'milksgiftlist') throw new Error("That file isn't a Gift List backup.");
  return normalize(raw);
}

// ---------------------------------------------------------------------------------------------
// People, budgets, thank-yous and next year

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The person a list is for, matched by name. */
export const personFor = (d: Data, l: GiftList): Person | undefined =>
  l.forWho.trim() ? d.people.find((p) => same(p.name, l.forWho)) : undefined;

/** Sizes to show (and send along) with a list. */
export const sizesFor = (d: Data, l: GiftList) => (l.kind === 'shared' ? (l.sizes ?? []) : (personFor(d, l)?.sizes ?? [])).filter((z) => z.value.trim());

export const sizesText = (sizes: { label: string; value: string }[]): string =>
  sizes.map((z) => (z.label.trim() ? `${z.label.trim()} ${z.value.trim()}` : z.value.trim())).join(' · ');

/** On my own wish list, gifts family added are part of the surprise too. */
export const visibleItems = (l: GiftList): Item[] => (l.kind === 'mine' && l.surprise ? l.items.filter((it) => !isAdded(it)) : l.items);

/** Family added it (it keeps saying so after the owner edits it and takes it over). */
export const isAdded = (it: Item): boolean => it.addedBy !== undefined || !!it.addedById;

/** What my picks on a list add up to. */
export function myTotal(l: GiftList, me: string): number {
  const ids = new Set(l.claims.filter((c) => c.byId === me && c.status !== 'gone').map((c) => c.itemId));
  return l.items.reduce((s, it) => s + (ids.has(it.id) ? (it.price ?? 0) : 0), 0);
}

/** Who a gift is from, going by the picks on it ("Grandma & Uncle Joe"). */
export function fromNames(l: GiftList, itemId: string, me: string, myName: string): string {
  return activeClaims(l, itemId)
    .map((c) => (c.byId === me ? myName || 'Me' : c.by))
    .filter(Boolean)
    .join(' & ');
}

export function newGot(fields: Partial<Got> & { name: string }): Got {
  return { id: uid(8), from: '', thanked: false, at: Date.now(), ...fields };
}

/** Gifts on a list nobody got: not received, and nobody bought or is getting them. */
export const leftovers = (l: GiftList): Item[] => {
  const got = new Set(l.got.map((g) => g.itemId));
  return l.items.filter((it) => !got.has(it.id) && (it.many || !activeClaims(l, it.id).length));
};

/** "Christmas 2026" → "Christmas 2027". */
export const bumpYear = (title: string): string => title.replace(/\b(20\d\d)\b/, (y) => String(+y + 1));

/** The same day a year later, YYYY-MM-DD. */
export const plusYear = (date: string): string => {
  const y = +date.slice(0, 4) + 1;
  // Feb 29 → Feb 28 when next year isn't a leap year.
  return date.slice(5) === '02-29' && new Date(y, 1, 29).getMonth() !== 1 ? `${y}-02-28` : `${y}${date.slice(4)}`;
};

/** The next birthday on or after today, YYYY-MM-DD. */
export function nextBirthday(birthday: string, today = todayStr()): string {
  let y = +today.slice(0, 4);
  const at = (yy: number) => (birthday.slice(5) === '02-29' && new Date(yy, 1, 29).getMonth() !== 1 ? `${yy}-02-28` : `${yy}${birthday.slice(4)}`);
  if (at(y) < today) y++;
  return at(y);
}

/** How old they turn on a birthday date. */
export const turning = (birthday: string, on: string): number => +on.slice(0, 4) - +birthday.slice(0, 4);
