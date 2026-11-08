<script lang="ts">
  // A tapped share link (#/s/<code>): save the list on this phone, then show it.
  import TopBar from '../components/TopBar.svelte';
  import { takeIn } from '../lib/inbox';
  import { go } from '../lib/store.svelte';

  let { payload }: { payload: string } = $props();
  let error = $state('');

  $effect(() => {
    takeIn(payload)
      .then((r) => go('l/' + r.list.id, true))
      .catch((err) => (error = (err as Error).message));
  });
</script>

<TopBar title="Opening a gift list…" />

<main class="page">
  {#if error}
    <div class="empty">
      <span class="big-emoji">🤔</span>
      <h2>That link didn't work</h2>
      <p class="muted">{error}</p>
      <a class="btn" href="#/">Go to my lists</a>
    </div>
  {:else}
    <p class="muted" style="text-align:center;margin-top:40px">🎁 Unwrapping…</p>
  {/if}
</main>
