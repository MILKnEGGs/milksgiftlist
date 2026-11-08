<script lang="ts">
  // After the big day: tick off what came in and who it was from, then work through the thank-you notes.
  import { fromNames, listName, newGot, sortedItems } from '../lib/data';
  import { copyText } from '../lib/share';
  import { app, save, toast } from '../lib/store.svelte';
  import type { GiftList, Item } from '../lib/types';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  let { list, onclose }: { list: GiftList; onclose: () => void } = $props();

  const me = $derived(app.d.settings.deviceId);
  const gotIds = $derived(new Set(list.got.map((g) => g.itemId)));
  const notYet = $derived(sortedItems(list).filter((it) => !gotIds.has(it.id)));
  const toThank = $derived(list.got.filter((g) => !g.thanked).length);
  let extraName = $state('');
  let extraFrom = $state('');
  let fallback = $state('');

  function cameIn(it: Item) {
    list.got.push(newGot({ itemId: it.id, name: it.name, from: fromNames(list, it.id, me, app.d.settings.name) }));
    save();
  }

  function addExtra(e: SubmitEvent) {
    e.preventDefault();
    if (!extraName.trim()) return;
    list.got.push(newGot({ name: extraName.trim(), from: extraFrom.trim() }));
    extraName = '';
    extraFrom = '';
    save();
  }

  function message(): string {
    const byFrom = new Map<string, string[]>();
    for (const g of list.got) {
      const k = g.from.trim() || 'Not sure who';
      byFrom.set(k, [...(byFrom.get(k) ?? []), (g.thanked ? '✓ ' : '') + g.name]);
    }
    const lines = [`💌 Thank-yous for ${listName(list)}`, ''];
    for (const [from, gifts] of byFrom) lines.push(`${list.got.some((g) => (g.from.trim() || 'Not sure who') === from && !g.thanked) ? '☐' : '☑'} ${from}: ${gifts.join(', ')}`);
    return lines.join('\n');
  }

  async function copy() {
    const t = message();
    if (await copyText(Promise.resolve(t))) toast('📋 Copied the thank-you list');
    else fallback = t;
  }
</script>

<Sheet {onclose} label="What came in" full>
  <div class="stack">
    <h2>🎉 What came in</h2>
    <p class="muted small" style="margin:0">
      Tick off the gifts as they're opened. Who it's from is filled in from the picks, so you know who to thank.
    </p>

    {#if list.got.length}
      <div class="row">
        <strong>{toThank ? `💌 ${toThank} thank-you${toThank === 1 ? '' : 's'} to go` : '💌 All thanked! 🎉'}</strong>
        <span class="spacer"></span>
        <button class="btn small" onclick={copy}><Icon name="copy" size={18} /> Copy list</button>
      </div>
      {#if fallback}<textarea class="input" rows="5" readonly value={fallback}></textarea>{/if}
      <ul class="rows">
        {#each list.got as g (g.id)}
          <li class="got" class:done={g.thanked}>
            <div class="gtop">
              <span class="nm">{g.name}</span>
              <button class="btn small ghost" aria-label="Didn't come in" onclick={() => ((list.got = list.got.filter((x) => x.id !== g.id)), save())}>
                <Icon name="x" size={18} />
              </button>
            </div>
            <div class="row nowrap">
              <input class="input" bind:value={g.from} oninput={save} placeholder="From who?" aria-label={'Who ' + g.name + ' was from'} />
              <label class="thanked">
                <input type="checkbox" bind:checked={g.thanked} onchange={save} />
                Thanked
              </label>
            </div>
          </li>
        {/each}
      </ul>
    {/if}

    {#if notYet.length}
      <h3 class="sec">Still on the list</h3>
      <ul class="rows">
        {#each notYet as it (it.id)}
          {@const from = fromNames(list, it.id, me, app.d.settings.name)}
          <li class="row-item">
            <button class="tap" onclick={() => cameIn(it)}>
              <span class="check"></span>
              <span class="txt">
                <span class="nm">{it.name}</span>
                {#if from && !list.surprise}<span class="meta">from {from}</span>{/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <form class="card-in stack" style="gap:8px" onsubmit={addExtra}>
      <strong>Something that wasn't on the list?</strong>
      <input class="input" bind:value={extraName} placeholder="Cozy sweater" />
      <input class="input" bind:value={extraFrom} placeholder="From who? e.g. Aunt Sue" />
      <button class="btn" disabled={!extraName.trim()}>+ Add it</button>
    </form>
  </div>
</Sheet>

<style>
  .sec {
    margin: 8px 4px -2px;
    font-size: 0.9rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .got {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    background: var(--surface);
    list-style: none;
  }
  .got.done {
    opacity: 0.65;
  }
  .gtop {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .gtop .nm {
    flex: 1;
    font-weight: 800;
  }
  .nowrap {
    flex-wrap: nowrap;
  }
  .thanked {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: none;
    font-weight: 700;
  }
  .thanked input {
    width: 22px;
    height: 22px;
    accent-color: var(--done-check);
  }
</style>
