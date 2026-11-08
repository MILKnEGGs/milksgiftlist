<script lang="ts">
  import { copyText, replyMessage } from '../lib/share';
  import { app, save, toast } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { list, onclose }: { list: GiftList; onclose: () => void } = $props();

  const owner = $derived(list.ownerName || 'the person who shared it');
  // svelte-ignore state_referenced_locally
  let name = $state(app.d.settings.name);
  let fallback = $state('');

  function sent() {
    list.sentAt = Date.now();
    save();
  }

  function me() {
    if (name.trim() && name.trim() !== app.d.settings.name) {
      app.d.settings.name = name.trim();
      // Picks made before the name was set carry the old (empty) name; refresh them.
      for (const c of list.claims) if (c.byId === app.d.settings.deviceId) c.by = name.trim();
      save();
    }
    return { name: app.d.settings.name, deviceId: app.d.settings.deviceId };
  }

  async function copy() {
    const text = replyMessage(list, me());
    if (await copyText(text)) {
      sent();
      toast(`📋 Copied! Paste it into a text to ${owner}.`, undefined, 6000);
      onclose();
    } else {
      fallback = await text;
      sent();
    }
  }

  async function shareIt() {
    try {
      await navigator.share({ text: await replyMessage(list, me()) });
      sent();
      onclose();
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') copy();
    }
  }
</script>

<Sheet {onclose} label="Send my picks">
  <div class="stack">
    <h2>Send your picks to {owner}</h2>
    <p class="muted small" style="margin:0">
      This makes a short message saying what you're getting. Text or email it to {owner}; they paste it into the app and the list updates, so
      nobody else gets the same thing.
    </p>
    <label class="field">
      <span>Your name</span>
      <input class="input" bind:value={name} placeholder="Grandma" />
    </label>
    {#if fallback}
      <p class="small" style="margin:0"><strong>Your phone didn't allow copying.</strong> Press and hold below, Select All, then Copy.</p>
      <textarea class="input" rows="6" readonly value={fallback}></textarea>
    {/if}
    <div class="row">
      <button class="btn primary" style="flex:1" disabled={!name.trim()} onclick={copy}>📋 Copy message</button>
      {#if typeof navigator.share === 'function'}
        <button class="btn" style="flex:1" disabled={!name.trim()} onclick={shareIt}>📤 Share…</button>
      {/if}
    </div>
  </div>
</Sheet>
