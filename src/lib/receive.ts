// What happens when a shared list or someone's picks arrive on this phone.

import { mergeClaims, pruneClaims } from './data';
import type { Data, GiftList, Item } from './types';
import type { Share } from './share';

export type Received =
  | { kind: 'added'; list: GiftList }
  | { kind: 'updated'; list: GiftList; changed: number; removed: string[] }
  | { kind: 'picks'; list: GiftList; changed: number; from: string; added: number };

const fields = (it: Item) => ({ name: it.name, links: it.links, price: it.price, note: it.note, star: it.star, many: it.many });

/** Applies a share to the data. Throws with a friendly message when it can't be used. */
export function receive(d: Data, s: Share): Received {
  const me = d.settings.deviceId;
  if (s.t === 'reply') {
    if (s.byId === me) throw new Error('Those are your own picks. Send that message to the person who shared the list.');
    const list = d.lists.find((l) => l.id === s.listId);
    if (!list) throw new Error(`These picks are for “${s.title}”, which isn't on this phone.`);

    // Gifts they added to the list. They can only add or change their own, and ones the owner took off stay off.
    let added = 0;
    let itemsChanged = false;
    for (const inc of s.added) {
      if (list.dropped.includes(inc.id)) continue;
      const ex = list.items.find((it) => it.id === inc.id);
      if (!ex) {
        list.items.push({ ...structuredClone(inc), addedBy: s.byName || inc.addedBy, addedById: s.byId });
        added++;
        itemsChanged = true;
      } else if (ex.addedById === s.byId && JSON.stringify(fields(ex)) !== JSON.stringify(fields(inc))) {
        Object.assign(ex, structuredClone(fields(inc)), { addedBy: s.byName || ex.addedBy });
        itemsChanged = true;
      }
    }
    // New items change the list itself, so the next share carries them to everyone else.
    if (itemsChanged) list.updatedAt = Date.now();

    const claims = s.picks.map(([itemId, status, at]) => ({ itemId, status, at, by: s.byName, byId: s.byId }));
    // A reply only ever speaks for the person who sent it.
    const changed = mergeClaims(list, claims, (c) => c.byId === s.byId);
    // If the owner had typed this person in by hand ("Grandma is getting it"), their real pick replaces that.
    const name = s.byName.trim().toLowerCase();
    if (name) {
      const real = new Set(list.claims.filter((c) => c.byId === s.byId).map((c) => c.itemId));
      list.claims = list.claims.filter((c) => !(c.byId.startsWith('m:') && real.has(c.itemId) && c.by.trim().toLowerCase() === name));
    }
    if (list.archived) list.archived = false;
    return { kind: 'picks', list, changed: Math.max(changed, added), from: s.byName || 'Someone', added };
  }

  const inc = s.list;
  const have = d.lists.find((l) => l.id === inc.id);
  if (!have) {
    const mine = s.ownerId === me;
    const list: GiftList = {
      ...structuredClone(inc),
      kind: mine ? 'mine' : 'shared',
      ownerName: mine ? undefined : s.ownerName,
      ownerId: mine ? undefined : s.ownerId,
      surprise: false,
      archived: false,
      createdAt: Date.now(),
      claims: [],
      got: [],
      sizes: mine ? undefined : structuredClone(s.sizes),
    };
    mergeClaims(list, s.claims);
    d.lists.push(list);
    return { kind: 'added', list };
  }

  // A newer version of a list someone shared: take their items. My own list's items are only ever changed here.
  const removed: string[] = [];
  if (have.kind === 'shared' && inc.updatedAt > have.updatedAt) {
    const keep = new Set(inc.items.map((it) => it.id));
    const me2 = new Set(have.claims.filter((c) => c.byId === me && c.status !== 'gone').map((c) => c.itemId));
    // Gifts I added that the owner hasn't got yet stay on my copy; ones they took off go.
    const mineStill = have.items.filter((it) => it.addedById === me && !keep.has(it.id) && !inc.dropped.includes(it.id));
    for (const it of have.items) if (!keep.has(it.id) && me2.has(it.id) && !mineStill.includes(it)) removed.push(it.name);
    Object.assign(have, {
      title: inc.title,
      forWho: inc.forWho,
      date: inc.date,
      updatedAt: inc.updatedAt,
      items: [...structuredClone(inc.items), ...mineStill],
      dropped: [...inc.dropped],
      ownerName: s.ownerName || have.ownerName,
      sizes: structuredClone(s.sizes),
    });
    pruneClaims(have);
  }
  const changed = mergeClaims(have, s.claims);
  if (have.archived) have.archived = false;
  return { kind: 'updated', list: have, changed, removed };
}
