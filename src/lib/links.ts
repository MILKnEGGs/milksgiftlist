// Store links: tidying them, naming the store, guessing a product name from the address, and turning
// pasted text (links copied from Amazon, Walmart, Target...) into gift ideas.
//
// The app can't read store pages (browsers block that without a server, and the big stores block bots
// anyway), so everything here works from the link text alone.

const STORES: [RegExp, string][] = [
  [/(^|\.)(amazon\.[a-z.]+|amzn\.(to|com|eu)|a\.co)$/, 'Amazon'],
  [/(^|\.)walmart\.(com|ca)$/, 'Walmart'],
  [/(^|\.)target\.com$/, 'Target'],
  [/(^|\.)bestbuy\.(com|ca)$/, 'Best Buy'],
  [/(^|\.)etsy\.com$/, 'Etsy'],
  [/(^|\.)ebay\.[a-z.]+$/, 'eBay'],
  [/(^|\.)kohls\.com$/, "Kohl's"],
  [/(^|\.)costco\.com$/, 'Costco'],
  [/(^|\.)lego\.com$/, 'LEGO'],
  [/(^|\.)gamestop\.com$/, 'GameStop'],
  [/(^|\.)barnesandnoble\.com$/, 'Barnes & Noble'],
  [/(^|\.)homedepot\.com$/, 'Home Depot'],
  [/(^|\.)lowes\.com$/, "Lowe's"],
  [/(^|\.)michaels\.com$/, "Michaels"],
  [/(^|\.)samsclub\.com$/, "Sam's Club"],
  [/(^|\.)macys\.com$/, "Macy's"],
  [/(^|\.)nordstrom\.com$/, 'Nordstrom'],
  [/(^|\.)oldnavy\.(gap\.)?com$/, 'Old Navy'],
  [/(^|\.)apple\.com$/, 'Apple'],
  [/(^|\.)nintendo\.com$/, 'Nintendo'],
  [/(^|\.)temu\.com$/, 'Temu'],
  [/(^|\.)shein\.com$/, 'SHEIN'],
];

function parseUrl(s: string): URL | undefined {
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    return u.hostname.includes('.') ? u : undefined;
  } catch {
    return undefined;
  }
}

/** "Amazon", "Target", or a tidy version of the site name ("Fatbraintoys") for anywhere else. */
export function storeName(link: string): string {
  const u = parseUrl(link);
  if (!u) return 'Link';
  const host = u.hostname.toLowerCase().replace(/^www\d?\./, '').replace(/^m\./, '');
  for (const [re, name] of STORES) if (re.test(host)) return name;
  const parts = host.split('.');
  const main = parts.length > 2 && parts.at(-2)!.length <= 3 ? parts.at(-3)! : parts.at(-2) ?? host;
  return main.charAt(0).toUpperCase() + main.slice(1);
}

const JUNK_PARAMS = /^(utm_|ref|ref_|tag|psc|th|smid|spLa|pd_rd|pf_rd|qid|sr|keywords|crid|sprefix|dib|dib_tag|content-id|linkCode|linkId|camp|creative|fbclid|gclid|gbraid|wbraid|msclkid|mc_|_branch|clickid|affiliate|irgwc|sourceid|veh|wmlspartner|athcpid|athpgid|athznid|athieid|athstid|athguid|athwpid|athena|adid|cmp|lnk|epik|share|si|igsh)/i;

/** Shortens a store link to just what's needed to open the product (drops tracking junk). */
export function cleanLink(link: string): string {
  const u = parseUrl(link.trim());
  if (!u) return link.trim();
  const store = storeName(u.href);
  if (store === 'Amazon') {
    const asin = u.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?=[/?]|$)/i)?.[1];
    if (asin) return `https://${u.hostname.replace(/^(m|smile)\./, 'www.')}/dp/${asin.toUpperCase()}`;
  }
  if (store === 'Walmart') {
    const id = u.pathname.match(/\/ip\/(?:[^/]+\/)?(\d+)/)?.[1];
    if (id) return `https://www.walmart.com/ip/${id}`;
  }
  if (store === 'Target') {
    const id = u.pathname.match(/\/-\/(A-\d+)/)?.[1];
    if (id) return `https://www.target.com/p/-/${id}`;
  }
  for (const k of [...u.searchParams.keys()]) if (JUNK_PARAMS.test(k)) u.searchParams.delete(k);
  u.hash = '';
  return u.href.replace(/\/$/, '').replace(/\?$/, '');
}

/** A product name from the words in a link, when it has any: amazon.com/LEGO-Classic-Bricks/dp/… → "LEGO Classic Bricks". */
export function guessName(link: string): string {
  const u = parseUrl(link);
  if (!u) return '';
  const segs = u.pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
  const store = storeName(u.href);
  let slug = '';
  if (store === 'Amazon') {
    const i = segs.findIndex((s) => s === 'dp' || s === 'gp');
    slug = i > 0 ? segs[i - 1] : '';
  } else if (store === 'Walmart') slug = segs[0] === 'ip' && segs.length > 2 ? segs[1] : '';
  else if (store === 'Target') slug = segs[0] === 'p' ? segs[1] ?? '' : '';
  else if (store === 'Best Buy') slug = segs[0] === 'site' ? segs[1] ?? '' : '';
  else if (store === 'Etsy') slug = segs[0] === 'listing' ? segs[2] ?? '' : '';
  else if (store === 'eBay') slug = segs[0] === 'itm' && segs.length > 2 ? segs[1] : '';
  else {
    // Elsewhere: the last part of the address that reads like words.
    slug = [...segs].reverse().find((s) => /[a-z]{3,}.*[-_ ][a-z]{2,}/i.test(s.replace(/\.(html?|aspx?|php)$/i, ''))) ?? '';
  }
  slug = slug.replace(/\.(html?|aspx?|php|p)$/i, '');
  if (!/[a-z]{2,}/i.test(slug) || /^[A-Z0-9]{10}$/.test(slug)) return '';
  const words = slug.replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Shop addresses are often all lowercase; capitalize those (leave mixed-case ones like "LEGO" alone).
  return words === words.toLowerCase() ? words.replace(/\b[a-z]/g, (c) => c.toUpperCase()) : words;
}

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+|\b(?:www\.|a\.co\/|amzn\.to\/)[^\s<>"')\]]+/gi;

/** Phrases the stores' Share buttons put around the product name. */
const SHARE_JUNK = [
  /^(check out|look at|i found|i saw|found|see) (this|these|that)( (deal|item|product|great deal|awesome find|listing))?( on| at| from)? ?([a-z' &.]+?)?\s*[:!-]\s*/i,
  /^(shop|buy|get)\s+/i,
  /\s*[|:-]\s*(amazon(\.com)?|walmart(\.com)?|target|best buy|etsy|ebay)\s*$/i,
  /^amazon\.com\s*:\s*/i,
];

export interface PastedGift {
  name: string;
  link?: string;
  /** Cents, when a price line followed the name (copying a whole wish-list page gives those). */
  price?: number;
}

/** Lines from a copied store page that aren't gift names. */
const NOT_A_GIFT = [
  /^(add to (cart|list|registry|basket)|buy (it )?(again|now)|move|delete|remove|comment|share|see (all )?(buying )?options|view (details|item)|save for later|in stock|out of stock|currently unavailable|sponsored|prime|free (shipping|delivery|returns).*|only \d+ left.*|quantity:?.*|qty:?.*|item added.*|added (on )?.*\d{4}|(used|new) & (new|used).*|\d+ (offers?|ratings?|reviews?).*|price:?|list price.*|was:?.*|save \d+%.*|deal|limited time deal|best seller|amazon's choice|overall pick|needs:?.*|has:?.*|priority:?.*|comments?:?.*)$/i,
  /^[\d.]+ out of 5( stars)?.*$/i,
  /^\(?[\d,]+\)?$/,
  /^by\s+\S.*$/i,
];

const PRICE_LINE = /^(?:price:?\s*)?\$\s?(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(?:each|ea\.?))?$/i;

function tidyName(s: string): string {
  let t = s.replace(/^[\s•*\-–—·☐☑✓✔▪▫◦○●\d.)]+(?=\S)/, '').trim();
  for (const re of SHARE_JUNK) t = t.replace(re, '').trim();
  return t.replace(/^["“”']+|["“”']+$/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Turns pasted text into gift ideas: one per line. A line can be a name, a link, or both ("LEGO set
 * https://a.co/d/xyz", which is what Amazon's Share → Copy gives). A name on its own line followed by a
 * line with just a link is treated as one idea.
 */
export function parsePasted(text: string): PastedGift[] {
  const out: PastedGift[] = [];
  let pendingName: PastedGift | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      pendingName = undefined;
      continue;
    }
    const price = line.match(PRICE_LINE)?.[1];
    if (price) {
      const last = out.at(-1);
      if (last && last.price === undefined) last.price = Math.round(Number(price.replace(/,/g, '')) * 100);
      continue;
    }
    const urls = line.match(URL_RE) ?? [];
    const name = tidyName(line.replace(URL_RE, ' '));
    if (!urls.length) {
      if (!name || NOT_A_GIFT.some((re) => re.test(line) || re.test(name))) continue;
      pendingName = { name };
      out.push(pendingName);
      continue;
    }
    const raws = urls.map((u) => u.replace(/[.,;!]+$/, ''));
    if (!name && pendingName && !pendingName.link) pendingName.link = cleanLink(raws.shift()!);
    // Guess from the original link: cleaning drops the words from the address.
    for (const raw of raws) out.push({ name: name || guessName(raw), link: cleanLink(raw) });
    pendingName = undefined;
  }
  return out;
}
