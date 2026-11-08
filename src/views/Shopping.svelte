<script lang="ts">
  // Everything I'm getting, across every list: a shopping checklist with a running total.
  import Icon from '../components/Icon.svelte';
  import SendPicksSheet from '../components/SendPicksSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { listName, money, myTotal, setClaim, sortedLists, unsentClaims } from '../lib/data';
  import { storeName } from '../lib/links';
  import { app, save } from '../lib/store.svelte';
  import type { Claim, GiftList, Item } from '../lib/types';

  const me = $derived(app.d.settings.deviceId);
  let sending = $state<GiftList>();

  const groups = $derived(
    sortedLists(app.d.lists.filter((l) => !l.archived))
      .map((l) => ({
        list: l,
        picks: l.claims
          .filter((c) => c.byId === me && c.status !== 'gone')
          .map((c) => ({ c, it: l.items.find((it) => it.id === c.itemId) }))
          .filter((p): p is { c: Claim; it: Item } => !!p.it),
        unsent: unsentClaims(l, me).length,
      }))
      .filter((g) => g.picks.length || g.unsent),
  );
  const all = $derived(groups.flatMap((g) => g.picks));
  const total = $derived(all.reduce((s, p) => s + (p.it.price ?? 0), 0));
  const left = $derived(all.filter((p) => p.c.status !== 'bought'));

  function toggle(l: GiftList, c: Claim) {
    setClaim(l, c.itemId, me, c.by, c.status === 'bought' ? 'getting' : 'bought');
    save();
  }
</script>

<TopBar title="My shopping" sub={all.length ? `${all.length} gift${all.length === 1 ? '' : 's'}${total ? ` · about ${money(total)}` : ''}` : undefined} />

<main class="page stack">
  {#if !groups.length}
    <div class="empty">
      <span class="big-emoji">🛍️</span>
      <h2>Nothing picked yet</h2>
      <p class="muted">When you tap “I'll get this” on a gift, it shows up here so you can check it off as you buy it.</p>
    </div>
  {:else}
    {#if left.length}
      <p class="muted small" style="margin:0 4px">{left.length} still to buy. Tap one when you've got it.</p>
    {:else}
      <div class="banner">🎉 You've bought everything you picked!</div>
    {/if}
    {#each groups as g (g.list.id)}
      <section class="group">
        <div class="ghead">
          <a class="gname" href={'#/l/' + g.list.id}>{listName(g.list)}</a>
          <span class="gcount">{g.picks.filter((p) => p.c.status === 'bought').length}/{g.picks.length}</span>
        </div>
        {#if g.list.budget !== undefined}
          {@const spent = myTotal(g.list, me)}
          <p class="budget small" class:over={spent > g.list.budget}>
            💰 {money(spent)} of {money(g.list.budget)} budget · {spent > g.list.budget ? money(spent - g.list.budget) + ' over' : money(g.list.budget - spent) + ' left'}
          </p>
        {/if}
        {#if g.unsent}
          <button class="btn block primary send" onclick={() => (sending = g.list)}>
            <Icon name="send" /> Send my picks to {g.list.ownerName || 'the owner'}
          </button>
        {/if}
        {#if g.picks.length}
          <ul class="rows">
            {#each g.picks as p (p.c.itemId)}
              <li class="row-item" class:done={p.c.status === 'bought'}>
                <button class="tap" onclick={() => toggle(g.list, p.c)}>
                  <span class="check">{#if p.c.status === 'bought'}<Icon name="check" size={16} stroke={3} />{/if}</span>
                  <span class="txt">
                    <span class="nm">{p.it.name}</span>
                    <span class="meta">{[p.it.price !== undefined && money(p.it.price), p.it.note.trim()].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
                {#if p.it.links[0]}
                  <a class="edit store" href={p.it.links[0]} target="_blank" rel="noopener noreferrer" aria-label={'Open at ' + storeName(p.it.links[0])}>🛒</a>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/each}
  {/if}
</main>

{#if sending}<SendPicksSheet list={sending} onclose={() => (sending = undefined)} />{/if}

<style>
  .gname {
    color: inherit;
    text-decoration: none;
  }
  .budget {
    margin: 0 4px 8px;
    font-weight: 700;
    color: var(--muted);
  }
  .budget.over {
    color: var(--pop);
  }
  .send {
    margin-bottom: 8px;
  }
  .store {
    display: grid;
    place-items: center;
    text-decoration: none;
    font-size: 1.2rem;
  }
</style>
