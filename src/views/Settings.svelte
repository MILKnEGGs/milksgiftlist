<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { backupJson, newData, parseBackup } from '../lib/data';
  import { fileStamp, shareFile } from '../lib/files';
  import { app, isStandalone, replaceData, save, toast } from '../lib/store.svelte';
  import type { ThemeMode } from '../lib/types';

  let { offlineReady }: { offlineReady: boolean } = $props();

  let fileInput: HTMLInputElement;

  function setTheme(t: ThemeMode) {
    app.d.settings.theme = t;
    save();
  }

  async function exportBackup() {
    const file = new File([backupJson($state.snapshot(app.d))], `giftlist-backup-${fileStamp()}.json`, { type: 'application/json' });
    await shareFile(file, "Milk's Gift List backup");
  }

  async function importBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      const msg = `Replace everything on this device with this backup?\n\n${d.lists.length} lists.\n\nWhat's here now will be replaced.`;
      if (!confirm(msg)) return;
      await replaceData(d);
      toast('Backup restored ✓');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function eraseAll() {
    const typed = prompt("Erase ALL lists on this device? This can't be undone.\n\nType ERASE to confirm.");
    if (typed?.trim().toUpperCase() !== 'ERASE') return;
    const fresh = newData();
    // Keep who this phone is, so picks already sent from it still match up.
    fresh.settings = { ...$state.snapshot(app.d.settings) };
    await replaceData(fresh);
    toast('Everything erased. Fresh start! 🌱');
  }
</script>

<TopBar title="Settings" />

<main class="page stack" style="gap:16px">
  <section class="card stack">
    <h3>🙋 Your name</h3>
    <label class="field">
      <span class="muted small" style="font-weight:400">Shown to family on your lists and on the gifts you're getting.</span>
      <input class="input" bind:value={app.d.settings.name} oninput={save} placeholder="Mom" />
    </label>
  </section>

  <section class="card stack">
    <h3>🔁 How sharing works</h3>
    <ol class="plain small">
      <li>Open a list and tap <strong>Share</strong>. Text the message to family.</li>
      <li>They tap the link (no app or account needed), see where to buy each gift, and tap <strong>I'll get this</strong>.</li>
      <li>They tap <strong>Send my picks</strong> and text you the message it makes.</li>
      <li>Copy that whole message and tap <strong>📋 Paste</strong> on the Lists screen. The list updates.</li>
      <li>Share the list again now and then so everyone sees what's already taken.</li>
    </ol>
    <p class="muted small" style="margin:0">
      Nothing goes through a server. Lists travel inside the messages you send, and the part of the link after the # is never sent to the
      website.
    </p>
  </section>

  <section class="card stack">
    <h3>🎨 Look</h3>
    <div class="seg">
      <button class:on={app.d.settings.theme === 'auto'} onclick={() => setTheme('auto')}>Match device</button>
      <button class:on={app.d.settings.theme === 'light'} onclick={() => setTheme('light')}>☀️ Light</button>
      <button class:on={app.d.settings.theme === 'dark'} onclick={() => setTheme('dark')}>🌙 Dark</button>
    </div>
  </section>

  <section class="card stack">
    <h3>💾 Backup & move to another device</h3>
    <p class="muted small" style="margin:0">
      Everything is saved only on this device. Export a backup to keep a copy or move to a new phone, then <em>Import</em> it there. Importing
      <strong>replaces</strong> what's on that device.
    </p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>⬆️ Export backup</button>
      <button class="btn" onclick={() => fileInput.click()}>⬇️ Import backup</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importBackup} />
    </div>
  </section>

  <section class="card stack">
    <h3>📲 Install on your phone</h3>
    <p class="muted small" style="margin:0">
      {#if isStandalone}
        ✓ You're using the installed app{offlineReady ? ' and it works offline' : ''}.
      {:else}
        Add the app to your Home Screen so it opens like an app and works with no signal.
      {/if}
    </p>
    <a class="btn" href="#/install">How to install</a>
  </section>

  <section class="card stack">
    <h3>Danger zone</h3>
    <button class="btn danger" onclick={eraseAll}>Erase everything on this device</button>
  </section>

  <p class="muted small" style="text-align:center">Milk's Gift List v{__APP_VERSION__} · made with ❤️</p>
</main>
