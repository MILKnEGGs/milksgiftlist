import { describe, expect, it } from 'vitest';
import {
  bumpYear,
  daysUntil,
  itemState,
  leftovers,
  mergeClaims,
  money,
  newData,
  newGot,
  newItem,
  newList,
  nextBirthday,
  parsePrice,
  plusYear,
  setClaim,
  sortedLists,
  turning,
} from './data';
import { cleanLink, guessName, parsePasted, storeName } from './links';
import { receive } from './receive';
import { decodeShare, encodeShare, listShare, payloadFrom, replyShare } from './share';
import type { GiftList } from './types';

function sample(): GiftList {
  const l = newList('Christmas 2026', 'Emma', '2026-12-25');
  l.items.push(newItem({ name: 'LEGO Castle', links: ['https://www.amazon.com/dp/B0TEST1234'], price: 4999, star: true }));
  l.items.push(newItem({ name: 'Books', many: true }));
  return l;
}

describe('picks', () => {
  it('flags doubling up, but not on more-than-one-is-OK items', () => {
    const l = sample();
    const [lego, books] = l.items;
    expect(itemState(l, lego)).toBe('open');
    setClaim(l, lego.id, 'a', 'Grandma', 'getting');
    expect(itemState(l, lego)).toBe('taken');
    setClaim(l, lego.id, 'b', 'Uncle Joe', 'getting');
    expect(itemState(l, lego)).toBe('double');
    setClaim(l, lego.id, 'b', 'Uncle Joe', 'gone');
    expect(itemState(l, lego)).toBe('taken');
    setClaim(l, books.id, 'a', 'Grandma', 'getting');
    setClaim(l, books.id, 'b', 'Uncle Joe', 'getting');
    expect(itemState(l, books)).toBe('many');
  });

  it('merges with newest-wins per person and keeps known names', () => {
    const l = sample();
    const id = l.items[0].id;
    setClaim(l, id, 'a', 'Grandma', 'getting', 100);
    expect(mergeClaims(l, [{ itemId: id, byId: 'a', by: 'Grandma', status: 'gone', at: 50 }])).toBe(0);
    expect(mergeClaims(l, [{ itemId: id, byId: 'a', by: '', status: 'bought', at: 200 }])).toBe(1);
    expect(l.claims[0]).toMatchObject({ status: 'bought', by: 'Grandma' });
    // Picks for unknown items and brand-new withdrawals are ignored.
    expect(mergeClaims(l, [{ itemId: 'nope', byId: 'c', by: 'X', status: 'getting', at: 1 }])).toBe(0);
    expect(mergeClaims(l, [{ itemId: id, byId: 'c', by: 'X', status: 'gone', at: 1 }])).toBe(0);
  });
});

describe('sharing round trip', () => {
  it('owner shares, family picks and replies, owner sees it', async () => {
    const mom = newData();
    mom.settings.name = 'Mom';
    const list = sample();
    mom.lists.push(list);

    const grandma = newData();
    grandma.settings.name = 'Grandma';
    const code = await encodeShare(listShare(list, 'names', mom.settings));
    const got = receive(grandma, await decodeShare(code));
    expect(got.kind).toBe('added');
    const copy = grandma.lists[0];
    expect(copy).toMatchObject({ kind: 'shared', ownerName: 'Mom', title: 'Christmas 2026' });
    expect(copy.items[0]).toMatchObject({ name: 'LEGO Castle', price: 4999, star: true });

    setClaim(copy, copy.items[0].id, grandma.settings.deviceId, 'Grandma', 'getting');
    const reply = await decodeShare((await encodeShare(replyShare(copy, grandma.settings))).toString());
    const res = receive(mom, reply);
    expect(res).toMatchObject({ kind: 'picks', changed: 1, from: 'Grandma' });
    expect(itemState(list, list.items[0])).toBe('taken');

    // Mom changes the list and re-shares; Grandma's pick survives, removed items go away.
    list.items.splice(1, 1);
    list.items.push(newItem({ name: 'Art set' }));
    list.updatedAt += 10;
    receive(grandma, await decodeShare(await encodeShare(listShare(list, 'taken', mom.settings))));
    expect(copy.items.map((i) => i.name)).toEqual(['LEGO Castle', 'Art set']);
    expect(copy.claims).toHaveLength(1);
    expect(copy.claims[0].by).toBe('Grandma');
  });

  it("won't let a reply change someone else's picks", () => {
    const mom = newData();
    const list = sample();
    mom.lists.push(list);
    setClaim(list, list.items[0].id, 'aunt', 'Aunt Sue', 'getting', 100);
    receive(mom, { t: 'reply', listId: list.id, title: '', byName: 'Joe', byId: 'joe', picks: [[list.items[0].id, 'getting', 200]], added: [] });
    expect(list.claims.map((c) => c.by).sort()).toEqual(['Aunt Sue', 'Joe']);
  });

  it("replaces a typed-in pick when that person's real pick arrives", () => {
    const mom = newData();
    const list = sample();
    mom.lists.push(list);
    setClaim(list, list.items[0].id, 'm:x', 'Grandma', 'getting', 100);
    receive(mom, { t: 'reply', listId: list.id, title: '', byName: 'grandma', byId: 'g', picks: [[list.items[0].id, 'bought', 200]], added: [] });
    expect(list.claims).toEqual([expect.objectContaining({ byId: 'g', status: 'bought' })]);
  });

  it('finds the code in a pasted message or link', () => {
    expect(payloadFrom('blah\nMGF:zAbCdEfGhIj')).toBe('zAbCdEfGhIj');
    expect(payloadFrom('https://x.github.io/milksgiftlist/#/s/zAbCdEfGhIjK more')).toBe('zAbCdEfGhIjK');
    expect(payloadFrom('nothing here')).toBeUndefined();
  });

  it('hides everything in surprise-safe shares', async () => {
    const list = sample();
    setClaim(list, list.items[0].id, 'a', 'Grandma', 'getting');
    const s = listShare(list, 'none', { name: 'Mom', deviceId: 'm' });
    expect(s.claims).toEqual([]);
    expect(listShare(list, 'taken', { name: 'Mom', deviceId: 'm' }).claims[0].by).toBe('');
  });
});

describe('family adding gifts', () => {
  it('a gift Grandma adds reaches the owner, travels on, and can be taken off', async () => {
    const mom = newData();
    mom.settings.name = 'Mom';
    mom.people.push({ id: 'p', name: 'Emma', sizes: [{ label: 'Shirt', value: '6' }], ideas: [], createdAt: 0 });
    const list = sample();
    mom.lists.push(list);
    const grandma = newData();
    grandma.settings.name = 'Grandma';
    receive(grandma, await decodeShare(await encodeShare(listShare(list, 'names', mom.settings, mom.people[0].sizes))));
    const copy = grandma.lists[0];
    expect(copy.sizes).toEqual([{ label: 'Shirt', value: '6' }]);

    // Grandma adds a coat she's getting.
    const coat = newItem({ name: 'Winter coat', addedBy: 'Grandma', addedById: grandma.settings.deviceId });
    copy.items.push(coat);
    setClaim(copy, coat.id, grandma.settings.deviceId, 'Grandma', 'getting');
    const before = list.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    const r = receive(mom, await decodeShare(await encodeShare(replyShare(copy, grandma.settings))));
    expect(r).toMatchObject({ kind: 'picks', added: 1 });
    const got = list.items.find((i) => i.id === coat.id)!;
    expect(got).toMatchObject({ name: 'Winter coat', addedBy: 'Grandma', addedById: grandma.settings.deviceId });
    expect(itemState(list, got)).toBe('taken');
    expect(list.updatedAt).toBeGreaterThan(before);

    // Re-sharing to the person the list is for leaves it out; with names hidden, so is who added it.
    expect(listShare(list, 'none', mom.settings).list.items.map((i) => i.name)).not.toContain('Winter coat');
    expect(listShare(list, 'taken', mom.settings).list.items.find((i) => i.id === coat.id)?.addedBy).toBe('');

    // Until Mom's list includes it, Grandma's copy keeps it. Once Mom takes it off, it goes.
    const old = { ...list, updatedAt: list.updatedAt + 1, items: list.items.filter((i) => i.id !== coat.id) };
    receive(grandma, await decodeShare(await encodeShare(listShare(old, 'names', mom.settings))));
    expect(copy.items.some((i) => i.id === coat.id)).toBe(true);
    list.items = list.items.filter((i) => i.id !== coat.id);
    list.dropped.push(coat.id);
    list.updatedAt += 2;
    receive(grandma, await decodeShare(await encodeShare(listShare(list, 'names', mom.settings))));
    expect(copy.items.some((i) => i.id === coat.id)).toBe(false);
    // And an old reply can't bring it back.
    receive(mom, { t: 'reply', listId: list.id, title: '', byName: 'Grandma', byId: grandma.settings.deviceId, picks: [], added: [coat] });
    expect(list.items.some((i) => i.id === coat.id)).toBe(false);
  });

  it("a reply can't change gifts someone else added", () => {
    const mom = newData();
    const list = sample();
    list.items[0].addedById = 'aunt';
    list.items[0].addedBy = 'Aunt Sue';
    mom.lists.push(list);
    receive(mom, { t: 'reply', listId: list.id, title: '', byName: 'Joe', byId: 'joe', picks: [], added: [{ ...list.items[0], name: 'Hacked' }] });
    expect(list.items[0].name).toBe('LEGO Castle');
  });
});

describe('next year and thank-yous', () => {
  it('keeps the ideas nobody got', () => {
    const l = sample();
    l.items.push(newItem({ name: 'Puzzle' }), newItem({ name: 'Socks' }));
    setClaim(l, l.items[0].id, 'a', 'Grandma', 'bought');
    l.got.push(newGot({ itemId: l.items[3].id, name: 'Socks' }));
    // Books is more-than-one-is-OK, so it stays an idea even when someone got one.
    setClaim(l, l.items[1].id, 'a', 'Grandma', 'getting');
    expect(leftovers(l).map((i) => i.name)).toEqual(['Books', 'Puzzle']);
  });

  it('moves dates and titles on a year', () => {
    expect(bumpYear('Christmas 2026')).toBe('Christmas 2027');
    expect(bumpYear('Birthday')).toBe('Birthday');
    expect(plusYear('2026-12-25')).toBe('2027-12-25');
    expect(plusYear('2028-02-29')).toBe('2029-02-28');
    expect(nextBirthday('2019-03-03', '2026-11-08')).toBe('2027-03-03');
    expect(nextBirthday('2019-11-08', '2026-11-08')).toBe('2026-11-08');
    expect(turning('2019-03-03', '2027-03-03')).toBe(8);
  });
});

describe('links', () => {
  it('names stores', () => {
    expect(storeName('https://www.amazon.com/dp/B0TEST1234')).toBe('Amazon');
    expect(storeName('https://a.co/d/abc123')).toBe('Amazon');
    expect(storeName('walmart.com/ip/123')).toBe('Walmart');
    expect(storeName('https://www.fatbraintoys.com/toy/x')).toBe('Fatbraintoys');
    expect(storeName('https://shop.example.co.uk/thing')).toBe('Example');
  });

  it('cleans tracking out of links', () => {
    expect(cleanLink('https://www.amazon.com/LEGO-Classic-Bricks/dp/B00NHQFA1I/ref=sr_1_3?crid=X&keywords=lego&qid=1&sr=8-3')).toBe(
      'https://www.amazon.com/dp/B00NHQFA1I',
    );
    expect(cleanLink('https://www.walmart.com/ip/Barbie-Dreamhouse/123456789?athbdg=L1600&from=/search')).toBe('https://www.walmart.com/ip/123456789');
    expect(cleanLink('https://www.target.com/p/play-doh-kitchen/-/A-87654321?preselect=1#lnk=sametab')).toBe('https://www.target.com/p/-/A-87654321');
    expect(cleanLink('https://shop.com/item/42?utm_source=x&color=blue')).toBe('https://shop.com/item/42?color=blue');
  });

  it('guesses names from links', () => {
    expect(guessName('https://www.amazon.com/LEGO-Classic-Bricks/dp/B00NHQFA1I/ref=x')).toBe('LEGO Classic Bricks');
    expect(guessName('https://www.walmart.com/ip/Barbie-Dreamhouse-Playset/123456789')).toBe('Barbie Dreamhouse Playset');
    expect(guessName('https://www.target.com/p/play-doh-kitchen-creations/-/A-87654321')).toBe('Play Doh Kitchen Creations');
    expect(guessName('https://www.amazon.com/dp/B00NHQFA1I')).toBe('');
    expect(guessName('https://a.co/d/7xYzAbC')).toBe('');
  });

  it('turns pasted text into gift ideas', () => {
    const got = parsePasted(`Check out this deal on Amazon: Melissa & Doug Wooden Train https://a.co/d/abc123
Bluey Plush
https://www.amazon.com/Bluey-Plush/dp/B0TEST1234

https://www.walmart.com/ip/Barbie-Dreamhouse/123456789
- Socks (size 6)`);
    expect(got).toEqual([
      { name: 'Melissa & Doug Wooden Train', link: 'https://a.co/d/abc123' },
      { name: 'Bluey Plush', link: 'https://www.amazon.com/dp/B0TEST1234' },
      { name: 'Barbie Dreamhouse', link: 'https://www.walmart.com/ip/123456789' },
      { name: 'Socks (size 6)' },
    ]);
  });

  it('pulls names and prices out of a copied wish-list page', () => {
    const got = parsePasted(`LEGO Classic Large Creative Brick Box
by LEGO
4.8 out of 5 stars
12,345
$44.99
Add to Cart
Item added October 2, 2026
Crayola Inspiration Art Case
$24.97
Add to Cart`);
    expect(got).toEqual([
      { name: 'LEGO Classic Large Creative Brick Box', price: 4499 },
      { name: 'Crayola Inspiration Art Case', price: 2497 },
    ]);
  });
});

describe('money and dates', () => {
  it('parses and shows prices', () => {
    expect(parsePrice('$24.99')).toBe(2499);
    expect(parsePrice('25')).toBe(2500);
    expect(parsePrice('1,200.5')).toBe(120050);
    expect(parsePrice('abc')).toBeUndefined();
    expect(money(2500)).toBe('$25');
    expect(money(2499)).toBe('$24.99');
    expect(money(120050)).toBe('$1,200.50');
  });

  it('counts days and sorts lists soonest first', () => {
    expect(daysUntil('2026-12-25', '2026-11-08')).toBe(47);
    const a = newList('Past', '', '2026-01-01');
    const b = newList('Xmas', '', '2026-12-25');
    const c = newList('Bday', '', '2026-11-20');
    const d = newList('Undated');
    expect(sortedLists([a, b, c, d], '2026-11-08').map((l) => l.title)).toEqual(['Bday', 'Xmas', 'Undated', 'Past']);
  });
});
