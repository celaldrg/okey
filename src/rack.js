/**
 * Rack layout: your 15 tiles laid out in two rows of 13 slots.
 * A rack is an array of 26 slots holding tile ids or null. Pure module.
 */
import { isWild, faceIndexOf } from './tiles.js';
import { solveHand } from './solver.js';
import { findPairs } from './groups.js';

/** Slots per rack row. */
export const ROW = 13;
/** Total rack slots (two rows). */
export const SLOTS = ROW * 2;

/**
 * An empty rack.
 * @returns {(number|null)[]}
 */
export function emptyRack() {
  return Array(SLOTS).fill(null);
}

function lastUsed(slots) {
  for (let i = slots.length - 1; i >= 0; i--) if (slots[i] !== null) return i;
  return -1;
}

/**
 * Bring the rack in line with the hand: tiles that left the hand are removed,
 * new tiles go to the first free slot after the last used one (or `prefer` when free).
 * @param {(number|null)[]} slots
 * @param {number[]} ids Tile ids now in the hand.
 * @param {number} [prefer] Preferred slot for a single new tile.
 * @returns {(number|null)[]} A new rack.
 */
export function syncRack(slots, ids, prefer = -1) {
  const wanted = new Set(ids);
  const next = slots.map((id) => (id !== null && wanted.has(id) ? id : null));
  const placed = new Set(next.filter((id) => id !== null));
  for (const id of ids) {
    if (placed.has(id)) continue;
    let at = prefer >= 0 && next[prefer] === null ? prefer : next.indexOf(null, lastUsed(next) + 1);
    if (at < 0) at = next.indexOf(null);
    next[at] = id;
    prefer = -1;
  }
  return next;
}

/**
 * Swap the contents of two slots.
 * @param {(number|null)[]} slots
 * @param {number} from
 * @param {number} to
 * @returns {(number|null)[]} A new rack.
 */
export function moveTile(slots, from, to) {
  const next = slots.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function tryLayout(blocks, loose, gap) {
  const slots = emptyRack();
  let pos = 0;
  for (const block of blocks) {
    const rowEnd = (Math.floor(pos / ROW) + 1) * ROW;
    if (pos + block.length > rowEnd) pos = rowEnd;
    if (pos + block.length > SLOTS) return null;
    block.forEach((id, i) => { slots[pos + i] = id; });
    const end = pos + block.length;
    pos = end % ROW === 0 ? end : end + gap;
  }
  if (pos + loose.length > SLOTS) return null;
  loose.forEach((id, i) => { slots[pos + i] = id; });
  return slots;
}

/**
 * Lay out blocks of ids that stay together (each within one row, gaps between)
 * followed by loose ids. Drops the gaps, then the row rule, when space runs out.
 * @param {number[][]} blocks
 * @param {number[]} loose
 * @returns {(number|null)[]}
 */
export function layoutBlocks(blocks, loose) {
  const flat = [...blocks.flat(), ...loose];
  return tryLayout(blocks, loose, 1) || tryLayout(blocks, loose, 0) || tryLayout([], flat, 0);
}

function byFace(okey) {
  return (a, b) => faceIndexOf(a, okey) - faceIndexOf(b, okey) || a.id - b.id;
}

/**
 * Rack laid out by the solver's best split: groups first, then the spare
 * tiles by colour and number, wild okeys last.
 * @param {object[]} hand
 * @param {{color:number,num:number}} okey
 * @returns {(number|null)[]}
 */
export function sortRuns(hand, okey) {
  const { groups, rest } = solveHand(hand, okey);
  const spare = rest.filter((t) => !isWild(t, okey)).sort(byFace(okey));
  const wilds = rest.filter((t) => isWild(t, okey));
  return layoutBlocks(groups.map((g) => g.map((t) => t.id)), [...spare, ...wilds].map((t) => t.id));
}

/**
 * Rack laid out as pairs of identical tiles, then wild okeys, then singles.
 * @param {object[]} hand
 * @param {{color:number,num:number}} okey
 * @returns {(number|null)[]}
 */
export function sortPairs(hand, okey) {
  const { pairs, singles, wilds } = findPairs(hand, okey);
  return layoutBlocks(pairs.map((p) => p.map((t) => t.id)), [...wilds, ...singles].map((t) => t.id));
}

function nearestInRow(slots, row, col) {
  let best = -1;
  for (let c = 0; c < ROW; c++) {
    const i = row * ROW + c;
    if (slots[i] !== null && (best < 0 || Math.abs(c - col) < Math.abs((best % ROW) - col))) best = i;
  }
  return best;
}

/**
 * Move a keyboard cursor between used slots.
 * @param {(number|null)[]} slots
 * @param {number} current Current slot or -1.
 * @param {'left'|'right'|'up'|'down'} dir
 * @returns {number} The new slot (unchanged when there is nowhere to go), -1 for an empty rack.
 */
export function stepCursor(slots, current, dir) {
  const used = slots.map((id, i) => (id === null ? -1 : i)).filter((i) => i >= 0);
  if (!used.length) return -1;
  if (current < 0 || slots[current] === null) return used[0];
  if (dir === 'left' || dir === 'right') {
    const k = used.indexOf(current) + (dir === 'left' ? -1 : 1);
    return k >= 0 && k < used.length ? used[k] : current;
  }
  const row = Math.floor(current / ROW);
  const other = dir === 'up' ? row - 1 : row + 1;
  if (other < 0 || other > 1) return current;
  const found = nearestInRow(slots, other, current % ROW);
  return found < 0 ? current : found;
}
