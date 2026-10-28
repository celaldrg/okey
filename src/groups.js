/**
 * Group validation, pairs and the winning-hand check.
 */
import { faceOf, isWild, faceIndexOf } from './tiles.js';
import { solveHand, leftoverCount } from './solver.js';

/** Highest run position: 14 stands for a 1 placed after 13. */
const TOP = 14;

function isSet(faces, size) {
  if (size > 4) return false;
  const colors = new Set(faces.map((f) => f.color));
  return colors.size === faces.length && faces.every((f) => f.num === faces[0].num);
}

function isRun(faces, size) {
  if (size > TOP || faces.some((f) => f.color !== faces[0].color)) return false;
  const ones = faces.filter((f) => f.num === 1).length;
  const others = faces.filter((f) => f.num !== 1).map((f) => f.num);
  if (new Set(others).size !== others.length) return false;
  for (let start = 1; start + size - 1 <= TOP; start++) {
    const end = start + size - 1;
    const onePlaces = (start === 1 ? 1 : 0) + (end === TOP ? 1 : 0);
    if (ones <= onePlaces && others.every((n) => n >= start && n <= end)) return true;
  }
  return false;
}

/**
 * Classify a group: 'set' (3-4 tiles, one number, different colours),
 * 'run' (3+ consecutive numbers of one colour, 1 may follow 13 at the end) or null.
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {'set'|'run'|null}
 */
export function groupKind(tiles, okey) {
  if (tiles.length < 3) return null;
  const faces = tiles.map((t) => faceOf(t, okey)).filter(Boolean);
  if (faces.length === 0) return tiles.length <= 4 ? 'set' : null;
  if (isSet(faces, tiles.length)) return 'set';
  if (isRun(faces, tiles.length)) return 'run';
  return null;
}

/**
 * True when the tiles form one valid set or run.
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {boolean}
 */
export function isValidGroup(tiles, okey) {
  return groupKind(tiles, okey) !== null;
}

/**
 * Split a hand into pairs of identical faces, single tiles and wild okeys.
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {{pairs: object[][], singles: object[], wilds: object[]}}
 */
export function findPairs(tiles, okey) {
  const byFace = new Map();
  const wilds = [];
  for (const tile of tiles) {
    const f = faceIndexOf(tile, okey);
    if (f < 0) wilds.push(tile);
    else byFace.set(f, [...(byFace.get(f) || []), tile]);
  }
  const pairs = [];
  const singles = [];
  for (const f of [...byFace.keys()].sort((a, b) => a - b)) {
    const list = byFace.get(f);
    for (let i = 0; i + 1 < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
    if (list.length % 2) singles.push(list[list.length - 1]);
  }
  return { pairs, singles, wilds };
}

/**
 * True when 14 tiles make seven pairs of identical tiles (wilds pair with anything).
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {boolean}
 */
export function isSevenPairs(tiles, okey) {
  if (tiles.length !== 14) return false;
  const { singles, wilds } = findPairs(tiles, okey);
  return singles.length <= wilds.length;
}

function pairGroups(tiles, okey) {
  const { pairs, singles, wilds } = findPairs(tiles, okey);
  const spare = wilds.slice();
  const groups = pairs.concat(singles.map((t) => [t, spare.pop()]));
  for (let i = 0; i + 1 < spare.length; i += 2) groups.push([spare[i], spare[i + 1]]);
  return groups;
}

/**
 * Check whether 14 tiles form a finished hand: all in groups, or seven pairs.
 * Seven pairs is reported first because it scores double.
 * @param {object[]} tiles
 * @param {{color:number,num:number}} okey
 * @returns {{ok:boolean, kind:'pairs'|'groups'|null, groups:object[][], rest:object[]}}
 */
export function checkWinningHand(tiles, okey) {
  if (tiles.length !== 14) return { ok: false, kind: null, groups: [], rest: tiles.slice() };
  if (isSevenPairs(tiles, okey)) return { ok: true, kind: 'pairs', groups: pairGroups(tiles, okey), rest: [] };
  const solution = solveHand(tiles, okey);
  const ok = solution.leftover === 0;
  return { ok, kind: ok ? 'groups' : null, groups: solution.groups, rest: solution.rest };
}

/**
 * Tiles whose discard from a 15-tile hand leaves a finished hand.
 * Every listed option is valid; okey discards are always checked.
 * @param {object[]} tiles 15 tiles.
 * @param {{color:number,num:number}} okey
 * @param {{leftover:number, rest:object[]}} [solution] Precomputed solveHand(tiles).
 * @returns {{tile:object, kind:'pairs'|'groups'}[]}
 */
export function findFinishes(tiles, okey, solution = solveHand(tiles, okey)) {
  const options = [];
  if (tiles.length !== 15) return options;
  const without = (tile) => tiles.filter((t) => t !== tile);
  const { singles, wilds } = findPairs(tiles, okey);
  if (singles.length <= wilds.length + 1) {
    for (const tile of [...singles, ...wilds]) {
      if (isSevenPairs(without(tile), okey)) options.push({ tile, kind: 'pairs' });
    }
  }
  if (solution.leftover <= 1) {
    const pool = solution.leftover === 1 ? [solution.rest[0], ...wilds] : tiles;
    for (const tile of new Set(pool)) {
      if (leftoverCount(without(tile), okey) === 0) options.push({ tile, kind: 'groups' });
    }
  }
  return options;
}

/**
 * Points each other player loses on a finish: 2, doubled for an okey discard,
 * doubled again for seven pairs.
 * @param {object} tile The finishing discard.
 * @param {'pairs'|'groups'} kind
 * @param {{color:number,num:number}} okey
 * @returns {number} 2, 4 or 8.
 */
export function finishPenalty(tile, kind, okey) {
  return 2 * (isWild(tile, okey) ? 2 : 1) * (kind === 'pairs' ? 2 : 1);
}

/**
 * The finishing discard to use: the chosen tile when it finishes the hand,
 * otherwise the option that costs the others the most points.
 * @param {{tile:object, kind:'pairs'|'groups'}[]} options From findFinishes.
 * @param {number} chosenId Id of the picked tile, or -1 for none.
 * @param {{color:number,num:number}} okey
 * @returns {{tile:object, kind:'pairs'|'groups'}|null} null when nothing finishes.
 */
export function chooseFinish(options, chosenId, okey) {
  const score = (o) => finishPenalty(o.tile, o.kind, okey);
  const own = options.filter((o) => o.tile.id === chosenId);
  const pool = own.length ? own : options;
  if (!pool.length) return null;
  return pool.reduce((best, o) => (score(o) > score(best) ? o : best));
}
