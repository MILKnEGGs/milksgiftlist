<script lang="ts">
  import type { Snippet } from 'svelte';
  import { back } from '../lib/store.svelte';
  import Icon from './Icon.svelte';

  let {
    title,
    sub,
    showBack = false,
    ontitle,
    children,
  }: { title: string; sub?: string; showBack?: boolean; ontitle?: () => void; children?: Snippet } = $props();
</script>

<header class="topbar">
  <div class="topbar-inner">
    {#if showBack}
      <button class="icon-btn" aria-label="Back" onclick={() => back()}><Icon name="back" /></button>
    {/if}
    {#if ontitle}
      <button class="title-btn" onclick={ontitle}>
        <h1>{title}</h1>
        {#if sub}<span class="sub">{sub}</span>{/if}
      </button>
    {:else}
      <div class="title-btn">
        <h1>{title}</h1>
        {#if sub}<span class="sub">{sub}</span>{/if}
      </div>
    {/if}
    <span class="spacer"></span>
    {@render children?.()}
  </div>
</header>

<style>
  .title-btn {
    min-width: 0;
    flex: 0 1 auto;
    padding: 0;
    border: 0;
    background: none;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }
  div.title-btn {
    cursor: default;
  }
</style>
