/**
 * Computer player decisions. Works on a plain "view" of the table so it stays
 * independent of the game state machine:
 * { hand, okey, takeable (tile|null), nextPicked (tiles the next player took
 *   from discards), nextDiscards (tiles the next player threw away), seen (visible tiles) }
 */
import { isWild, faceIndexOf, identicalTiles } from './tiles.js';
import { solveHand, leftoverCount, isPartial } from './solver.js';
import { findPairs, findFinishes, finishPenalty } from './groups.js';

/** Pairs needed before a computer player aims for seven pairs. */
export const PAIRS_MODE_THRESHOLD = 5;

/**
 * True when the hand already holds enough pairs to aim for seven pairs.
 * @param {object[]} hand
 * @param {{color:number,num:number}} okey
 * @returns {boolean}
 */
export function wantsPairs(hand, okey) {
  return findPairs(hand, okey).pairs.length >= PAIRS_MODE_THRESHOLD;
}

/**
 * Decide where to draw from.
 * @param {{hand:object[], okey:object, takeable:object|null}} view
 * @returns {'pile'|'discard'}
 */
export function chooseDraw(view) {
  const { hand, okey, takeable } = view;
  if (!takeable) return 'pile';
  if (isWild(takeable, okey)) return 'discard';
  if (wantsPairs(hand, okey)) {
    const face = faceIndexOf(takeable, okey);
    const singles = findPairs(hand, okey).singles;
    return singles.some((t) => faceIndexOf(t, okey) === face) ? 'discard' : 'pile';
  }
  return leftoverCount([...hand, takeable], okey) <= leftoverCount(hand, okey) ? 'discard' : 'pile';
}

/** How much the next player could want this face (from what they picked up and threw away). */
function danger(face, view) {
  let score = 0;
  for (const tile of view.nextPicked || []) {
    const g = faceIndexOf(tile, view.okey);
    if (g === face) score += 4;
    else if (g >= 0 && isPartial(face, g)) score += 2;
  }
  for (const tile of view.nextDiscards || []) {
    const g = faceIndexOf(tile, view.okey);
    if (g === face || (g >= 0 && g % 13 === face % 13)) score -= 1;
  }
  return score;
}

/** How useful a tile still is to its owner: partial partners among spare and all tiles. */
function keepValue(tile, spare, hand, okey) {
  const face = faceIndexOf(tile, okey);
  let value = 0;
  for (const other of spare) if (other !== tile && isPartial(face, faceIndexOf(other, okey))) value += 4;
  for (const other of hand) if (other !== tile && isPartial(face, faceIndexOf(other, okey))) value += 1;
  return value;
}

/** In pairs mode a single whose twin is already visible can never pair. */
function pairValue(tile, view) {
  return (view.seen || []).some((t) => t !== tile && identicalTiles(t, tile)) ? -5 : 0;
}

function pickFinish(options, okey) {
  let best = options[0];
  for (const option of options) {
    if (finishPenalty(option.tile, option.kind, okey) > finishPenalty(best.tile, best.kind, okey)) best = option;
  }
  return best.tile;
}

/** Tiles whose removal keeps the fewest leftovers (used when every tile sits in a group). */
function leastHarmful(hand, okey) {
  const options = hand.filter((t) => !isWild(t, okey));
  const scores = options.map((t) => leftoverCount(hand.filter((x) => x !== t), okey));
  const min = Math.min(...scores);
  return options.filter((_, i) => scores[i] === min);
}

/**
 * Decide the discard (or the finishing discard) for a 15-tile hand.
 * Never discards an okey unless it finishes the hand.
 * @param {{hand:object[], okey:object, nextPicked?:object[], nextDiscards?:object[], seen?:object[]}} view
 * @returns {{tileId:number, finish:boolean}}
 */
export function chooseDiscard(view) {
  const { hand, okey } = view;
  const solution = solveHand(hand, okey);
  const finishes = findFinishes(hand, okey, solution);
  if (finishes.length) return { tileId: pickFinish(finishes, okey).id, finish: true };
  const { pairs, singles } = findPairs(hand, okey);
  const pairsMode = pairs.length >= PAIRS_MODE_THRESHOLD && singles.length > 0;
  let candidates = pairsMode ? singles : solution.rest.filter((t) => !isWild(t, okey));
  if (!candidates.length) candidates = leastHarmful(hand, okey);
  let best = null;
  let bestScore = Infinity;
  for (const tile of candidates) {
    const own = pairsMode ? pairValue(tile, view) : keepValue(tile, candidates, hand, okey);
    const score = own * 2 + danger(faceIndexOf(tile, okey), view);
    if (score < bestScore || (score === bestScore && tile.id < best.id)) {
      best = tile;
      bestScore = score;
    }
  }
  return { tileId: best.id, finish: false };
}
