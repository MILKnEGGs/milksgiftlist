<script lang="ts">
  // One person: their birthday, sizes, idea jar, and the lists for them.
  import Icon from '../components/Icon.svelte';
  import ListSheet from '../components/ListSheet.svelte';
  import Sheet from '../components/Sheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { newItem, nextBirthday, sortedLists, turning, uid, whenText } from '../lib/data';
  import { cleanLink, guessName, storeName } from '../lib/links';
  import { app, go, personById, save, toast, touch } from '../lib/store.svelte';
  import type { Idea } from '../lib/types';

  let { id }: { id: string } = $props();

  const person = $derived(personById(id));
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const lists = $derived(person ? sortedLists(app.d.lists.filter((l) => l.kind === 'mine' && same(l.forWho, person.name))) : []);
  const open = $derived(lists.filter((l) => !l.archived));
  const bday = $derived(person?.birthday ? nextBirthday(person.birthday) : undefined);

  const SIZE_CHIPS = ['Shirt', 'Pants', 'Shoes', 'Dress', 'Coat', 'Pajamas', 'Socks', 'Hat', 'Ring'];
  let making = $state(false);
  let moving = $state<Idea>();

  // ---------- Name & birthday ----------
  function rename() {
    const n = prompt('Name', person!.name)?.trim();
    if (!n || n === person!.name) return;
    // Keep their lists pointing at them.
    for (const l of app.d.lists) if (l.kind === 'mine' && same(l.forWho, person!.name)) {
      l.forWho = n;
      touch(l);
    }
    person!.name = n;
    save();
  }

  function remove() {
    if (!confirm(`Remove ${person!.name}? Their sizes and ${person!.ideas.length} saved ideas go too. Their lists stay.`)) return;
    app.d.people = app.d.people.filter((p) => p.id !== id);
    save();
    go('people');
  }

  // ---------- Sizes ----------
  function addSize(label = '') {
    person!.sizes.push({ label, value: '' });
    save();
    // Focus the new size's value box.
    setTimeout(() => document.querySelectorAll<HTMLInputElement>('.size-value').item(person!.sizes.length - 1)?.focus());
  }

  // ---------- Idea jar ----------
  let ideaName = $state('');
  let ideaLink = $state('');
  let ideaNote = $state('');
  let more = $state(false);

  function addIdea(e: SubmitEvent) {
    e.preventDefault();
    let n = ideaName.trim();
    const link = ideaLink.trim() ? cleanLink(ideaLink.trim()) : undefined;
    if (!n && ideaLink.trim()) n = guessName(ideaLink.trim()) || storeName(ideaLink.trim()) + ' link';
    if (!n) return;
    person!.ideas.push({ id: uid(8), name: n, link, note: ideaNote.trim(), at: Date.now() });
    ideaName = '';
    ideaLink = '';
    ideaNote = '';
    save();
    toast(`💡 Saved for ${person!.name}`);
  }

  function moveTo(listId: string) {
    const l = app.d.lists.find((x) => x.id === listId)!;
    const i = moving!;
    l.items.push(newItem({ name: i.name, links: i.link ? [i.link] : [], note: i.note }));
    person!.ideas = person!.ideas.filter((x) => x.id !== i.id);
    touch(l);
    moving = undefined;
    toast(`Added to ${l.title} ✓`);
  }
</script>

{#if !person}
  <TopBar title="Not found" showBack />
  <main class="page empty"><p class="muted">This person isn't here anymore.</p></main>
{:else}
  <TopBar title={person.name} sub={bday ? `🎂 ${whenText(bday)}${turning(person.birthday!, bday) > 0 ? ` · turns ${turning(person.birthday!, bday)}` : ''}` : undefined} showBack>
    <button class="icon-btn" aria-label="Rename" onclick={rename}><Icon name="pencil" /></button>
  </TopBar>

  <main class="page stack">
    <section class="card stack">
      <h3>🎂 Birthday</h3>
      <input class="input" type="date" bind:value={person.birthday} onchange={save} aria-label="Birthday" />
    </section>

    <section class="card stack">
      <h3>📏 Sizes</h3>
      <p class="muted small" style="margin:0">Shown on every list for {person.name}, and sent along when you share one.</p>
      {#each person.sizes as z, i (i)}
        <div class="row nowrap">
          <input class="input lbl" bind:value={z.label} oninput={save} placeholder="Shirt" aria-label="What" />
          <input class="input size-value" bind:value={z.value} oninput={save} placeholder="Youth M (10-12)" aria-label="Size" />
          <button class="btn small ghost" aria-label="Remove size" onclick={() => (person.sizes.splice(i, 1), save())}><Icon name="x" size={18} /></button>
        </div>
      {/each}
      <div class="chips">
        {#each SIZE_CHIPS.filter((c) => !person.sizes.some((z) => same(z.label, c))) as c (c)}
          <button class="chip" onclick={() => addSize(c)}>+ {c}</button>
        {/each}
        <button class="chip" onclick={() => addSize()}>+ Other</button>
      </div>
    </section>

    <section class="card stack">
      <h3>💡 Idea jar</h3>
      <p class="muted small" style="margin:0">
        Heard {person.name} say they want something? Drop it in here. When a birthday or holiday comes up, pull ideas onto the list.
      </p>
      <form class="stack" style="gap:8px" onsubmit={addIdea}>
        <div class="row nowrap">
          <input class="input" bind:value={ideaName} placeholder="Dinosaur kite" aria-label="Idea" />
          <button class="btn primary" disabled={!ideaName.trim() && !ideaLink.trim()}>Save</button>
        </div>
        {#if more}
          <input class="input" type="url" inputmode="url" bind:value={ideaLink} placeholder="Link (optional)" aria-label="Link" />
          <input class="input" bind:value={ideaNote} placeholder="Notes (optional)" aria-label="Notes" />
        {:else}
          <button type="button" class="btn ghost small left" onclick={() => (more = true)}>+ Link or notes</button>
        {/if}
      </form>
      {#if person.ideas.length}
        <ul class="rows">
          {#each person.ideas as i (i.id)}
            <li class="row-item">
              <span class="tap static">
                <span class="txt">
                  <span class="nm">{i.name}</span>
                  {#if i.note || i.link}<span class="meta">{[i.note, i.link && storeName(i.link)].filter(Boolean).join(' · ')}</span>{/if}
                </span>
              </span>
              <button class="btn small" onclick={() => (moving = i)}>→ List</button>
              <button class="btn small ghost" aria-label="Remove idea" onclick={() => ((person.ideas = person.ideas.filter((x) => x.id !== i.id)), save())}>
                <Icon name="x" size={18} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="card stack">
      <h3>🎁 Lists for {person.name}</h3>
      {#each lists as l (l.id)}
        <a class="lrow" class:faded={l.archived} href={'#/l/' + l.id}>
          <strong>{l.title}</strong>
          <span class="muted small">{l.date ? whenText(l.date) : ''}{l.archived ? ' · put away' : ''}</span>
        </a>
      {/each}
      <button class="btn" onclick={() => (making = true)}>+ New list for {person.name}</button>
    </section>

    <button class="btn ghost danger small" onclick={remove}>Remove {person.name}</button>
  </main>

  {#if making}<ListSheet forWho={person.name} onclose={() => (making = false)} />{/if}
  {#if moving}
    <Sheet onclose={() => (moving = undefined)} label="Add to a list">
      <div class="stack">
        <h2>Add “{moving.name}” to…</h2>
        {#if open.length}
          <div class="menu">
            {#each open as l (l.id)}
              <button onclick={() => moveTo(l.id)}><span class="ico">🎁</span>{l.title}</button>
            {/each}
          </div>
        {:else}
          <p class="muted">There's no list for {person.name} yet.</p>
          <button class="btn primary" onclick={() => ((moving = undefined), (making = true))}>+ Make one</button>
        {/if}
      </div>
    </Sheet>
  {/if}
{/if}

<style>
  h3 {
    margin: 0;
  }
  .nowrap {
    flex-wrap: nowrap;
  }
  .lbl {
    flex: 0 0 38%;
    min-width: 0;
  }
  .left {
    justify-self: start;
  }
  .static {
    cursor: default;
  }
  .lrow {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    text-decoration: none;
    color: inherit;
    padding: 6px 2px;
  }
  .faded {
    opacity: 0.6;
  }
  .row-item .btn {
    flex: none;
    align-self: center;
  }
</style>
