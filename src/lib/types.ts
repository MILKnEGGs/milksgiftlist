// Everything the app saves. Prices are stored in cents so totals add up exactly.

export type ThemeMode = 'auto' | 'light' | 'dark';

/** One gift idea on a list. */
export interface Item {
  id: string;
  name: string;
  /** Where to buy it. Usually one, sometimes the same thing at a few stores. */
  links: string[];
  /** Cents, or undefined when no price was given. */
  price?: number;
  /** Size, color, "the blue one", etc. */
  note: string;
  /** Most wanted: shown first with a star. */
  star: boolean;
  /** More than one person can get this (books, LEGO, gift cards), so it's never "taken". */
  many: boolean;
  addedAt: number;
  /** Set when someone the list was shared with added it (a gift they're getting that wasn't on the list). */
  addedBy?: string;
  addedById?: string;
}

/** 'gone' is kept (not deleted) so an un-pick travels to other phones like any other change. */
export type ClaimStatus = 'getting' | 'bought' | 'gone';

/** Someone is getting (or has bought) an item. One per item per person; the newest `at` wins on merge. */
export interface Claim {
  itemId: string;
  /** Display name, e.g. "Grandma". Empty when the sender chose to hide names. */
  by: string;
  /** The phone that made the pick (its device id), or "m:…" for a pick typed in by the list's owner for someone without the app. */
  byId: string;
  status: ClaimStatus;
  at: number;
}

export interface GiftList {
  id: string;
  /** e.g. "Christmas 2026" */
  title: string;
  /** Optional: who the gifts are for, e.g. "Dad". */
  forWho: string;
  /** Optional YYYY-MM-DD: the birthday or holiday. */
  date?: string;
  /** 'mine': made on this phone and editable. 'shared': someone sent it; only picks can be changed. */
  kind: 'mine' | 'shared';
  /** For shared lists: who sent it, and their device id (replies go back to them). */
  ownerName?: string;
  ownerId?: string;
  /** For my own wish list: hide every pick from me so gifts stay a surprise. */
  surprise: boolean;
  archived: boolean;
  createdAt: number;
  /** Last change to the list or its items (not picks). Newer shares replace older ones. */
  updatedAt: number;
  /** For shared lists: when this phone last sent its picks back. Picks newer than this aren't sent yet. */
  sentAt?: number;
  items: Item[];
  claims: Claim[];
  /** What I mean to spend on this list, in cents. Only on this phone. */
  budget?: number;
  /** Items family added that the owner took off again, so their copies drop them too. */
  dropped: string[];
  /** After the big day: what came in and who it was from, for thank-you notes. Only on this phone. */
  got: Got[];
  /** For shared lists: the sizes the owner sent along (the owner's own lists use the People tab). */
  sizes?: Size[];
}

/** A gift that came in, for the thank-you list. */
export interface Got {
  id: string;
  /** The list item it was, if it was on the list. */
  itemId?: string;
  name: string;
  from: string;
  thanked: boolean;
  at: number;
}

export interface Size {
  label: string;
  value: string;
}

/** Something someone mentioned wanting, saved for later. */
export interface Idea {
  id: string;
  name: string;
  link?: string;
  note: string;
  at: number;
}

/** Someone I shop for: their sizes and an idea jar. Lists match them by "who it's for". */
export interface Person {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  birthday?: string;
  sizes: Size[];
  ideas: Idea[];
  createdAt: number;
}

export interface Settings {
  theme: ThemeMode;
  /** The name other people see on your picks and lists. */
  name: string;
  /** Random id for this phone, so picks from different people never collide. */
  deviceId: string;
}

export interface Data {
  version: 1;
  lists: GiftList[];
  people: Person[];
  settings: Settings;
}
