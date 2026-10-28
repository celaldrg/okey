/**
 * Seeded pseudo-random number generator (mulberry32) and helpers.
 * Pure module: no DOM, no globals.
 */

/**
 * Create a deterministic random number generator.
 * @param {number} seed Any integer seed.
 * @returns {() => number} Function returning floats in [0, 1).
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Random integer in [0, n).
 * @param {() => number} rng
 * @param {number} n
 * @returns {number}
 */
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

/**
 * Fisher-Yates shuffle in place.
 * @template T
 * @param {T[]} items
 * @param {() => number} rng
 * @returns {T[]} The same array, shuffled.
 */
export function shuffle(items, rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
