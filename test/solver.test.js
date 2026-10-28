import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, shuffle } from '../src/rng.js';
import { createTileSet, okeyOf, isWild } from '../src/tiles.js';
import { solveHand, leftoverCount, isPartial } from '../src/solver.js';
import { isValidGroup } from '../src/groups.js';
import { tiles, okey, refMinLeftover } from './helpers.js';

/** Seeded random 14-tile hand; every fourth hand gets one or two okeys. */
function randomHand(seed) {
  const rng = createRng(seed);
  const set = shuffle(createTileSet(), rng);
  const indicator = set.find((t) => !t.fake);
  const ok = okeyOf(indicator);
  const pool = set.filter((t) => t !== indicator);
  const wilds = pool.filter((t) => isWild(t, ok));
  const others = pool.filter((t) => !isWild(t, ok));
  const wanted = seed % 4 === 0 ? 1 + (seed % 8 === 0 ? 1 : 0) : 0;
  // Bias towards related tiles: draw from two colours to get more groups.
  const colors = [seed % 4, (seed + 1) % 4];
  const related = others.filter((t) => t.fake || colors.includes(t.color));
  const hand = [...wilds.slice(0, wanted), ...(seed % 2 ? related : others)].slice(0, 14);
  return { hand, ok };
}

test('solver leftover equals an exhaustive reference search on 200 seeded 14-tile hands', () => {
  let withGroups = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const { hand, ok } = randomHand(seed);
    assert.equal(hand.length, 14);
    const expected = refMinLeftover(hand, ok);
    const solution = solveHand(hand, ok);
    assert.equal(solution.leftover, expected, `seed ${seed}`);
    assert.equal(leftoverCount(hand, ok), expected, `quick, seed ${seed}`);
    assert.equal(solution.rest.length, expected, `rest, seed ${seed}`);
    const used = [...solution.groups.flat(), ...solution.rest];
    assert.equal(new Set(used).size, 14, `partition, seed ${seed}`);
    for (const g of solution.groups) assert.ok(isValidGroup(g, ok), `group valid, seed ${seed}`);
    if (expected < 14) withGroups++;
  }
  assert.ok(withGroups > 150, `hands with at least one group: ${withGroups}`);
});

test('solver handles wilds, false jokers and the 13-1 wrap', () => {
  const ok = okey('R8');
  assert.equal(solveHand(tiles('K11 K12 K13 K1'), ok).leftover, 0);
  assert.equal(solveHand(tiles('K13 K1 K2'), ok).leftover, 3);
  assert.equal(solveHand(tiles('R6 R7 J'), ok).leftover, 0);
  assert.equal(solveHand(tiles('B2 R8 B4 Y9'), ok).leftover, 1);
  assert.equal(solveHand(tiles('B2 R8 R8'), ok).leftover, 0);
  assert.equal(solveHand(tiles('R8 R8'), ok).leftover, 2);
});

test('ties keep leftover tiles that are one tile away from a group', () => {
  const ok = okey('R8');
  assert.equal(solveHand(tiles('B3 B4 B5 B6 B7 Y9 K1'), ok).leftover, 2);
  // Run Y4-Y6 leaves Y2 R6 B6 (two near tiles); set of 6s leaves Y2 Y4 Y5 (three near tiles).
  const solution = solveHand(tiles('Y2 Y4 Y5 Y6 R6 B6'), ok);
  assert.equal(solution.leftover, 3);
  assert.equal(solution.near, 3);
  assert.deepEqual(solution.rest.map((t) => t.num).sort((a, b) => a - b), [2, 4, 5]);
  assert.equal(isPartial(0, 13), true);
  assert.equal(isPartial(0, 0), false);
  assert.equal(isPartial(0, 12), true);
  assert.equal(isPartial(0, 3), false);
});
