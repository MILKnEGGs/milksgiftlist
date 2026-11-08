<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import ListSheet from '../components/ListSheet.svelte';
  import PasteSheet from '../components/PasteSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { activeClaims, itemState, sortedLists, unsentClaims, visibleItems, whenText } from '../lib/data';
  import { app } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';

  let making = $state(false);
  let pasting = $state(false);
  let showArchived = $state(false);

  const me = $derived(app.d.settings.deviceId);
  const live = $derived(sortedLists(app.d.lists.filter((l) => !l.archived)));
  const mine = $derived(live.filter((l) => l.kind === 'mine'));
  const shared = $derived(live.filter((l) => l.kind === 'shared'));
  const archived = $derived(sortedLists(app.d.lists.filter((l) => l.archived)));

  function summary(l: GiftList): string {
    const n = visibleItems(l).length;
    if (!n) return 'No gift ideas yet';
    const ideas = `${n} idea${n === 1 ? '' : 's'}`;
    if (l.kind === 'mine' && l.surprise) return `${ideas} · picks hidden 🤫`;
    const taken = l.items.filter((it) => itemState(l, it) !== 'open').length;
    if (l.kind === 'shared') {
      const getting = l.items.filter((it) => activeClaims(l, it.id).some((c) => c.byId === me)).length;
      return `${ideas} · ${getting ? `you're getting ${getting}` : `${n - taken} still open`}`;
    }
    return `${ideas} · ${taken} taken`;
  }

  const progress = (l: GiftList) => (l.items.length ? l.items.filter((it) => itemState(l, it) !== 'open').length / l.items.length : 0);
  const doubles = (l: GiftList) => (l.kind === 'mine' && l.surprise ? 0 : l.items.filter((it) => itemState(l, it) === 'double').length);
</script>

<TopBar title="Gift Lists">
  <button class="icon-btn" aria-label="Paste a shared list" onclick={() => (pasting = true)}><Icon name="paste" /></button>
</TopBar>

{#snippet card(l: GiftList)}
  <a class="list-card card" href={'#/l/' + l.id}>
    <span class="lc-top">
      <span class="lc-title">{l.title}</span>
      {#if l.forWho}<span class="for">for {l.forWho}</span>{/if}
    </span>
    <span class="meta">
      {#if l.date}📅 {whenText(l.date)}{" · "}{/if}{summary(l)}
      {#if l.kind === 'shared' && l.ownerName}{' · from '}{l.ownerName}{/if}
    </span>
    {#if doubles(l)}<span class="warn-pill">⚠️ {doubles(l)} doubled up</span>{/if}
    {#if l.kind === 'mine' && l.got.some((g) => !g.thanked)}<span class="warn-pill">💌 {l.got.filter((g) => !g.thanked).length} thank-you{l.got.filter((g) => !g.thanked).length === 1 ? '' : 's'} to go</span>{/if}
    {#if unsentClaims(l, me).length}<span class="warn-pill">📨 Picks not sent to {l.ownerName || 'the owner'} yet</span>{/if}
    {#if l.items.length && !(l.kind === 'mine' && l.surprise)}
      <span class="progress"><span style="width:{progress(l) * 100}%"></span></span>
    {/if}
  </a>
{/snippet}

<main class="page stack">
  {#if !app.d.lists.length}
    <div class="empty">
      <span class="big-emoji">🎁</span>
      <h2>No gift lists yet</h2>
      <p class="muted">Make a list for a birthday or holiday, add what they want, then share it so family can see who's getting what.</p>
      <div class="stack" style="max-width:320px;margin:0 auto">
        <button class="btn primary" onclick={() => (making = true)}>Make a list</button>
        <button class="btn" onclick={() => (pasting = true)}>Paste a list someone sent me</button>
      </div>
    </div>
  {:else}
    {#if mine.length}
      <h3 class="sec">My lists</h3>
      {#each mine as l (l.id)}{@render card(l)}{/each}
    {/if}
    {#if shared.length}
      <h3 class="sec">Shared with me</h3>
      {#each shared as l (l.id)}{@render card(l)}{/each}
    {/if}
    {#if archived.length}
      <button class="btn ghost small" onclick={() => (showArchived = !showArchived)}>
        {showArchived ? 'Hide' : 'Show'} {archived.length} put-away list{archived.length === 1 ? '' : 's'}
      </button>
      {#if showArchived}
        {#each archived as l (l.id)}<div class="faded">{@render card(l)}</div>{/each}
      {/if}
    {/if}
  {/if}
</main>

{#if app.d.lists.length}
  <button class="fab" onclick={() => (making = true)}>+ New list</button>
{/if}

{#if making}<ListSheet onclose={() => (making = false)} />{/if}
{#if pasting}<PasteSheet onclose={() => (pasting = false)} />{/if}

<style>
  .sec {
    margin: 8px 4px -2px;
    font-size: 0.9rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .list-card {
    display: grid;
    gap: 6px;
    text-decoration: none;
    color: inherit;
  }
  .list-card:active {
    transform: scale(0.99);
  }
  .lc-top {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }
  .lc-title {
    font-size: 1.2rem;
    font-weight: 800;
  }
  .for {
    font-weight: 700;
    color: var(--accent);
  }
  .progress {
    display: block;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--done-check);
    transition: width 0.3s;
  }
  .faded {
    opacity: 0.7;
  }
</style>
