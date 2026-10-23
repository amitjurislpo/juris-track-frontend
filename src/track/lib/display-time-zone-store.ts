/**
 * Where this browser remembers its display time zone: `localStorage` (a per-browser display preference; the API never needs it,
 * so it is not a cookie). Storage can be missing or refuse access (private windows, blocked site data): every access is guarded,
 * the choice then lasts until the page is reloaded, and otherwise the app shows the business time zone. Other tabs follow a change
 * through the `storage` event.
 */

const STORAGE_KEY = "juristrack.displayTimeZone";

const listeners = new Set<() => void>();
/** The choice when storage refused it (kept for this page only). */
let memoryChoice: string | null = null;

function readStoredChoice(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The current choice (null when none was made in this browser). */
export function currentDisplayTimeZoneChoice(): string | null {
  return readStoredChoice() ?? memoryChoice;
}

export function storeDisplayTimeZone(timeZone: string): void {
  memoryChoice = timeZone;
  try {
    window.localStorage.setItem(STORAGE_KEY, timeZone);
  } catch {
    // storage refused: the in-memory choice is used
  }
  for (const listener of listeners) listener();
}

export function subscribeToDisplayTimeZone(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) onChange(); };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
