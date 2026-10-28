/**
 * Deterministic mid-deal state for the README screenshot (?demo).
 */
import { createRng, shuffle } from './rng.js';
import { createTileSet, okeyOf } from './tiles.js';
import { createGame } from './game.js';

const R = 0;
const Y = 1;
const B = 2;
const K = 3;

/** Your rack: a set of 8s, a black run 10-13, a yellow run 5-7, red 3-4 waiting, an okey and a spare. */
const DEMO_HAND = [
  [R, 8], [Y, 8], [K, 8],
  [K, 10], [K, 11], [K, 12], [K, 13],
  [Y, 5], [Y, 6], [Y, 7],
  [R, 3], [R, 4],
  [B, 5],
  [B, 11],
];
const DEMO_INDICATOR = [B, 4];
const DEMO_DISCARDS = [0, 3, 2, 3];

/**
 * Build a deterministic, good-looking mid-game: deal 3 of 10, your turn to draw,
 * two finished deals in the score table.
 * @returns {object} Game state usable with every game.js function.
 */
export function buildDemoGame() {
  const game = createGame({ seed: 2026, deals: 10 });
  const pool = createTileSet();
  const take = ([color, num]) => pool.splice(pool.findIndex((t) => !t.fake && t.color === color && t.num === num), 1)[0];
  const indicator = take(DEMO_INDICATOR);
  const mine = DEMO_HAND.map(take);
  shuffle(pool, createRng(7));
  const hands = [mine, pool.splice(0, 14), pool.splice(0, 14), pool.splice(0, 14)];
  const discards = DEMO_DISCARDS.map((n) => pool.splice(0, n));
  Object.assign(game, {
    dealNo: 3,
    starter: 2,
    scores: [18, 14, 16, 14],
    history: [
      { deal: 1, winner: 2, kind: 'groups', okeyFinish: false, deltas: [-2, -2, 0, -2], scores: [18, 18, 20, 18] },
      { deal: 2, winner: 0, kind: 'groups', okeyFinish: true, deltas: [0, -4, -4, -4], scores: [18, 14, 16, 14] },
    ],
    hands,
    indicator,
    okey: okeyOf(indicator),
    pile: pool,
    discards,
    picked: [[], [], [hands[2][0]], []],
    discarded: [true, true, true, true],
    shown: [false, false, false, false],
    dealDeltas: [0, 0, 0, 0],
    turn: 0,
    phase: 'draw',
    takeable: true,
    result: null,
    lastMove: { type: 'discard', seat: 3, tile: discards[3][discards[3].length - 1] },
  });
  return game;
}
