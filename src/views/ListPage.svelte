<script lang="ts">
  import BulkAddSheet from '../components/BulkAddSheet.svelte';
  import CopySheet from '../components/CopySheet.svelte';
  import Icon from '../components/Icon.svelte';
  import IdeaJarSheet from '../components/IdeaJarSheet.svelte';
  import ItemSheet from '../components/ItemSheet.svelte';
  import ListSheet from '../components/ListSheet.svelte';
  import SendPicksSheet from '../components/SendPicksSheet.svelte';
  import ShareSheet from '../components/ShareSheet.svelte';
  import Sheet from '../components/Sheet.svelte';
  import ThanksSheet from '../components/ThanksSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import {
    activeClaims,
    daysUntil,
    isAdded,
    itemState,
    listName,
    money,
    myTotal,
    parsePrice,
    personFor,
    sizesFor,
    sizesText,
    sortedItems,
    unsentClaims,
    visibleItems,
    whenText,
    type ItemState,
  } from '../lib/data';
  import { storeName } from '../lib/links';
  import { app, go, isStandalone, listById, save, toast } from '../lib/store.svelte';
  import type { Item } from '../lib/types';

  let { id }: { id: string } = $props();

  const list = $derived(listById(id));
  const me = $derived(app.d.settings.deviceId);
  const mine = $derived(list?.kind === 'mine');
  const hidden = $derived(!!list && list.kind === 'mine' && list.surprise);

  let filter = $state<'all' | 'open' | 'taken'>('all');
  let openItem = $state<Item | 'new'>();
  let sheet = $state<'menu' | 'edit' | 'share' | 'send' | 'bulk' | 'copy' | 'thanks' | 'jar'>();

  const items = $derived(list ? sortedItems({ ...list, items: visibleItems(list) }) : []);
  const stateOf = (it: Item): ItemState => (hidden ? 'open' : itemState(list!, it));
  const counts = $derived({
    all: items.length,
    open: items.filter((it) => stateOf(it) === 'open' || stateOf(it) === 'many').length,
    taken: items.filter((it) => stateOf(it) !== 'open').length,
  });
  const shown = $derived(
    items.filter((it) => {
      const s = stateOf(it);
      return filter === 'all' || (filter === 'open' ? s === 'open' || s === 'many' : s !== 'open');
    }),
  );
  const unsent = $derived(list ? unsentClaims(list, me).length : 0);
  const myCount = $derived(list ? list.items.filter((it) => activeClaims(list, it.id).some((c) => c.byId === me)).length : 0);

  const person = $derived(list && mine ? personFor(app.d, list) : undefined);
  const sizes = $derived(list ? sizesFor(app.d, list) : []);
  const spent = $derived(list ? myTotal(list, me) : 0);
  /** The big day has come (or gone): time to mark what came in. */
  const afterDay = $derived(!!list?.date && daysUntil(list.date) <= 0);
  const gotIds = $derived(new Set(list?.got.map((g) => g.itemId) ?? []));
  const toThank = $derived(list ? list.got.filter((g) => !g.thanked).length : 0);

  function who(it: Item): string {
    const cs = activeClaims(list!, it.id);
    const names = cs.map((c) => (c.byId === me ? 'You' : c.by || 'Someone'));
    const bought = cs.length > 0 && cs.every((c) => c.status === 'bought');
    return (bought ? '✓ Bought: ' : '') + names.join(' & ');
  }

  function stores(it: Item): string {
    return [...new Set(it.links.map(storeName))].join(', ');
  }

  function archive() {
    list!.archived = !list!.archived;
    save();
    sheet = undefined;
    toast(list!.archived ? 'List put away. Find it at the bottom of your lists.' : 'List is back');
    if (list!.archived) go('');
  }

  function setBudget() {
    sheet = undefined;
    const cur = list!.budget !== undefined ? String(list!.budget / 100) : '';
    const t = prompt(
      `How much do you want to spend on ${list!.forWho.trim() || 'this list'}? Your picks are added up against it. Leave it blank for no budget.`,
      cur,
    );
    if (t === null) return;
    list!.budget = t.trim() ? parsePrice(t) : undefined;
    save();
  }

  function remove() {
    const msg =
      list!.kind === 'shared'
        ? `Remove “${listName(list!)}” from this phone? Your picks on it are removed too (tell ${list!.ownerName || 'the owner'}!).`
        : `Delete “${listName(list!)}” and its ${list!.items.length} gift ideas? This can't be undone.`;
    if (!confirm(msg)) return;
    app.d.lists = app.d.lists.filter((l) => l.id !== id);
    save();
    go('');
    toast('List deleted');
  }
</script>

{#if !list}
  <TopBar title="Not found" showBack />
  <main class="page empty">
    <span class="big-emoji">🫥</span>
    <p class="muted">This list isn't on this phone anymore.</p>
    <a class="btn" href="#/">Go to my lists</a>
  </main>
{:else}
  <TopBar title={list.title} sub={[list.forWho && `for ${list.forWho}`, list.date && whenText(list.date)].filter(Boolean).join(' · ')} showBack>
    <button class="icon-btn" aria-label="Share" onclick={() => (sheet = 'share')}><Icon name="share" /></button>
    <button class="icon-btn" aria-label="More" onclick={() => (sheet = 'menu')}><Icon name="more" /></button>
  </TopBar>

  <main class="page stack">
    {#if list.kind === 'shared'}
      <div class="banner">
        <span>🎁 {list.ownerName || 'Someone'} shared this list. Tap a gift to see where to buy it and mark that you're getting it.</span>
      </div>
      {#if !isStandalone}
        <p class="muted small" style="margin:-4px 4px 0">
          It's saved in this browser, so you can come back to it here. <a href="#/install">Add the app to your Home Screen</a> for one place to keep all your lists.
        </p>
      {/if}
    {/if}
    {#if hidden && list.items.length}
      <div class="banner">🤫 Picks are hidden on this list, so your gifts stay a surprise.</div>
    {/if}

    {#if mine && afterDay && list.items.length}
      <button class="banner tapbanner" onclick={() => (sheet = 'thanks')}>
        {#if !list.got.length}
          🎉 How did it go? Tap to mark what came in, so you know who to thank.
        {:else if toThank}
          💌 {toThank} thank-you{toThank === 1 ? '' : 's'} to go. Tap to see who.
        {:else}
          💌 All thanked! Tap to see what came in.
        {/if}
      </button>
    {/if}

    {#if sizes.length || person || list.budget !== undefined || spent}
      <div class="facts">
        {#if sizes.length}
          {#if person}
            <a class="fact" href={'#/p/' + person.id}>📏 {sizesText(sizes)}</a>
          {:else}
            <span class="fact">📏 {sizesText(sizes)}</span>
          {/if}
        {:else if person}
          <a class="fact muted" href={'#/p/' + person.id}>📏 Add {person.name}'s sizes</a>
        {/if}
        {#if list.budget !== undefined || spent}
          <button class="fact" class:over={list.budget !== undefined && spent > list.budget} onclick={setBudget}>
            💰 {#if list.budget !== undefined}
              {money(spent)} of {money(list.budget)}{spent > list.budget ? ` · ${money(spent - list.budget)} over` : ` · ${money(list.budget - spent)} left`}
            {:else}
              Your picks: {money(spent)} · set a budget
            {/if}
          </button>
        {/if}
      </div>
    {/if}

    {#if person?.ideas.length}
      <button class="banner tapbanner" onclick={() => (sheet = 'jar')}>
        💡 {person.ideas.length} idea{person.ideas.length === 1 ? '' : 's'} in {person.name}'s idea jar. Tap to add {person.ideas.length === 1 ? 'it' : 'them'} to this list.
      </button>
    {/if}

    {#if list.items.length && !hidden}
      <div class="seg">
        <button class:on={filter === 'all'} onclick={() => (filter = 'all')}>All {counts.all}</button>
        <button class:on={filter === 'open'} onclick={() => (filter = 'open')}>Still needed {counts.open}</button>
        <button class:on={filter === 'taken'} onclick={() => (filter = 'taken')}>Taken {counts.taken}</button>
      </div>
    {/if}

    {#if !items.length}
      <div class="empty">
        <span class="big-emoji">📝</span>
        {#if mine}
          <h2>Add some gift ideas</h2>
          <p class="muted">Type them in, or paste links from Amazon, Walmart, Target or anywhere else.</p>
          <div class="stack" style="max-width:320px;margin:0 auto">
            <button class="btn primary" onclick={() => (openItem = 'new')}>+ Add a gift</button>
            <button class="btn" onclick={() => (sheet = 'bulk')}><Icon name="link" /> Paste links or a list</button>
          </div>
        {:else}
          <p class="muted">Nothing on this list yet.</p>
        {/if}
      </div>
    {:else if !shown.length}
      <p class="muted hint">{filter === 'open' ? 'Everything is taken! 🎉' : 'Nothing taken yet.'}</p>
    {:else}
      <ul class="rows">
        {#each shown as it (it.id)}
          {@const s = stateOf(it)}
          <li class="row-item" class:done={s === 'taken'} class:double={s === 'double'}>
            <button class="tap" onclick={() => (openItem = it)}>
              <span class="star" class:on={it.star} aria-label={it.star ? 'Most wanted' : undefined}>{#if it.star}<Icon name="star" size={20} fill />{/if}</span>
              <span class="txt">
                <span class="nm">{it.name}</span>
                {#if mine && gotIds.has(it.id)}<span class="gotit">🎁 Came in</span>{/if}
                <span class="meta">
                  {[
                    it.price !== undefined && money(it.price),
                    stores(it),
                    it.note.trim(),
                    it.many && 'more than one is OK',
                    isAdded(it) && (it.addedById === me ? 'you added it' : `added by ${it.addedBy || 'family'}`),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {#if s !== 'open'}
                  <span class="who" class:warn={s === 'double'}>{s === 'double' ? '⚠️ Doubled up: ' : ''}{who(it)}</span>
                {/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if list.kind === 'shared'}
      <button class="btn ghost block" onclick={() => (openItem = 'new')}>+ Getting something that isn't on the list?</button>
    {/if}
  </main>

  {#if mine && list.items.length}
    <button class="fab" onclick={() => (openItem = 'new')}>+ Add gift</button>
  {:else if list.kind === 'shared' && (unsent || myCount)}
    <div class="actionbar">
      <div class="actionbar-inner">
        <button class="btn block" class:primary={unsent} onclick={() => (sheet = 'send')}>
          <Icon name="send" />
          {unsent ? `Send my picks to ${list.ownerName || 'the owner'}` : `Picks sent ✓ Send again`}
        </button>
      </div>
    </div>
  {/if}

  {#if openItem}
    <ItemSheet {list} item={openItem === 'new' ? undefined : openItem} onclose={() => (openItem = undefined)} onbulk={() => ((openItem = undefined), (sheet = 'bulk'))} />
  {/if}
  {#if sheet === 'menu'}
    <Sheet onclose={() => (sheet = undefined)} label="List options">
      <div class="menu">
        {#if mine}
          <button onclick={() => (sheet = 'edit')}><span class="ico">✏️</span>Edit name, person & date</button>
          <button onclick={() => (sheet = 'bulk')}><span class="ico">🔗</span>Paste links or a list</button>
        {/if}
        <button onclick={() => (sheet = 'share')}><span class="ico">📤</span>{mine ? 'Share this list' : 'Pass this list on to someone'}</button>
        {#if list.kind === 'shared'}
          <button onclick={() => (sheet = 'send')}><span class="ico">📨</span>Send my picks to {list.ownerName || 'the owner'}</button>
        {/if}
        <button onclick={setBudget}><span class="ico">💰</span>{list.budget !== undefined ? 'Change my budget' : 'Set my budget'}</button>
        {#if mine}
          <button onclick={() => (sheet = 'thanks')}><span class="ico">🎉</span>What came in & thank-yous</button>
          {#if person}
            <button onclick={() => go('p/' + person.id)}><span class="ico">📏</span>{person.name}'s sizes & idea jar</button>
          {/if}
        {/if}
        <button onclick={() => (sheet = 'copy')}><span class="ico">📄</span>Start a new list from this one</button>
        <button onclick={archive}><span class="ico">📦</span>{list.archived ? 'Bring the list back' : 'Put away (after the big day)'}</button>
        <button class="danger" onclick={remove}><span class="ico">🗑️</span>{mine ? 'Delete list' : 'Remove from this phone'}</button>
      </div>
    </Sheet>
  {:else if sheet === 'edit'}
    <ListSheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'share'}
    <ShareSheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'send'}
    <SendPicksSheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'bulk'}
    <BulkAddSheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'copy'}
    <CopySheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'thanks'}
    <ThanksSheet {list} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'jar' && person}
    <IdeaJarSheet {list} {person} onclose={() => (sheet = undefined)} />
  {/if}
{/if}

<style>
  .star {
    flex: none;
    width: 22px;
    display: grid;
    place-items: center;
    color: var(--gold);
  }
  .who {
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--done-text);
  }
  .who.warn {
    color: var(--pop);
  }
  .row-item.double {
    background: color-mix(in srgb, var(--pop) 10%, var(--surface));
  }
  .done .who {
    color: var(--done-text);
  }
  .tapbanner {
    width: 100%;
    text-align: left;
    font: inherit;
    cursor: pointer;
    border: 0;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .fact {
    padding: 6px 12px;
    border-radius: 999px;
    border: 0;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }
  .fact.muted {
    color: var(--muted);
  }
  .fact.over {
    color: var(--pop);
  }
  .gotit {
    font-size: 0.8rem;
    font-weight: 800;
    color: var(--done-text);
    white-space: nowrap;
  }
</style>
