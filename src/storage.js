/**
 * Tiny localStorage wrapper: every access is guarded so private mode or
 * blocked storage never crashes the game.
 */

const PREFIX = 'okey:';

/**
 * Read a JSON value.
 * @template T
 * @param {string} key
 * @param {T} fallback Returned when nothing is stored or storage is unavailable.
 * @returns {T}
 */
export function loadValue(key, fallback) {
  try {
    const raw = globalThis.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Store a JSON value.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} False when storage is unavailable.
 */
export function saveValue(key, value) {
  try {
    globalThis.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
