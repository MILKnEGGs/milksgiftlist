<script lang="ts">
  import { activeClaims, fromNames, isAdded, money, newGot, newItem, parsePrice, pruneClaims, setClaim, uid } from '../lib/data';
  import { cleanLink, guessName, storeName } from '../lib/links';
  import { app, save, toast, touch } from '../lib/store.svelte';
  import type { ClaimStatus, GiftList, Item } from '../lib/types';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  /** No item: adding a new one. On a shared list that means "a gift I'm getting that isn't on the list". */
  let { list, item, onclose, onbulk }: { list: GiftList; item?: Item; onclose: () => void; onbulk?: () => void } = $props();

  const mine = $derived(list.kind === 'mine');
  const me = $derived(app.d.settings.deviceId);
  /** Family can edit gifts they added themselves; the owner can edit everything. */
  const canEdit = $derived(mine || (!!item && item.addedById === me));
  const owner = $derived(list.ownerName || 'the owner');
  // svelte-ignore state_referenced_locally
  let editing = $state(!item);

  // ---------- Editing ----------
  let name = $state('');
  let links = $state<string[]>(['']);
  let price = $state('');
  let note = $state('');
  let star = $state(false);
  let many = $state(false);
  // svelte-ignore state_referenced_locally
  let myName = $state(app.d.settings.name);

  function startEdit() {
    name = item?.name ?? '';
    links = item?.links.length ? [...item.links] : [''];
    price = item?.price !== undefined ? (item.price / 100).toFixed(item.price % 100 ? 2 : 0) : '';
    note = item?.note ?? '';
    star = item?.star ?? false;
    many = item?.many ?? false;
    editing = true;
  }
  // svelte-ignore state_referenced_locally
  if (!item) startEdit();

  /** Pasting a link into an empty name fills the name from the link when it can. */
  function linkChanged(i: number) {
    const l = links[i].trim();
    if (!l) return;
    if (!name.trim()) name = guessName(l);
  }

  /** Family adding a gift must say who they are, so the owner knows who it's from. */
  const needName = $derived(!mine && !item && !app.d.settings.name.trim());

  function submit(e: SubmitEvent, another = false) {
    e.preventDefault();
    const n = name.trim();
    if (!n || (needName && !myName.trim())) return;
    const fields = {
      name: n,
      links: links.map((l) => l.trim()).filter(Boolean).map(cleanLink),
      price: parsePrice(price),
      note: note.trim(),
      star,
      many,
    };
    if (item) {
      Object.assign(item, fields);
      editing = false;
      if (mine) {
        // Once the owner edits a gift family added, it's theirs: later replies won't undo the edit.
        if (item.addedById) {
          item.addedBy ??= '';
          delete item.addedById;
        }
        touch(list);
      } else {
        // Bump my pick so the change counts as not sent yet.
        const c = list.claims.find((x) => x.itemId === item.id && x.byId === me);
        setClaim(list, item.id, me, app.d.settings.name, c && c.status !== 'gone' ? c.status : 'getting');
        save();
      }
      return;
    }
    if (mine) {
      list.items.push(newItem(fields));
      toast(`Added “${n}”`);
      touch(list);
    } else {
      if (needName) app.d.settings.name = myName.trim();
      const by = app.d.settings.name;
      const it = newItem({ ...fields, star: false, many: false, addedBy: by, addedById: me });
      list.items.push(it);
      setClaim(list, it.id, me, by, 'getting');
      save();
      toast(`✓ Added. Send your picks to ${owner} so it shows on their list.`, undefined, 6000);
    }
    if (another && mine) {
      name = '';
      links = [''];
      price = '';
      note = '';
      star = false;
      many = false;
    } else onclose();
  }

  function remove() {
    if (!item) return;
    if (!mine) {
      // Already sent: it's on the owner's list now, so just stop getting it there.
      if (list.sentAt && item.addedAt <= list.sentAt) {
        if (!confirm(`You already sent “${item.name}” to ${owner}. Take your pick off it? (It stays on their list as an idea.)`)) return;
        claim('gone');
        onclose();
        return;
      }
      if (!confirm(`Remove “${item.name}”?`)) return;
    } else if (!confirm(`Remove “${item.name}” from the list?`)) return;
    if (mine && isAdded(item)) list.dropped.push(item.id);
    list.items = list.items.filter((it) => it.id !== item.id);
    list.got = list.got.filter((g) => g.itemId !== item.id);
    pruneClaims(list);
    if (mine) touch(list);
    else save();
    onclose();
    toast('Removed');
  }

  // ---------- Picks ----------
  const hidden = $derived(mine && list.surprise);
  const claims = $derived(item ? activeClaims(list, item.id) : []);
  const myClaim = $derived(claims.find((c) => c.byId === me));
  const others = $derived(claims.filter((c) => c.byId !== me));
  let askingName = $state(false);
  let someoneName = $state('');
  let addingSomeone = $state(false);

  function claim(status: ClaimStatus, byId = me, by = app.d.settings.name) {
    setClaim(list, item!.id, byId, by, status);
    save();
  }

  function getIt() {
    if (!app.d.settings.name.trim()) {
      askingName = true;
      return;
    }
    claim('getting');
    toast(mine ? "✓ You're getting it" : `✓ Marked. Send your picks to ${owner} when you're done.`);
  }

  function saveName(e: SubmitEvent) {
    e.preventDefault();
    if (!myName.trim()) return;
    app.d.settings.name = myName.trim();
    askingName = false;
    getIt();
  }

  function addSomeone(e: SubmitEvent) {
    e.preventDefault();
    const n = someoneName.trim();
    if (!n) return;
    claim('getting', 'm:' + uid(6), n);
    someoneName = '';
    addingSomeone = false;
  }

  /** Owners can change anyone's pick on their list; others only their own. */
  const canChange = (byId: string) => byId === me || mine;

  // ---------- Came in (thank-yous) ----------
  const got = $derived(item ? list.got.find((g) => g.itemId === item.id) : undefined);
  function cameIn() {
    if (got) list.got = list.got.filter((g) => g.id !== got.id);
    else list.got.push(newGot({ itemId: item!.id, name: item!.name, from: fromNames(list, item!.id, me, app.d.settings.name) }));
    save();
  }
</script>

<Sheet {onclose} label={item ? item.name : mine ? 'Add a gift' : 'Add a gift you’re getting'} full={editing}>
  {#if editing}
    <form class="stack" onsubmit={(e) => submit(e)}>
      <div class="row">
        <h2>{item ? 'Edit gift' : mine ? 'Add a gift' : "Add a gift you're getting"}</h2>
        <span class="spacer"></span>
        {#if !item && mine && onbulk}<button type="button" class="btn small ghost" onclick={onbulk}><Icon name="link" size={18} /> Paste many</button>{/if}
      </div>
      {#if !mine && !item}
        <p class="muted small" style="margin:0">
          Getting something that isn't on the list? Add it here so {owner} knows. It's marked as yours, and it goes to {owner} with your picks.
        </p>
      {/if}
      <label class="field">
        <span>What is it?</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input class="input" bind:value={name} placeholder={mine ? 'LEGO Friends treehouse' : 'Winter coat'} autofocus={!item} required />
      </label>
      <div class="field">
        <span>Where to buy it <span class="muted">(link, optional)</span></span>
        {#each links as _, i (i)}
          <div class="row nowrap">
            <input class="input" type="url" inputmode="url" bind:value={links[i]} onchange={() => linkChanged(i)} placeholder="Paste a link from Amazon, Target…" />
            {#if links.length > 1}
              <button type="button" class="btn small ghost" aria-label="Remove link" onclick={() => links.splice(i, 1)}><Icon name="x" size={18} /></button>
            {/if}
          </div>
        {/each}
        {#if links.at(-1)?.trim()}
          <button type="button" class="btn small ghost left" onclick={() => links.push('')}>+ Another store</button>
        {/if}
      </div>
      <div class="row nowrap">
        <label class="field" style="flex:1">
          <span>Price <span class="muted">(about)</span></span>
          <input class="input" inputmode="decimal" bind:value={price} placeholder="$25" />
        </label>
      </div>
      <label class="field">
        <span>Notes <span class="muted">(size, color…)</span></span>
        <textarea class="input" rows="2" bind:value={note} placeholder="Size 6, any color but pink"></textarea>
      </label>
      {#if mine}
        <label class="toggle">
          <input type="checkbox" bind:checked={star} />
          <span><strong>⭐ Most wanted</strong><span class="muted small">Shown at the top of the list.</span></span>
        </label>
        <label class="toggle">
          <input type="checkbox" bind:checked={many} />
          <span><strong>More than one is OK</strong><span class="muted small">Books, LEGO, gift cards: several people can get one without doubling up.</span></span>
        </label>
      {:else if needName}
        <label class="field">
          <span>Your name, so {owner} knows who it's from</span>
          <input class="input" bind:value={myName} placeholder="Grandma" required />
        </label>
      {/if}
      <div class="row">
        {#if item}
          <button type="button" class="btn ghost" onclick={() => (editing = false)}>Cancel</button>
          <span class="spacer"></span>
          <button class="btn primary" disabled={!name.trim()}>Save</button>
        {:else if mine}
          <button type="button" class="btn" disabled={!name.trim()} onclick={(e) => submit(e as unknown as SubmitEvent, true)}>Add & another</button>
          <span class="spacer"></span>
          <button class="btn primary" disabled={!name.trim()}>Add</button>
        {:else}
          <button class="btn primary block" disabled={!name.trim() || (needName && !myName.trim())}>🙋 Add it. I'm getting this</button>
        {/if}
      </div>
    </form>
  {:else if item}
    <div class="stack">
      <div class="row nowrap" style="align-items:flex-start">
        <h2 style="flex:1">{#if item.star}<span class="gold">★</span> {/if}{item.name}</h2>
        {#if canEdit}<button class="btn small" onclick={startEdit}><Icon name="pencil" size={18} /> Edit</button>{/if}
      </div>
      {#if item.price !== undefined || item.note || item.many || isAdded(item)}
        <p class="muted" style="margin:0">
          {[
            item.price !== undefined && `About ${money(item.price)}`,
            item.many && 'More than one is OK',
            isAdded(item) && (item.addedById === me ? 'You added this' : `Added by ${item.addedBy || 'family'}`),
          ]
            .filter(Boolean)
            .join(' · ')}
          {#if item.note}<br /><span class="note">{item.note}</span>{/if}
        </p>
      {/if}
      {#if item.links.length}
        <div class="stack" style="gap:8px">
          {#each item.links as l (l)}
            <a class="btn block store" href={l} target="_blank" rel="noopener noreferrer">🛒 Open at {storeName(l)} ↗</a>
          {/each}
        </div>
      {/if}

      <div class="picks card-in">
        <h3>Who's getting it</h3>
        {#if hidden}
          <p class="muted small">🤫 Hidden. This is your own wish list, so you won't see who's getting what.</p>
        {:else}
          {#if !claims.length}
            <p class="muted small" style="margin:0">Nobody yet.</p>
          {/if}
          {#each [...(myClaim ? [myClaim] : []), ...others] as c (c.byId)}
            <div class="pick">
              <span class="pname">{c.byId === me ? `You (${c.by || app.d.settings.name})` : c.by || 'Someone'}</span>
              {#if canChange(c.byId)}
                <div class="seg tight">
                  <button class:on={c.status === 'getting'} onclick={() => claim('getting', c.byId, c.by)}>Getting</button>
                  <button class:on={c.status === 'bought'} onclick={() => claim('bought', c.byId, c.by)}>Bought ✓</button>
                </div>
                <button class="btn small ghost" aria-label="Remove pick" onclick={() => claim('gone', c.byId, c.by)}><Icon name="x" size={18} /></button>
              {:else}
                <span class="muted small">{c.status === 'bought' ? 'bought ✓' : 'getting it'}</span>
              {/if}
            </div>
          {/each}

          {#if askingName}
            <form class="stack" style="gap:8px" onsubmit={saveName}>
              <label class="field">
                <span>Your name, so others know who's getting it</span>
                <!-- svelte-ignore a11y_autofocus -->
                <input class="input" bind:value={myName} placeholder="Grandma" autofocus />
              </label>
              <button class="btn primary" disabled={!myName.trim()}>I'll get this</button>
            </form>
          {:else if !myClaim}
            {#if others.length && !item.many}
              <p class="warn small">⚠️ {others.map((c) => c.by || 'Someone').join(' & ')} {others.length === 1 ? 'is' : 'are'} already getting this.</p>
            {/if}
            <button class="btn block" class:primary={!others.length || item.many} onclick={getIt}>
              🙋 {others.length && !item.many ? "I'll get it too" : "I'll get this"}
            </button>
          {/if}

          {#if mine}
            {#if addingSomeone}
              <form class="row nowrap" onsubmit={addSomeone}>
                <!-- svelte-ignore a11y_autofocus -->
                <input class="input" bind:value={someoneName} placeholder="Who? e.g. Aunt Sue" autofocus />
                <button class="btn primary" disabled={!someoneName.trim()}>Add</button>
              </form>
            {:else}
              <button class="btn ghost small left" onclick={() => (addingSomeone = true)}>+ Someone else is getting it</button>
            {/if}
          {/if}
        {/if}
      </div>

      {#if mine}
        <button class="btn block" class:got={!!got} onclick={cameIn}>
          {#if got}🎁 Came in{got.from ? ` from ${got.from}` : ''} ✓{:else}🎁 It came in (for thank-yous){/if}
        </button>
      {/if}
      {#if canEdit}<button class="btn ghost danger small" onclick={remove}>Remove from list</button>{/if}
    </div>
  {/if}
</Sheet>

<style>
  .nowrap {
    flex-wrap: nowrap;
  }
  .left {
    justify-self: start;
  }
  .gold {
    color: var(--gold);
  }
  .note {
    white-space: pre-line;
    color: var(--text);
  }
  .store {
    justify-content: flex-start;
  }
  .picks {
    display: grid;
    gap: 10px;
  }
  .pick {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pname {
    flex: 1;
    min-width: 0;
    font-weight: 800;
    overflow-wrap: anywhere;
  }
  .pick .btn {
    flex: none;
    padding: 4px 8px;
  }
  .warn {
    margin: 0;
    color: var(--pop);
    font-weight: 700;
  }
  .got {
    color: var(--done-text);
    border-color: var(--done-check);
  }
</style>
