import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { dealHands, okeyOf } from '../src/tiles.js';
import { solveHand } from '../src/solver.js';
import { emptyRack, syncRack, moveTile, layoutBlocks, sortRuns, sortPairs, stepCursor, ROW, SLOTS } from '../src/rack.js';

const used = (slots) => slots.filter((id) => id !== null).sort((a, b) => a - b);

test('syncRack keeps positions, drops gone tiles and places new ones', () => {
  const slots = emptyRack();
  slots[0] = 5;
  slots[4] = 9;
  const next = syncRack(slots, [9, 12]);
  assert.equal(next[0], null);
  assert.equal(next[4], 9);
  assert.equal(next[5], 12);
  assert.equal(syncRack(slots, [5, 9, 30], 20)[20], 30);
});

test('moveTile swaps two slots', () => {
  const slots = emptyRack();
  slots[0] = 1;
  const next = moveTile(slots, 0, 14);
  assert.equal(next[0], null);
  assert.equal(next[14], 1);
  assert.equal(slots[0], 1);
});

test('layoutBlocks keeps blocks in one row with gaps, and always fits', () => {
  const blocks = [[1, 2, 3], [4, 5, 6, 7], [8, 9, 10], [11, 12, 13]];
  const slots = layoutBlocks(blocks, [14, 15]);
  for (const block of blocks) {
    const at = block.map((id) => slots.indexOf(id));
    assert.equal(Math.floor(at[0] / ROW), Math.floor(at[at.length - 1] / ROW));
    at.forEach((pos, i) => i && assert.equal(pos, at[i - 1] + 1));
  }
  assert.equal(slots[3], null);
  const crowded = layoutBlocks([[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16], [17, 18]], [19, 20]);
  assert.equal(used(crowded).length, 20);
  assert.equal(crowded.length, SLOTS);
});

test('sortRuns and sortPairs place every tile of 200 seeded hands exactly once', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const { hands, indicator } = dealHands(createRng(seed), 0);
    const okey = okeyOf(indicator);
    const ids = hands[0].map((t) => t.id).sort((a, b) => a - b);
    assert.deepEqual(used(sortRuns(hands[0], okey)), ids);
    assert.deepEqual(used(sortPairs(hands[0], okey)), ids);
  }
});

test('sortRuns lays the solver groups out side by side', () => {
  const { hands, indicator } = dealHands(createRng(42), 0);
  const okey = okeyOf(indicator);
  const slots = sortRuns(hands[0], okey);
  for (const group of solveHand(hands[0], okey).groups) {
    const at = group.map((t) => slots.indexOf(t.id));
    at.forEach((pos, i) => i && assert.equal(pos, at[i - 1] + 1));
  }
});

test('stepCursor walks used slots and switches rows', () => {
  const slots = emptyRack();
  slots[1] = 10;
  slots[5] = 11;
  slots[ROW + 4] = 12;
  assert.equal(stepCursor(slots, -1, 'right'), 1);
  assert.equal(stepCursor(slots, 1, 'right'), 5);
  assert.equal(stepCursor(slots, 5, 'right'), ROW + 4);
  assert.equal(stepCursor(slots, 1, 'left'), 1);
  assert.equal(stepCursor(slots, 5, 'down'), ROW + 4);
  assert.equal(stepCursor(slots, ROW + 4, 'up'), 5);
  assert.equal(stepCursor(slots, 1, 'up'), 1);
  assert.equal(stepCursor(emptyRack(), -1, 'left'), -1);
});
