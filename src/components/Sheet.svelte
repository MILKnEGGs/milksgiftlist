<script lang="ts">
  import type { Snippet } from 'svelte';

  // `full`: a typing sheet. It takes the whole visible screen, so it doesn't jump around as content
  // appears while you type.
  let { onclose, label, full = false, children }: { onclose: () => void; label: string; full?: boolean; children: Snippet } = $props();

  let backdrop = $state<HTMLDivElement>();

  // iPhone Safari slides the keyboard over the page without shrinking it, so a sheet pinned to the bottom
  // ends up underneath the keyboard. Keep the sheet's area matched to the part of the screen that's
  // actually visible (the visual viewport), which sits the sheet right on top of the keyboard.
  $effect(() => {
    const el = backdrop!;
    const vv = window.visualViewport;
    const fit = () => {
      const h = vv?.height ?? innerHeight;
      el.style.top = `${vv?.offsetTop ?? 0}px`;
      el.style.height = `${h}px`;
      el.style.setProperty('--vvh', `${h}px`);
      el.classList.toggle('kb', innerHeight - h > 120);
    };
    fit();
    vv?.addEventListener('resize', fit);
    vv?.addEventListener('scroll', fit);
    document.documentElement.classList.add('sheet-open');
    return () => {
      vv?.removeEventListener('resize', fit);
      vv?.removeEventListener('scroll', fit);
      document.documentElement.classList.remove('sheet-open');
    };
  });

  function key(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={key} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div bind:this={backdrop} class="sheet-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="sheet" class:full role="dialog" aria-modal="true" aria-label={label}>
    <div class="grip"></div>
    {@render children()}
  </div>
</div>
