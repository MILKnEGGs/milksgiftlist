<script lang="ts">
  // The people I shop for: sizes, birthdays and an idea jar for each.
  import TopBar from '../components/TopBar.svelte';
  import { newPerson, nextBirthday, sizesText, turning, whenText } from '../lib/data';
  import { app, go, save } from '../lib/store.svelte';

  const people = $derived([...app.d.people].sort((a, b) => a.name.localeCompare(b.name)));
  /** Names from my lists' "who it's for" that aren't people yet: one tap to add. */
  const suggest = $derived(
    [...new Set(app.d.lists.filter((l) => l.kind === 'mine' && l.forWho.trim()).map((l) => l.forWho.trim()))].filter(
      (n) => !app.d.people.some((p) => p.name.trim().toLowerCase() === n.toLowerCase()),
    ),
  );

  function add(name = '') {
    const n = name || prompt('Who do you shop for? (e.g. Emma)')?.trim();
    if (!n) return;
    const p = newPerson(n);
    app.d.people.push(p);
    save();
    go('p/' + p.id);
  }
</script>

<TopBar title="People" />

<main class="page stack">
  {#if !people.length}
    <div class="empty">
      <span class="big-emoji">🧒</span>
      <h2>Keep sizes and ideas handy</h2>
      <p class="muted">
        Add the people you shop for. Save their sizes once and they show on every list for them, even the ones you share. Drop ideas in their idea jar
        whenever you hear them want something.
      </p>
    </div>
  {/if}

  {#each people as p (p.id)}
    {@const bday = p.birthday ? nextBirthday(p.birthday) : undefined}
    <a class="card person" href={'#/p/' + p.id}>
      <span class="pname">{p.name}</span>
      {#if bday}<span class="meta">🎂 {whenText(bday)}{turning(p.birthday!, bday) > 0 ? ` · turns ${turning(p.birthday!, bday)}` : ''}</span>{/if}
      {#if p.sizes.some((z) => z.value.trim())}<span class="meta">📏 {sizesText(p.sizes.filter((z) => z.value.trim()))}</span>{/if}
      {#if p.ideas.length}<span class="meta">💡 {p.ideas.length} idea{p.ideas.length === 1 ? '' : 's'} in the jar</span>{/if}
    </a>
  {/each}

  {#if suggest.length}
    <p class="muted small" style="margin:8px 4px 0">From your lists:</p>
    <div class="chips">
      {#each suggest as n (n)}
        <button class="chip" onclick={() => add(n)}>+ {n}</button>
      {/each}
    </div>
  {/if}
</main>

<button class="fab" onclick={() => add()}>+ Add person</button>

<style>
  .person {
    display: grid;
    gap: 4px;
    text-decoration: none;
    color: inherit;
  }
  .pname {
    font-size: 1.2rem;
    font-weight: 800;
  }
</style>
