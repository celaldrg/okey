import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randInt } from '../src/rng.js';
import { isWild, identicalTiles } from '../src/tiles.js';
import {
  createGame, aiStep, isAiTurn, legalDraws, takeableTile, drawTile, discardTile, finishHand,
  showIndicator, canShowIndicator, startNextDeal, getState, prevSeat, START_SCORE,
} from '../src/game.js';
import { findFinishes, checkWinningHand } from '../src/groups.js';
import { chooseDraw, chooseDiscard } from '../src/ai.js';
import { buildDemoGame } from '../src/demo.js';
import { refWinning, tiles } from './helpers.js';

function tileTotal(game) {
  const finish = game.result && game.result.tile ? 1 : 0;
  return game.hands.flat().length + game.pile.length + game.discards.flat().length + 1 + finish;
}

/** Run one AI step and check, independently of the game code, that it was legal. */
function checkedAiStep(game) {
  const seat = game.turn;
  const phase = game.phase;
  const hand = game.hands[seat].slice();
  const sizeBefore = hand.length;
  const pileTop = game.pile[game.pile.length - 1];
  const takeable = takeableTile(game);
  const move = aiStep(game);
  assert.equal(move.seat, seat);
  if (move.type === 'show') {
    assert.ok(hand.some((t) => identicalTiles(t, game.indicator)));
    return move;
  }
  if (phase === 'draw') {
    assert.equal(sizeBefore, 14);
    assert.equal(game.hands[seat].length, 15);
    const drawn = game.hands[seat][14];
    if (move.type === 'draw') assert.equal(drawn, pileTop);
    else {
      assert.equal(move.type, 'take');
      assert.equal(drawn, takeable);
    }
    return move;
  }
  assert.equal(sizeBefore, 15);
  assert.ok(hand.includes(move.tile));
  if (move.type === 'finish') {
    assert.ok(refWinning(game.hands[seat], game.okey), 'finish passes the winning-hand check');
    assert.equal(checkWinningHand(game.hands[seat], game.okey).ok, true);
  } else {
    assert.ok(move.type === 'discard' || move.type === 'exhausted');
    assert.equal(isWild(move.tile, game.okey), false, 'computer never throws an okey away');
  }
  assert.equal(game.hands[seat].length, 14);
  return move;
}

test('200 seeded deals with four computer players use only legal moves', () => {
  let finishes = 0;
  let exhausted = 0;
  for (let i = 0; i < 200; i++) {
    const game = createGame({ seed: 1000 + i, deals: 5, starter: i % 4, kinds: ['ai', 'ai', 'ai', 'ai'] });
    let steps = 0;
    while (isAiTurn(game)) {
      const move = checkedAiStep(game);
      assert.equal(tileTotal(game), 106);
      if (game.phase === 'draw') {
        game.hands.forEach((h, s) => assert.equal(h.length, 14, `seat ${s}`));
      }
      if (move.type === 'finish') finishes++;
      steps++;
      assert.ok(steps < 500);
    }
    assert.equal(game.phase, 'dealOver');
    if (game.result.winner === null) {
      exhausted++;
      assert.equal(game.pile.length, 0);
      assert.deepEqual(game.scores, [20, 20, 20, 20].map((s, k) => s + game.history[0].deltas[k]));
    }
  }
  assert.equal(finishes + exhausted, 200);
  assert.ok(finishes > 100, `finished deals: ${finishes}`);
});

/** A random-legal player: random source, random discard, finishes only if it happens to be able to. */
function randomTurn(game, rng) {
  const seat = game.turn;
  if (game.phase === 'draw') {
    const sources = legalDraws(game);
    drawTile(game, seat, sources[randInt(rng, sources.length)]);
    return;
  }
  const hand = game.hands[seat];
  const options = findFinishes(hand, game.okey);
  if (options.length) finishHand(game, seat, options[0].tile.id);
  else discardTile(game, seat, hand[randInt(rng, hand.length)].id);
}

test('one computer player wins more deals than three random players together (200 deals)', (t) => {
  const wins = { computer: 0, random: 0, none: 0 };
  const rng = createRng(77);
  for (let i = 0; i < 200; i++) {
    const game = createGame({ seed: 5000 + i, deals: 5, starter: i % 4, kinds: ['ai', 'human', 'human', 'human'] });
    while (game.phase === 'draw' || game.phase === 'discard') {
      if (isAiTurn(game)) checkedAiStep(game);
      else randomTurn(game, rng);
    }
    const winner = game.result.winner;
    if (winner === null) wins.none++;
    else if (winner === 0) wins.computer++;
    else wins.random++;
  }
  const message = `computer ${wins.computer}, random players ${wins.random}, no winner ${wins.none}`;
  t.diagnostic(message);
  assert.ok(wins.computer > wins.random, message);
});

test('scoring: finishing costs the others 2, 4 or 8 points', () => {
  const game = createGame({ seed: 3, starter: 0 });
  game.okey = { color: 0, num: 8 };
  game.hands[0] = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 R8');
  const okeyTile = game.hands[0][14];
  const strict = createGame({ seed: 3, starter: 0 });
  strict.okey = { color: 0, num: 8 };
  strict.hands[0] = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 Y7');
  const refused = finishHand(strict, 0, strict.hands[0][0].id);
  assert.equal(refused.ok, false);
  assert.equal(refused.rest.length, 3);
  assert.equal(strict.phase, 'discard');
  assert.equal(strict.hands[0].length, 15);
  const result = finishHand(game, 0, okeyTile.id);
  assert.equal(result.ok, true);
  assert.deepEqual(game.scores, [20, 16, 16, 16]);
  assert.equal(game.history[0].okeyFinish, true);
  assert.equal(game.phase, 'dealOver');

  const pairs = createGame({ seed: 4, starter: 1 });
  pairs.okey = { color: 0, num: 8 };
  pairs.hands[1] = tiles('R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 Y12 B3 B3 K7');
  finishHand(pairs, 1, pairs.hands[1][14].id);
  assert.deepEqual(pairs.scores, [16, 20, 16, 16]);
  assert.equal(pairs.history[0].kind, 'pairs');
});

test('showing the indicator twin costs every other player 1 point, only before the first discard', () => {
  const game = createGame({ seed: 11, starter: 0 });
  const twin = { id: 999, color: game.indicator.color, num: game.indicator.num, fake: false };
  game.hands[0][0] = twin;
  assert.equal(canShowIndicator(game, 0), true);
  assert.equal(getState(game).canShow, true);
  showIndicator(game, 0);
  assert.deepEqual(game.scores, [20, 19, 19, 19]);
  assert.equal(canShowIndicator(game, 0), false);
  assert.throws(() => showIndicator(game, 0));
  const late = createGame({ seed: 12, starter: 0 });
  late.hands[0][0] = { id: 999, color: late.indicator.color, num: late.indicator.num, fake: false };
  discardTile(late, 0, late.hands[0][1].id);
  assert.equal(canShowIndicator(late, 0), false);
});

test('illegal moves are rejected', () => {
  const game = createGame({ seed: 21, starter: 0 });
  assert.throws(() => drawTile(game, 0, 'pile'), /cannot act/);
  assert.throws(() => discardTile(game, 1, game.hands[1][0].id));
  assert.throws(() => discardTile(game, 0, game.hands[1][0].id), /not in hand/);
  const thrown = discardTile(game, 0, game.hands[0][0].id);
  assert.equal(game.turn, 1);
  assert.deepEqual(legalDraws(game), ['pile', 'discard']);
  assert.equal(takeableTile(game), thrown);
  assert.throws(() => drawTile(game, 1, 'top'));
  drawTile(game, 1, 'discard');
  assert.equal(game.lastMove.type, 'take');
  assert.equal(game.lastMove.from, prevSeat(1));
  assert.equal(game.picked[1][0], thrown);
  assert.equal(takeableTile(game), null);
});

test('an empty center pile ends the deal without a winner; games end after the set number of deals', () => {
  const game = createGame({ seed: 31, deals: 5, starter: 0, kinds: ['ai', 'ai', 'ai', 'ai'] });
  game.pile.length = 1;
  while (isAiTurn(game)) aiStep(game);
  assert.equal(game.history[0].winner, game.result.winner);
  if (game.result.winner === null) assert.equal(game.pile.length, 0);
  for (let d = 2; d <= 5; d++) {
    startNextDeal(game);
    assert.equal(game.dealNo, d);
    assert.equal(game.starter, (d - 1) % 4);
    while (isAiTurn(game)) aiStep(game);
    if (game.phase === 'gameOver') break;
  }
  assert.equal(game.phase, 'gameOver');
  assert.throws(() => startNextDeal(game));
  assert.equal(createGame({ deals: 7 }).totalDeals, 10);
});

test('a game ends early when a player reaches 0 points', () => {
  const game = createGame({ seed: 41, starter: 0 });
  game.scores = [START_SCORE, 2, 5, 5];
  game.okey = { color: 0, num: 8 };
  game.hands[0] = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 Y7');
  finishHand(game, 0, game.hands[0][14].id);
  assert.equal(game.phase, 'gameOver');
});

test('computer decisions: takes a useful discard, keeps okeys, goes for pairs', () => {
  const okey = { color: 0, num: 8 };
  const hand = tiles('R1 R2 Y5 B5 K5 B9 B10 B11 K11 K12 K13 Y1 Y7 K3');
  assert.equal(chooseDraw({ hand, okey, takeable: tiles('R3')[0] }), 'discard');
  assert.equal(chooseDraw({ hand, okey, takeable: tiles('Y11')[0] }), 'pile');
  assert.equal(chooseDraw({ hand, okey, takeable: null }), 'pile');
  const withOkey = tiles('R8 R1 R2 Y5 B5 K5 B9 B10 B11 K11 K12 K13 Y1 Y7 K3');
  const choice = chooseDiscard({ hand: withOkey, okey });
  assert.equal(choice.finish, false);
  assert.notEqual(choice.tileId, withOkey[0].id);
  const pairsHand = tiles('R1 R1 Y5 Y5 B9 B9 K13 K13 R2 R2 Y12 B3 K7 Y3');
  assert.equal(chooseDraw({ hand: pairsHand, okey, takeable: tiles('Y12')[0] }), 'discard');
  const finishing = tiles('R1 R2 R3 Y5 B5 K5 B9 B10 B11 B12 K11 K12 K13 K1 R8');
  assert.deepEqual(chooseDiscard({ hand: finishing, okey }), { tileId: finishing[14].id, finish: true });
});

test('?demo state: mid-deal, rack nearly finished, okey in the rack, two deals in the score table', () => {
  const game = buildDemoGame();
  const state = getState(game);
  assert.equal(state.phase, 'draw');
  assert.equal(state.turn, 0);
  assert.equal(state.history.length, 2);
  assert.equal(state.hands[0].length, 14);
  assert.ok(state.hands[0].some((t) => isWild(t, game.okey)));
  assert.ok(state.discards.slice(1).every((d) => d.length >= 2));
  assert.ok(state.takeable);
  assert.equal(tileTotal(game), 106);
  assert.equal(new Set([...game.hands.flat(), ...game.pile, ...game.discards.flat(), game.indicator].map((t) => t.id)).size, 106);
  assert.equal(checkWinningHand(state.hands[0], game.okey).rest.length, 1);
  assert.deepEqual(buildDemoGame().hands, game.hands);
  game.picked.forEach((picks, seat) => picks.forEach((tile) => assert.ok(game.hands[seat].includes(tile), 'picked tiles are held by the picker')));
  drawTile(game, 0, 'pile');
  assert.equal(game.hands[0].length, 15);
});
