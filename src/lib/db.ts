// Local storage. Everything is one record in this browser's IndexedDB; nothing is sent anywhere.

import type { Data } from './types';

const DB_NAME = 'milks-giftlist';
const KEY = 'data';
let dbp: Promise<IDBDatabase> | undefined;

function db(): Promise<IDBDatabase> {
  return (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('data');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction('data', mode);
        const req = fn(tx.objectStore('data'));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export const loadData = () => run<Data | undefined>('readonly', (s) => s.get(KEY));

export async function saveData(d: Data): Promise<void> {
  // $state proxies can't be structured-cloned; store a plain copy.
  await run('readwrite', (s) => s.put(JSON.parse(JSON.stringify(d)), KEY));
}

/** Asks the browser not to evict our data when storage runs low (best effort). */
export function requestPersistence(): void {
  navigator.storage?.persist?.().catch(() => {});
}
