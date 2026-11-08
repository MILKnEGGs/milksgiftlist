<script lang="ts">
  import { sizesFor } from '../lib/data';
  import { copyText, listMessage, type ShareMode } from '../lib/share';
  import { app, save, toast } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { list, onclose }: { list: GiftList; onclose: () => void } = $props();

  const mine = $derived(list.kind === 'mine');
  let mode = $state<ShareMode>('names');
  // svelte-ignore state_referenced_locally
  let name = $state(app.d.settings.name);
  let preview = $state('');
  let fallback = $state('');

  const MODES: { id: ShareMode; label: string; help: string }[] = [
    { id: 'names', label: "Who's getting what", help: 'Family sees what is taken and by whom.' },
    { id: 'taken', label: "Just what's taken", help: 'Family sees what is taken, but not by whom.' },
    { id: 'none', label: 'No picks', help: "For the person it's for: nothing about who's getting what." },
  ];

  const me = $derived({ name: name.trim(), deviceId: app.d.settings.deviceId });
  const sizes = $derived($state.snapshot(sizesFor(app.d, list)));
  $effect(() => {
    listMessage(list, mode, me, sizes).then((t) => (preview = t));
  });

  function keepName() {
    if (mine && name.trim() && name.trim() !== app.d.settings.name) {
      app.d.settings.name = name.trim();
      save();
    }
  }

  async function copy() {
    keepName();
    const text = listMessage(list, mode, me, sizes);
    if (await copyText(text)) {
      toast('📋 Copied! Paste it into a text or email.', undefined, 6000);
      onclose();
    } else fallback = await text;
  }

  async function shareIt() {
    keepName();
    try {
      await navigator.share({ text: await listMessage(list, mode, me, sizes) });
      onclose();
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') copy();
    }
  }
</script>

<Sheet {onclose} label="Share list">
  <div class="stack">
    <h2>{mine ? 'Share this list' : 'Pass this list on'}</h2>
    <p class="muted small" style="margin:0">
      You'll get a message with the list and a link. Anyone who taps the link sees the gifts and store links and can mark what they're getting —
      no app or account needed. Their picks come back to you as a message you paste in.
    </p>
    {#if mine}
      <label class="field">
        <span>Your name <span class="muted">(shown as who it's from)</span></span>
        <input class="input" bind:value={name} placeholder="Mom" />
      </label>
    {/if}
    <div class="field">
      <span>Include</span>
      <div class="seg">
        {#each MODES as m (m.id)}
          <button class:on={mode === m.id} onclick={() => (mode = m.id)}>{m.label}</button>
        {/each}
      </div>
      <span class="muted small" style="font-weight:400">{MODES.find((m) => m.id === mode)!.help}</span>
    </div>
    {#if mine && list.surprise && mode !== 'none'}
      <p class="muted small" style="margin:0">🤫 Your picks stay hidden from you either way. This only changes what the people you send it to see.</p>
    {/if}
    {#if fallback}
      <p class="small" style="margin:0"><strong>Your phone didn't allow copying.</strong> Press and hold below, Select All, then Copy.</p>
      <textarea class="input" rows="8" readonly value={fallback}></textarea>
    {:else}
      <pre class="preview">{preview}</pre>
    {/if}
    <div class="row">
      <button class="btn primary" style="flex:1" onclick={copy}>📋 Copy message</button>
      {#if typeof navigator.share === 'function'}
        <button class="btn" style="flex:1" onclick={shareIt}>📤 Share…</button>
      {/if}
    </div>
  </div>
</Sheet>

<style>
  .preview {
    margin: 0;
    max-height: 180px;
    overflow: auto;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--surface-2);
    font: 400 0.82rem/1.4 var(--font);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
