/**
 * Tile model, okey determination and dealing.
 * A tile is { id, color, num, fake }: color 0-3 (red, yellow, blue, black),
 * num 1-13; the two false jokers have fake = true, color -1 and num 0.
 */
import { shuffle } from './rng.js';

/** Colour names in tile order. */
export const COLORS = Object.freeze(['red', 'yellow', 'blue', 'black']);
/** Total number of tiles in a set. */
export const TILE_COUNT = 106;
/** Highest tile number. */
export const MAX_NUM = 13;
/** Number of players at the table. */
export const SEATS = 4;

/**
 * Build the full 106-tile set with stable ids 0-105.
 * @returns {{id:number,color:number,num:number,fake:boolean}[]}
 */
export function createTileSet() {
  const tiles = [];
  for (let copy = 0; copy < 2; copy++) {
    for (let color = 0; color < 4; color++) {
      for (let num = 1; num <= MAX_NUM; num++) {
        tiles.push({ id: copy * 52 + color * 13 + num - 1, color, num, fake: false });
      }
    }
  }
  tiles.push({ id: 104, color: -1, num: 0, fake: true }, { id: 105, color: -1, num: 0, fake: true });
  return tiles;
}

/**
 * The okey face for an indicator: same colour, one number higher, 13 wraps to 1.
 * @param {{color:number,num:number,fake:boolean}} indicator
 * @returns {{color:number,num:number}}
 */
export function okeyOf(indicator) {
  if (indicator.fake) throw new Error('A false joker cannot be the indicator');
  return { color: indicator.color, num: indicator.num === MAX_NUM ? 1 : indicator.num + 1 };
}

/**
 * True when the tile is one of the two wild okey tiles.
 * @param {{color:number,num:number,fake:boolean}} tile
 * @param {{color:number,num:number}} okey
 * @returns {boolean}
 */
export function isWild(tile, okey) {
  return !tile.fake && tile.color === okey.color && tile.num === okey.num;
}

/**
 * The face a tile plays as: null for a wild okey, the okey face for a false joker.
 * @param {{color:number,num:number,fake:boolean}} tile
 * @param {{color:number,num:number}} okey
 * @returns {{color:number,num:number}|null}
 */
export function faceOf(tile, okey) {
  if (isWild(tile, okey)) return null;
  if (tile.fake) return { color: okey.color, num: okey.num };
  return { color: tile.color, num: tile.num };
}

/**
 * Face index 0-51 (color * 13 + num - 1) of a tile, or -1 for a wild okey.
 * @param {{color:number,num:number,fake:boolean}} tile
 * @param {{color:number,num:number}} okey
 * @returns {number}
 */
export function faceIndexOf(tile, okey) {
  const face = faceOf(tile, okey);
  return face ? face.color * 13 + face.num - 1 : -1;
}

/**
 * True when two tiles are physically identical (same colour and number, or both false jokers).
 * @param {{color:number,num:number,fake:boolean}} a
 * @param {{color:number,num:number,fake:boolean}} b
 * @returns {boolean}
 */
export function identicalTiles(a, b) {
  return a.fake === b.fake && a.color === b.color && a.num === b.num;
}

/**
 * Shuffle and deal one round. The starter gets 15 tiles, the others 14;
 * the indicator is never a false joker; the rest forms the center pile (top = last).
 * @param {() => number} rng Seeded RNG.
 * @param {number} starter Seat 0-3 that starts.
 * @returns {{hands: object[][], indicator: object, pile: object[]}}
 */
export function dealHands(rng, starter) {
  const tiles = shuffle(createTileSet(), rng);
  let at = tiles.length - 1;
  while (tiles[at].fake) at--;
  const [indicator] = tiles.splice(at, 1);
  const hands = [[], [], [], []];
  let next = 0;
  for (let i = 0; i < SEATS; i++) {
    const seat = (starter + i) % SEATS;
    const size = i === 0 ? 15 : 14;
    hands[seat] = tiles.slice(next, next + size);
    next += size;
  }
  return { hands, indicator, pile: tiles.slice(next) };
}
