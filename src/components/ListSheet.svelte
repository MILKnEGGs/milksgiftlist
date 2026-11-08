<script lang="ts">
  import { newList, nextBirthday, todayStr } from '../lib/data';
  import { app, go, save, touch } from '../lib/store.svelte';
  import type { GiftList } from '../lib/types';
  import Sheet from './Sheet.svelte';

  /** No list: make a new one. */
  let { list, onclose, forWho: forWhoStart = '' }: { list?: GiftList; onclose: () => void; forWho?: string } = $props();

  // svelte-ignore state_referenced_locally
  let title = $state(list?.title ?? '');
  // svelte-ignore state_referenced_locally
  let forWho = $state(list?.forWho ?? forWhoStart);
  // svelte-ignore state_referenced_locally
  let date = $state(list?.date ?? '');
  // svelte-ignore state_referenced_locally
  let surprise = $state(list?.surprise ?? false);

  const today = todayStr();
  const year = +today.slice(0, 4);
  /** The next time a yearly date comes around (this year, or next if it's passed). */
  const next = (mmdd: string) => (`${year}-${mmdd}` >= today ? `${year}-${mmdd}` : `${year + 1}-${mmdd}`);
  const IDEAS = [
    { label: '🎄 Christmas', title: () => `Christmas ${next('12-25').slice(0, 4)}`, date: () => next('12-25') },
    { label: '🎂 Birthday', title: () => (bday() ? `Birthday ${bday()!.slice(0, 4)}` : 'Birthday'), date: () => bday() ?? '' },
    { label: '🕎 Hanukkah', title: () => `Hanukkah ${next('12-14').slice(0, 4)}`, date: () => '' },
    { label: '🐣 Easter', title: () => 'Easter', date: () => '' },
    { label: '💝 Valentine’s', title: () => `Valentine’s ${next('02-14').slice(0, 4)}`, date: () => next('02-14') },
    { label: '💡 Ideas', title: () => 'Gift ideas', date: () => '' },
  ];

  /** The next birthday of the person this list is for, if the People tab knows it. */
  const bday = () => {
    const p = app.d.people.find((x) => x.name.trim().toLowerCase() === forWho.trim().toLowerCase());
    return p?.birthday ? nextBirthday(p.birthday) : undefined;
  };

  function pick(i: (typeof IDEAS)[number]) {
    title = i.title();
    const d = i.date();
    if (d && !date) date = d;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (list) {
      Object.assign(list, { title: t, forWho: forWho.trim(), date: date || undefined, surprise });
      touch(list);
      onclose();
    } else {
      const l = newList(t, forWho.trim(), date || undefined);
      l.surprise = surprise;
      app.d.lists.push(l);
      save();
      onclose();
      go('l/' + l.id);
    }
  }
</script>

<Sheet {onclose} label={list ? 'Edit list' : 'New list'}>
  <form class="stack" onsubmit={submit}>
    <h2>{list ? 'Edit list' : 'New gift list'}</h2>
    {#if !list}
      <div class="chips">
        {#each IDEAS as i (i.label)}
          <button type="button" class="chip" onclick={() => pick(i)}>{i.label}</button>
        {/each}
      </div>
    {/if}
    <label class="field">
      <span>Name</span>
      <input class="input" bind:value={title} placeholder="Christmas 2026" required />
    </label>
    <label class="field">
      <span>Who it's for <span class="muted">(optional)</span></span>
      <input class="input" bind:value={forWho} placeholder="Emma" autocomplete="off" list="people-names" />
      <datalist id="people-names">
        {#each app.d.people as p (p.id)}<option value={p.name}></option>{/each}
      </datalist>
    </label>
    <label class="field">
      <span>Date <span class="muted">(optional)</span></span>
      <input class="input" type="date" bind:value={date} />
    </label>
    {#if list?.kind !== 'shared'}
      <label class="toggle">
        <input type="checkbox" bind:checked={surprise} />
        <span>
          <strong>🤫 It's my own wish list</strong>
          <span class="muted small">Hide who's getting what from me, so my gifts stay a surprise.</span>
        </span>
      </label>
    {/if}
    <button class="btn primary block" disabled={!title.trim()}>{list ? 'Save' : 'Make the list'}</button>
  </form>
</Sheet>
