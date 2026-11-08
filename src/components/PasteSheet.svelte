<script lang="ts">
  import { takeIn } from '../lib/inbox';
  import { go } from '../lib/store.svelte';
  import Sheet from './Sheet.svelte';

  let { onclose }: { onclose: () => void } = $props();

  let text = $state('');
  let error = $state('');
  let busy = $state(false);

  async function use(t: string) {
    error = '';
    busy = true;
    try {
      const r = await takeIn(t);
      onclose();
      go('l/' + r.list.id);
    } catch (err) {
      error = (err as Error).message;
    } finally {
      busy = false;
    }
  }

  async function fromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      text = t;
      if (t.trim()) await use(t);
    } catch {
      error = 'Your phone didn’t allow reading the clipboard. Press and hold in the box below and tap Paste.';
    }
  }
</script>

<Sheet {onclose} label="Paste a shared list">
  <div class="stack">
    <h2>Paste a list or picks</h2>
    <p class="muted small" style="margin:0">
      Got a gift list, or someone's picks, in a text message? Press and hold the message, tap <strong>Copy</strong>, then come back here.
    </p>
    {#if typeof navigator.clipboard?.readText === 'function'}
      <button class="btn primary block" disabled={busy} onclick={fromClipboard}>📋 Paste what I copied</button>
    {/if}
    <textarea class="input" rows="4" bind:value={text} placeholder="…or paste the whole message here"></textarea>
    {#if error}<p class="err">{error}</p>{/if}
    <button class="btn block" disabled={busy || !text.trim()} onclick={() => use(text)}>Use this</button>
  </div>
</Sheet>
