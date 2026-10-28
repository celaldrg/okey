import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, shuffle } from '../src/rng.js';
import { createTileSet, dealHands, okeyOf, faceOf, isWild, TILE_COUNT } from '../src/tiles.js';
import { createGame } from '../src/game.js';

test('tile set has 106 tiles: 1-13 in four colours twice, plus two false jokers', () => {
  const set = createTileSet();
  assert.equal(set.length, TILE_COUNT);
  assert.equal(new Set(set.map((t) => t.id)).size, 106);
  assert.equal(set.filter((t) => t.fake).length, 2);
  for (let color = 0; color < 4; color++) {
    for (let num = 1; num <= 13; num++) {
      assert.equal(set.filter((t) => !t.fake && t.color === color && t.num === num).length, 2);
    }
  }
});

test('1,000 seeded deals: 15+14+14+14 tiles, real indicator, 48 in the pile, 106 distinct ids', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const starter = seed % 4;
    const { hands, indicator, pile } = dealHands(createRng(seed), starter);
    hands.forEach((hand, seat) => assert.equal(hand.length, seat === starter ? 15 : 14));
    assert.equal(indicator.fake, false);
    assert.equal(pile.length, 48);
    const ids = [...hands.flat(), indicator, ...pile].map((t) => t.id);
    assert.equal(ids.length, 106);
    assert.equal(new Set(ids).size, 106);
    const ok = okeyOf(indicator);
    assert.equal(ok.color, indicator.color);
    assert.equal(ok.num, indicator.num === 13 ? 1 : indicator.num + 1);
  }
});

test('the same seed deals the same tiles', () => {
  const a = dealHands(createRng(42), 1);
  const b = dealHands(createRng(42), 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.pile.map((t) => t.id), dealHands(createRng(43), 1).pile.map((t) => t.id));
});

test('a false joker on top is never the indicator', () => {
  // Find seeds whose shuffle puts a false joker last, then check the deal skips it.
  let checked = 0;
  for (let seed = 1; checked < 3 && seed < 20000; seed++) {
    const shuffled = shuffle(createTileSet(), createRng(seed));
    if (!shuffled[shuffled.length - 1].fake) continue;
    checked++;
    const { indicator } = dealHands(createRng(seed), 0);
    assert.equal(indicator.fake, false);
  }
  assert.equal(checked, 3);
});

test('okey is one higher in the indicator colour; 13 wraps to 1', () => {
  assert.deepEqual(okeyOf({ color: 0, num: 7, fake: false }), { color: 0, num: 8 });
  assert.deepEqual(okeyOf({ color: 2, num: 13, fake: false }), { color: 2, num: 1 });
  assert.deepEqual(okeyOf({ color: 3, num: 1, fake: false }), { color: 3, num: 2 });
  assert.throws(() => okeyOf({ color: -1, num: 0, fake: true }));
});

test('okey tiles are wild; false jokers stand for the okey face', () => {
  const ok = { color: 0, num: 8 };
  const redEight = { id: 7, color: 0, num: 8, fake: false };
  const joker = { id: 104, color: -1, num: 0, fake: true };
  assert.equal(isWild(redEight, ok), true);
  assert.equal(faceOf(redEight, ok), null);
  assert.equal(isWild(joker, ok), false);
  assert.deepEqual(faceOf(joker, ok), { color: 0, num: 8 });
  assert.deepEqual(faceOf({ id: 3, color: 0, num: 4, fake: false }, ok), { color: 0, num: 4 });
});

test('createGame rotates the starter each deal', () => {
  const game = createGame({ seed: 9, starter: 2 });
  assert.equal(game.starter, 2);
  assert.equal(game.hands[2].length, 15);
  assert.equal(game.phase, 'discard');
  assert.equal(game.pile.length, 48);
});
