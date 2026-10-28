import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupKind, isValidGroup, checkWinningHand, isSevenPairs, findPairs, findFinishes, finishPenalty, chooseFinish } from '../src/groups.js';
import { tiles, okey, refWinning } from './helpers.js';

// Okey is red 8 unless stated; "R8" tiles are wild, "J" plays as red 8.
const OK = okey('R8');

const GROUP_CASES = [
  // sets
  ['R5 Y5 B5', 'set'],
  ['R5 Y5 B5 K5', 'set'],
  ['R5 R5 B5', null],
  ['R5 Y5 B5 R5', null],
  ['R5 Y5', null],
  ['R5 Y5 B5 K5 R8', null],
  ['R5 Y5 R8', 'set'],
  ['R8 Y5 B5', 'set'],
  ['R5 R8 R8', 'set'],
  ['R5 Y6 B5', null],
  ['Y8 B8 J', 'set'],
  ['Y8 B8 K8 J', 'set'],
  ['R8 Y8 J', 'set'],
  // runs
  ['R1 R2 R3', 'run'],
  ['B4 B5 B6 B7 B9', null],
  ['B4 B5 B6 B7 B8 B9', 'run'],
  ['K11 K12 K13 K1', 'run'],
  ['K12 K13 K1', 'run'],
  ['K13 K1 K2', null],
  ['K11 K12 K13 K1 K2', null],
  ['Y1 Y2 Y3 Y4 Y5 Y6 Y7 Y8 Y9 Y10 Y11 Y12 Y13', 'run'],
  ['R5 R6 Y7', null],
  ['R5 R7 R6', 'run'],
  ['B3 R8 B5', 'run'],
  ['R8 B4 B5', 'run'],
  ['B4 B5 R8', 'run'],
  ['B12 R8 B1', 'run'],
  ['B13 R8 B2', null],
  ['B1 R8 R8 B4', 'run'],
  ['B1 R8 B4', null],
  ['R7 J R9', 'run'],
  ['R6 R7 J', 'run'],
  ['B6 B7 J', null],
  ['B2 B2 B3', null],
  ['Y12 Y13 R8 R8', 'run'],
];

test(`group validation: ${GROUP_CASES.length} hand-made cases`, () => {
  assert.ok(GROUP_CASES.length >= 25);
  for (const [code, kind] of GROUP_CASES) {
    assert.equal(groupKind(tiles(code), OK), kind, code);
    assert.equal(isValidGroup(tiles(code), OK), kind !== null, code);
  }
});

// [description, okey, 14 tiles, expected kind or null]
const HANDS = [
  ['four groups, no okey', 'R8', 'R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 Y7', null],
  ['groups, no okey', 'R8', 'R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1', 'groups'],
  ['two sets of four and two runs of three', 'Y1', 'R4 Y4 B4 K4 R9 Y9 B9 K9 B1 B2 B3 K6 K7 K8', 'groups'],
  ['11-12-13-1 run', 'R8', 'Y11 Y12 Y13 Y1 R2 R3 R4 R5 B6 B7 B8 K6 K7 K8', 'groups'],
  ['13-1-2 is not a run', 'R8', 'Y13 Y1 Y2 R2 R3 R4 R5 B6 B7 B8 K6 K7 K8 K9', null],
  ['one long run of 14 positions', 'B8', 'K1 K2 K3 K4 K5 K6 K7 K8 K9 K10 K11 K12 K13 K1', 'groups'],
  ['one okey fills a run gap', 'R8', 'R8 Y2 Y4 B5 B6 B7 K10 K11 K12 K13 R1 Y1 B1 K1', 'groups'],
  ['one okey completes a set', 'R8', 'Y3 B3 R8 K5 K6 K7 K8 B10 B11 B12 R11 Y11 K11 B11', 'groups'],
  ['two okeys in one group', 'R8', 'R8 R8 Y2 K5 K6 K7 K8 B10 B11 B12 R11 Y11 K11 B11', 'groups'],
  ['two okeys in two groups', 'R8', 'R8 Y2 Y3 R8 B12 B1 K5 K6 K7 K8 R10 Y10 K10 B10', 'groups'],
  ['two okeys, one short', 'R8', 'R8 R8 Y2 K5 K6 K7 K9 B10 B11 B12 R11 Y11 K11 B3', null],
  ['false joker plays as red 8 in a run', 'R8', 'R6 R7 J R9 Y1 Y2 Y3 B4 B5 B6 K10 K11 K12 K13', 'groups'],
  ['false joker plays as red 8 in a set', 'R8', 'Y8 B8 J K2 K3 K4 B10 B11 B12 R11 Y11 K11 Y5 Y6', null],
  ['false joker in a set of four, complete', 'R8', 'Y8 B8 J K8 K2 K3 K4 B10 B11 B12 B13 R11 Y11 K11', 'groups'],
  ['false joker cannot be another number', 'R8', 'R6 J R9 R10 Y1 Y2 Y3 B4 B5 B6 K10 K11 K12 K13', null],
  ['false joker and okey together', 'R8', 'R6 R7 J R8 Y1 Y2 Y3 B4 B5 B6 K10 K11 K12 K13', 'groups'],
  ['two false jokers in a set', 'K3', 'J J Y3 B3 R5 R6 R7 Y9 Y10 Y11 Y12 B1 B2 B3', null],
  ['false joker as black 4 set', 'K4', 'J Y4 B4 R5 R6 R7 Y9 Y10 Y11 Y12 B1 B2 B3 K9', null],
  ['false joker as black 4 set, complete', 'K4', 'J Y4 B4 R5 R6 R7 Y9 Y10 Y11 Y12 K1 K2 K3 J', 'groups'],
  ['seven pairs', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 B3', 'pairs'],
  ['seven pairs with one okey', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 R8', 'pairs'],
  ['seven pairs with two okeys as a pair', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 R8 R8', 'pairs'],
  ['seven pairs with two okeys filling', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 B4 R8 R8', 'pairs'],
  ['false jokers as a pair', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 J J', 'pairs'],
  ['false joker pairs with an okey', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 J R8', 'pairs'],
  ['six pairs and two singles', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 B4', null],
  ['different colours are not a pair', 'R8', 'R1 Y1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 B3', null],
  ['five pairs one okey three singles', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 B4 K7 R8', null],
  ['13 tiles is not a hand', 'R8', 'R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3', null],
  ['set with a repeated colour', 'R8', 'R5 R5 Y5 B5 K5 K6 K7 B10 B11 B12 Y1 Y2 Y3 R13', null],
  ['near miss: run gap', 'R8', 'R1 R2 R4 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1', null],
  ['near miss: two groups of two', 'R8', 'R1 R2 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 Y4', null],
  ['groups of five and four plus run', 'Y13', 'R3 R4 R5 R6 R7 Y9 B9 K9 R9 B1 B2 B3 B4 B5', 'groups'],
  ['okey stands for wrap 1', 'R8', 'K11 K12 K13 R8 B2 B3 B4 Y6 Y7 Y8 R10 Y10 B10 K10', 'groups'],
  ['okey cannot extend past 1', 'R8', 'K12 K13 K1 R8 K2 B3 B4 Y6 Y7 Y8 R10 Y10 B10 B5', null],
];

test(`winning-hand check: ${HANDS.length} hand-made hands`, () => {
  assert.ok(HANDS.length >= 30);
  for (const [name, ok, code, kind] of HANDS) {
    const hand = tiles(code);
    const result = checkWinningHand(hand, okey(ok));
    assert.equal(result.ok, kind !== null, name);
    assert.equal(result.kind, kind, name);
    assert.equal(refWinning(hand, okey(ok)), kind !== null, `reference: ${name}`);
    if (result.ok) {
      assert.equal(result.groups.flat().length, 14, name);
      assert.deepEqual(new Set(result.groups.flat()), new Set(hand), name);
      if (kind === 'groups') for (const g of result.groups) assert.ok(isValidGroup(g, okey(ok)), name);
    }
  }
});

test('seven pairs helpers', () => {
  const hand = tiles('R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 R8');
  assert.equal(isSevenPairs(hand, OK), true);
  const { pairs, singles, wilds } = findPairs(hand, OK);
  assert.equal(pairs.length, 6);
  assert.equal(singles.length, 1);
  assert.equal(wilds.length, 1);
});

test('findFinishes lists only valid finishing discards and finds okey finishes', () => {
  const hand = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 Y9');
  const options = findFinishes(hand, OK);
  assert.ok(options.some((o) => o.tile.num === 9 && o.tile.color === 1));
  for (const o of options) assert.equal(checkWinningHand(hand.filter((t) => t !== o.tile), OK).ok, true);
  const withOkey = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 R8');
  const okeyOptions = findFinishes(withOkey, OK);
  assert.ok(okeyOptions.some((o) => o.tile.num === 8 && o.tile.color === 0));
  assert.deepEqual(findFinishes(tiles('R1 R2 R4 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 Y3 Y9'), OK), []);
});

test('finish penalty: 2, 4 with an okey discard or seven pairs, 8 with both', () => {
  const plain = tiles('Y3')[0];
  const wild = tiles('R8')[0];
  assert.equal(finishPenalty(plain, 'groups', OK), 2);
  assert.equal(finishPenalty(wild, 'groups', OK), 4);
  assert.equal(finishPenalty(plain, 'pairs', OK), 4);
  assert.equal(finishPenalty(wild, 'pairs', OK), 8);
});

test('chooseFinish keeps a finishing pick and falls back when the pick does not finish', () => {
  const hand = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 Y9');
  const options = findFinishes(hand, OK);
  const y9 = hand.find((t) => t.color === 1 && t.num === 9);
  const r1 = hand.find((t) => t.color === 0 && t.num === 1);
  assert.ok(!options.some((o) => o.tile === r1));
  assert.equal(chooseFinish(options, r1.id, OK).tile, y9);
  assert.equal(chooseFinish(options, -1, OK).tile, y9);
  assert.equal(chooseFinish([], r1.id, OK), null);
  const withOkey = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 R8');
  const okeyOptions = findFinishes(withOkey, OK);
  const wild = withOkey.find((t) => t.color === 0 && t.num === 8);
  const plain = okeyOptions.find((o) => o.tile !== wild);
  assert.ok(plain);
  assert.equal(chooseFinish(okeyOptions, plain.tile.id, OK).tile, plain.tile);
  assert.equal(chooseFinish(okeyOptions, -1, OK).tile, wild);
});
