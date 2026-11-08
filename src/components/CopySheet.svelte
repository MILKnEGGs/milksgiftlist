<script lang="ts">
  // Start a new list from this one: usually next year's, with the ideas nobody got.
  import { bumpYear, leftovers, newList, plusYear, todayStr, uid } from '../lib/data';
  import { app, go, save, toast } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { list, onclose }: { list: GiftList; onclose: () => void } = $props();

  const left = $derived(leftovers(list));
  // svelte-ignore state_referenced_locally
  const past = !!list.date && list.date < todayStr();
  // svelte-ignore state_referenced_locally
  let title = $state(past || /\b20\d\d\b/.test(list.title) ? bumpYear(list.title) : `${list.title} (copy)`);
  // svelte-ignore state_referenced_locally
  let date = $state(list.date ? (past ? plusYear(list.date) : list.date) : '');
  // svelte-ignore state_referenced_locally
  let which = $state<'left' | 'all'>(leftovers(list).length ? 'left' : 'all');

  function make(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const l = newList(title.trim(), list.forWho, date || undefined);
    l.surprise = list.kind === 'mine' && list.surprise;
    const from = which === 'left' ? left : list.items;
    // Fresh ids and no "added by": it's a new list of ideas.
    l.items = from.map((it) => {
      const { addedBy: _a, addedById: _b, ...rest } = $state.snapshot(it);
      return { ...rest, id: uid(8) };
    });
    app.d.lists.push(l);
    save();
    onclose();
    go('l/' + l.id);
    toast(`Copied ${l.items.length} idea${l.items.length === 1 ? '' : 's'} ✓`);
  }
</script>

<Sheet {onclose} label="Start a new list from this one">
  <form class="stack" onsubmit={make}>
    <h2>Start a new list from this one</h2>
    <p class="muted small" style="margin:0">The gift ideas are copied. Picks and thank-yous stay with this list.</p>
    <div class="stack" style="gap:8px">
      <label class="toggle">
        <input type="radio" bind:group={which} value="left" disabled={!left.length} />
        <span>
          <strong>Just the leftovers ({left.length})</strong>
          <span class="muted small">Ideas nobody got this time.</span>
        </span>
      </label>
      <label class="toggle">
        <input type="radio" bind:group={which} value="all" />
        <span><strong>Everything ({list.items.length})</strong></span>
      </label>
    </div>
    <label class="field">
      <span>Name</span>
      <input class="input" bind:value={title} required />
    </label>
    <label class="field">
      <span>Date <span class="muted">(optional)</span></span>
      <input class="input" type="date" bind:value={date} />
    </label>
    <button class="btn primary block" disabled={!title.trim()}>Make the list</button>
  </form>
</Sheet>
