// Taking in a pasted message or an opened link: decode it, apply it, say what happened.

import { listName } from './data';
import { receive, type Received } from './receive';
import { decodeShare, payloadFrom } from './share';
import { app, save, toast } from './store.svelte';

export async function takeIn(textOrPayload: string): Promise<Received> {
  const payload = payloadFrom(textOrPayload) ?? (/^[zj][A-Za-z0-9_-]{8,}$/.test(textOrPayload) ? textOrPayload : undefined);
  if (!payload) throw new Error("There's no Gift List code in that. Copy the whole message you were sent, then try again.");
  const r = receive(app.d, await decodeShare(payload));
  save();
  const name = listName(r.list);
  if (r.kind === 'added') toast(`🎁 Added “${name}”`);
  else if (r.kind === 'picks')
    toast(
      r.added
        ? `✓ ${r.from}'s picks are in, plus ${r.added} gift${r.added === 1 ? '' : 's'} they added`
        : r.changed
          ? `✓ ${r.from}'s picks are in (${r.changed} change${r.changed === 1 ? '' : 's'})`
          : `${r.from}'s picks were already up to date`,
    );
  else {
    toast(r.changed ? `✓ Updated “${name}”` : `“${name}” is already up to date`);
    if (r.removed.length) setTimeout(() => alert(`Heads up: ${r.removed.join(', ')} ${r.removed.length === 1 ? 'was' : 'were'} taken off the list, so your pick was removed.`), 300);
  }
  return r;
}
