/**
 * Hand solver: the best split of a hand into sets and runs using wild okeys.
 * Minimises leftover tiles; ties keep more leftover tiles that are one tile
 * away from a group. Runs longer than 5 always split into runs of 3-5, so
 * the search only needs groups of 3-5 tiles.
 */
import { faceIndexOf } from './tiles.js';

const FACES = 52;
const MAX_WILDS = 2;

/** @type {{faces:number[], wild:number, slots:number[]}[][] | null} */
let candidatesByMin = null;

/** Lazily build every candidate group, indexed by its lowest face. */
function candidates() {
  if (candidatesByMin) return candidatesByMin;
  const byMin = Array.from({ length: FACES }, () => []);
  const seen = new Set();
  const addVariants = (faces) => {
    for (let mask = 0; mask < 1 << faces.length; mask++) {
      const slots = faces.map((f, i) => ((mask >> i) & 1 ? -1 : f));
      const real = slots.filter((f) => f >= 0).sort((a, b) => a - b);
      const wild = slots.length - real.length;
      const key = real.join(',') + '|' + wild;
      if (wild > MAX_WILDS || real.length === 0 || seen.has(key)) continue;
      seen.add(key);
      byMin[real[0]].push({ faces: real, wild, slots });
    }
  };
  for (let color = 0; color < 4; color++) {
    for (let start = 1; start <= 12; start++) {
      for (let len = 3; len <= 5 && start + len - 1 <= 14; len++) {
        const faces = [];
        for (let p = start; p < start + len; p++) faces.push(color * 13 + (p === 14 ? 0 : p - 1));
        addVariants(faces);
      }
    }
  }
  for (let num = 0; num < 13; num++) {
    for (let mask = 0; mask < 16; mask++) {
      const colors = [0, 1, 2, 3].filter((c) => (mask >> c) & 1);
      if (colors.length >= 3) addVariants(colors.map((c) => c * 13 + num));
    }
  }
  candidatesByMin = byMin;
  return byMin;
}

/**
 * True when two faces (0-51) are two tiles of a possible group: same number in
 * different colours, or same colour within two steps (13 and 12 reach 1).
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
export function isPartial(a, b) {
  if (a === b) return false;
  const ca = Math.floor(a / 13);
  const cb = Math.floor(b / 13);
  const na = (a % 13) + 1;
  const nb = (b % 13) + 1;
  if (na === nb) return ca !== cb;
  if (ca !== cb) return false;
  const lo = Math.min(na, nb);
  const hi = Math.max(na, nb);
  return hi - lo <= 2 || (lo === 1 && hi >= 12);
}

/** Number of leftover faces that have a partial partner among the leftovers. */
function nearCount(left) {
  let near = 0;
  for (let i = 0; i < left.length; i++) {
    for (let j = 0; j < left.length; j++) {
      if (i !== j && isPartial(left[i], left[j])) {
        near++;
        break;
      }
    }
  }
  return near;
}

function fits(counts, faces) {
  for (const f of faces) if (counts[f] === 0) return false;
  return true;
}

function adjust(counts, faces, delta) {
  for (const f of faces) counts[f] += delta;
}

function search(ctx, start, leftover) {
  const { counts, best } = ctx;
  if (best.done || leftover > best.leftover || (ctx.quick && leftover >= best.leftover)) return;
  let f = start;
  while (f < FACES && counts[f] === 0) f++;
  if (f === FACES) {
    recordLeaf(ctx, leftover + ctx.wilds);
    return;
  }
  for (const cand of ctx.table[f]) {
    if (cand.wild > ctx.wilds || !fits(counts, cand.faces)) continue;
    adjust(counts, cand.faces, -1);
    ctx.wilds -= cand.wild;
    ctx.chosen.push(cand);
    search(ctx, f, leftover);
    ctx.chosen.pop();
    ctx.wilds += cand.wild;
    adjust(counts, cand.faces, 1);
  }
  const copies = counts[f];
  counts[f] = 0;
  for (let i = 0; i < copies; i++) ctx.left.push(f);
  search(ctx, f + 1, leftover + copies);
  ctx.left.length -= copies;
  counts[f] = copies;
}

function recordLeaf(ctx, total) {
  const { best } = ctx;
  if (total > best.leftover) return;
  const near = ctx.quick ? 0 : nearCount(ctx.left);
  if (total === best.leftover && near <= best.near) return;
  best.leftover = total;
  best.near = near;
  best.chosen = ctx.chosen.slice();
  if (total === 0) best.done = true;
}

function runSearch(tiles, okey, quick) {
  const counts = new Int8Array(FACES);
  const byFace = Array.from({ length: FACES }, () => []);
  const wildTiles = [];
  for (const tile of tiles) {
    const f = faceIndexOf(tile, okey);
    if (f < 0) wildTiles.push(tile);
    else {
      counts[f]++;
      byFace[f].push(tile);
    }
  }
  const best = { leftover: Infinity, near: -1, chosen: [], done: false };
  const ctx = { counts, wilds: wildTiles.length, chosen: [], left: [], best, quick, table: candidates() };
  search(ctx, 0, 0);
  return { best, byFace, wildTiles };
}

/**
 * Best split of a hand into groups.
 * @param {object[]} tiles Tiles of the hand (any size).
 * @param {{color:number,num:number}} okey Okey face.
 * @returns {{leftover:number, near:number, groups:object[][], rest:object[]}}
 *   groups hold tiles in display order (a wild sits where it stands in a run).
 */
export function solveHand(tiles, okey) {
  const { best, byFace, wildTiles } = runSearch(tiles, okey, false);
  const pools = byFace.map((list) => list.slice());
  const wilds = wildTiles.slice();
  const groups = best.chosen.map((cand) => cand.slots.map((f) => (f < 0 ? wilds.pop() : pools[f].pop())));
  const rest = pools.flat().concat(wilds);
  return { leftover: best.leftover, near: best.near, groups, rest };
}

/**
 * Fewest tiles that cannot be placed in groups (fast path without tie-breaking).
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {number}
 */
export function leftoverCount(tiles, okey) {
  return runSearch(tiles, okey, true).best.leftover;
}
