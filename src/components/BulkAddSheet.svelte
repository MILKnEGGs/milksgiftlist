<script lang="ts">
  import { money, newItem } from '../lib/data';
  import { parsePasted, storeName, type PastedGift } from '../lib/links';
  import { toast, touch } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { list, onclose }: { list: GiftList; onclose: () => void } = $props();

  let text = $state('');
  let rows = $state<(PastedGift & { on: boolean })[]>([]);
  let help = $state(false);

  $effect(() => {
    rows = parsePasted(text).map((g) => ({ ...g, on: true }));
  });

  async function pasteNow() {
    try {
      const t = await navigator.clipboard.readText();
      text = text.trim() ? text + '\n' + t : t;
    } catch {
      toast('Press and hold in the box and tap Paste');
    }
  }

  const picked = $derived(rows.filter((r) => r.on));

  function add() {
    for (const r of picked) {
      list.items.push(newItem({ name: r.name.trim() || `${r.link ? storeName(r.link) : 'Gift'} idea`, links: r.link ? [r.link] : [], price: r.price }));
    }
    touch(list);
    toast(`Added ${picked.length} gift idea${picked.length === 1 ? '' : 's'} 🎁`);
    onclose();
  }
</script>

<Sheet {onclose} label="Paste links or a list" full>
  <div class="stack">
    <h2>Paste links or a list</h2>
    <p class="muted small" style="margin:0">
      One gift per line. Paste store links, names, or both. Links copied from the Amazon, Walmart or Target apps work.
      <button class="linkish" onclick={() => (help = !help)}>{help ? 'Hide tips' : 'How do I copy a link?'}</button>
    </p>
    {#if help}
      <div class="tips small">
        <p><strong>One item:</strong> in the store's app, open the item, tap <strong>Share</strong>, then <strong>Copy</strong> (or Copy Link). Paste it here. Repeat for each one; they stack up.</p>
        <p><strong>A whole Amazon wish list:</strong> open the list in Safari or Chrome (not the app), press and hold on the page, <strong>Select All</strong>, <strong>Copy</strong>, then paste here. You'll get the names and prices (not links); untick anything that isn't a gift.</p>
        <p class="muted">The app can't read store websites directly; they block it. So it works from what you copy.</p>
      </div>
    {/if}
    {#if typeof navigator.clipboard?.readText === 'function'}
      <button class="btn" onclick={pasteNow}>📋 Paste what I copied</button>
    {/if}
    <textarea class="input" rows="5" bind:value={text} placeholder={'LEGO treehouse https://a.co/d/…\nhttps://www.target.com/p/…\nBluey pajamas, size 5'}></textarea>

    {#if rows.length}
      <h3>{picked.length} of {rows.length} to add</h3>
      <ul class="rows">
        {#each rows as r, i (i)}
          <li class="row-item" class:off={!r.on}>
            <label class="tap">
              <input type="checkbox" bind:checked={r.on} />
              <span class="txt">
                <input class="name-in" bind:value={r.name} placeholder={r.link ? `${storeName(r.link)} item: type a name` : 'Name'} />
                <span class="meta">{[r.price !== undefined && money(r.price), r.link && storeName(r.link)].filter(Boolean).join(' · ')}</span>
              </span>
            </label>
          </li>
        {/each}
      </ul>
      <p class="muted small" style="margin:0">Fix any names now or later. You can add prices, notes and ⭐ afterwards.</p>
      <button class="btn primary block" disabled={!picked.length} onclick={add}>Add {picked.length} gift idea{picked.length === 1 ? '' : 's'}</button>
    {/if}
  </div>
</Sheet>

<style>
  .linkish {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
  }
  .tips {
    padding: 4px 14px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .tips p {
    margin: 10px 0;
  }
  .row-item.off {
    opacity: 0.5;
  }
  .tap input[type='checkbox'] {
    width: 22px;
    height: 22px;
    accent-color: var(--accent);
    flex: none;
  }
  .name-in {
    width: 100%;
    padding: 4px 0;
    border: 0;
    border-bottom: 1.5px dashed var(--border);
    background: none;
    font-weight: 700;
    font-size: 17px;
  }
  .name-in:focus {
    outline: none;
    border-bottom-color: var(--accent);
  }
</style>
