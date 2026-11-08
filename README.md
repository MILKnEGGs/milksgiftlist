# Milk's Gift List

Gift lists for birthdays and holidays that family can share, so nobody doubles up.

- **Lists** have a name ("Christmas 2026"), an optional person ("Emma") and an optional date (shows a countdown).
- **Gifts** have a name, store links (Amazon, Walmart, Target, anywhere), a rough price, notes, ⭐ most wanted, and
  "more than one is OK" for things like books where several people can each get one.
- **Paste links or a list**: paste store links (cleaned of tracking junk, product names guessed from the address),
  plain names, or a whole copied Amazon wish-list page (names and prices are picked out).
- **Who's getting what**: anyone can tap "I'll get this"; two people on the same gift shows a ⚠️ doubled-up warning.
  The owner can also type in picks for relatives without the app ("Aunt Sue is getting it").
- **My shopping**: everything you're getting across all lists, with a running total, ticked off as you buy.
- **My own wish list** mode hides picks from the owner so their gifts stay a surprise.
- **Family can add gifts** they're getting that weren't on the list. These go back to the owner with their picks, show as
  "added by Grandma", and travel on when the list is re-shared. They're left out of shares to the person the list is for.
- **Budgets**: set what you mean to spend on a list; your picks are added up against it (also on My shopping).
- **What came in & thank-yous**: after the big day, tick off what was opened. Who it's from is filled in from the picks.
  Add things that weren't on the list, check off thank-you notes, and copy the checklist.
- **Start a new list from this one**: next year's list with just the leftover ideas, title and date moved on a year.
- **People**: birthday, sizes (shown on every list for them and sent along when shared) and an idea jar to pull from
  when a list comes up.

## Sharing (no server)

1. The owner taps **Share**. That copies a readable list plus a link: `…/milksgiftlist/#/s/<code>`.
2. Family tap the link. It opens in any browser with no app or account, saves the list there, and lets them mark picks.
3. They tap **Send my picks**, which copies a short message with an `MGF:` code, and text it back.
4. The owner copies that message and taps **Paste**. Picks merge in (newest wins per person per gift).
5. Re-sharing sends the updated list. Choose to include names, just "taken", or nothing (for the gift recipient).

The code after `#` is never sent to the web server, so lists only travel inside the messages people send.

Everything is stored on the device (IndexedDB). It works offline once opened, and installs to the Home Screen.

## Develop

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173
npm.cmd test         # sharing, merging and link-parsing tests
npm.cmd run build    # svelte-check + production build into dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`
(one-time setup: repo Settings → Pages → Source: "GitHub Actions").
