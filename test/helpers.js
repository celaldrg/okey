/**
 * Test helpers: tile notation and an independent exhaustive reference search.
 * Notation: R/Y/B/K + number (red, yellow, blue, black), J = false joker.
 */
import { faceOf } from '../src/tiles.js';

const LETTERS = { R: 0, Y: 1, B: 2, K: 3 };

/**
 * Build tiles from notation with unique ids, e.g. tiles('R5 R6 J').
 * @param {string} text
 * @returns {object[]}
 */
export function tiles(text) {
  const used = new Map();
  let jokers = 0;
  return text.trim().split(/\s+/).map((code) => {
    if (code === 'J') return { id: 104 + jokers++, color: -1, num: 0, fake: true };
    const color = LETTERS[code[0]];
    const num = Number(code.slice(1));
    if (color === undefined || !(num >= 1 && num <= 13)) throw new Error(`Bad tile ${code}`);
    const key = color * 13 + num - 1;
    const copy = used.get(key) || 0;
    used.set(key, copy + 1);
    return { id: copy * 52 + key, color, num, fake: false };
  });
}

/** Okey face from notation, e.g. okey('R8'). */
export function okey(code) {
  const [t] = tiles(code);
  return { color: t.color, num: t.num };
}

/** All target groups (as face multisets) of a given size: sets and runs. */
function targets(size) {
  const out = [];
  if (size <= 4) {
    for (let num = 1; num <= 13; num++) {
      for (let mask = 0; mask < 16; mask++) {
        const colors = [0, 1, 2, 3].filter((c) => (mask >> c) & 1);
        if (colors.length === size) out.push(colors.map((c) => `${c}:${num}`));
      }
    }
  }
  for (let color = 0; color < 4; color++) {
    for (let start = 1; start + size - 1 <= 14; start++) {
      const faces = [];
      for (let p = start; p < start + size; p++) faces.push(`${color}:${p === 14 ? 1 : p}`);
      out.push(faces);
    }
  }
  return out;
}

const TARGETS = new Map([3, 4, 5].map((n) => [n, targets(n)]));

/**
 * Reference group check: the real faces must fit inside some target set/run of
 * the same size; wild okeys fill the remaining places. Sizes 3-5 only.
 * @param {object[]} group
 * @param {object} ok Okey face.
 * @returns {boolean}
 */
export function refGroup(group, ok) {
  const real = group.map((t) => faceOf(t, ok)).filter(Boolean).map((f) => `${f.color}:${f.num}`);
  for (const target of TARGETS.get(group.length) || []) {
    const pool = target.slice();
    if (real.every((f) => pool.includes(f) && pool.splice(pool.indexOf(f), 1))) return true;
  }
  return false;
}

/**
 * Exhaustive minimum leftover: every way of covering tiles by groups of 3-5
 * (any longer run splits into runs of 3-5), memoised on the remaining tiles.
 * @param {object[]} hand
 * @param {object} ok
 * @returns {number}
 */
export function refMinLeftover(hand, ok) {
  const faces = hand.map((t) => faceOf(t, ok));
  const memo = new Map();
  const related = (i, j) => !faces[i] || !faces[j] || faces[i].color === faces[j].color || faces[i].num === faces[j].num;
  const best = (mask) => {
    if (mask === 0) return 0;
    if (memo.has(mask)) return memo.get(mask);
    let i = 0;
    while (!((mask >> i) & 1)) i++;
    const rest = mask & ~(1 << i);
    let result = 1 + best(rest);
    const others = [];
    for (let j = 0; j < hand.length; j++) if ((rest >> j) & 1 && related(i, j)) others.push(j);
    const pick = (from, chosen) => {
      if (chosen.length >= 2) {
        const group = [i, ...chosen].map((k) => hand[k]);
        if (refGroup(group, ok)) {
          let m = rest;
          for (const k of chosen) m &= ~(1 << k);
          result = Math.min(result, best(m));
        }
      }
      if (chosen.length === 4) return;
      for (let k = from; k < others.length; k++) pick(k + 1, [...chosen, others[k]]);
    };
    pick(0, []);
    memo.set(mask, result);
    return result;
  };
  return best((1 << hand.length) - 1);
}

/**
 * Independent winning check for 14 tiles: seven identical pairs (wilds fill)
 * or zero leftover by the reference search.
 * @param {object[]} hand
 * @param {object} ok
 * @returns {boolean}
 */
export function refWinning(hand, ok) {
  if (hand.length !== 14) return false;
  const counts = new Map();
  let wilds = 0;
  for (const t of hand) {
    const f = faceOf(t, ok);
    if (!f) wilds++;
    else counts.set(`${f.color}:${f.num}`, (counts.get(`${f.color}:${f.num}`) || 0) + 1);
  }
  const singles = [...counts.values()].filter((c) => c % 2).length;
  return singles <= wilds || refMinLeftover(hand, ok) === 0;
}
