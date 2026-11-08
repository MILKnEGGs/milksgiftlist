<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { installGuideHtml } from '../lib/install';
  import { isStandalone } from '../lib/store.svelte';

  const siteUrl = location.host + location.pathname.replace(/index\.html$/, '');
</script>

<TopBar title="Install the app" showBack />

<main class="page stack">
  {@html installGuideHtml({ siteUrl, isStandalone })}
</main>
