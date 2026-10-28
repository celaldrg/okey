/**
 * Okey game state machine: deals, turns, draws, discards, finishes,
 * indicator shows and scoring. Pure: no DOM, no storage.
 *
 * Seats: 0 = you (bottom), 1 = right, 2 = top, 3 = left. Play passes
 * counter-clockwise, so seat s plays after seat s - 1 and takes its discard.
 * Phases: 'draw' -> 'discard' -> next seat ... -> 'dealOver' | 'gameOver'.
 */
import { createRng } from './rng.js';
import { dealHands, okeyOf, identicalTiles, isWild, SEATS } from './tiles.js';
import { checkWinningHand, finishPenalty } from './groups.js';
import { chooseDraw, chooseDiscard } from './ai.js';

/** Points every player starts a game with. */
export const START_SCORE = 20;
/** Allowed game lengths in deals. */
export const DEAL_OPTIONS = Object.freeze([5, 10, 20]);

/**
 * Seat that plays after the given seat.
 * @param {number} seat
 * @returns {number}
 */
export function nextSeat(seat) {
  return (seat + 1) % SEATS;
}

/**
 * Seat that played before the given seat (whose discard it may take).
 * @param {number} seat
 * @returns {number}
 */
export function prevSeat(seat) {
  return (seat + SEATS - 1) % SEATS;
}

/**
 * Create a game and deal its first round.
 * @param {{seed?:number, deals?:number, starter?:number, kinds?:('human'|'ai')[]}} [opts]
 * @returns {object} Mutable game state.
 */
export function createGame(opts = {}) {
  const deals = DEAL_OPTIONS.includes(opts.deals) ? opts.deals : 10;
  const game = {
    seed: opts.seed ?? 1,
    rng: createRng(opts.seed ?? 1),
    totalDeals: deals,
    kinds: opts.kinds ? opts.kinds.slice() : ['human', 'ai', 'ai', 'ai'],
    scores: Array(SEATS).fill(START_SCORE),
    history: [],
    dealNo: 0,
    starter: ((opts.starter ?? 0) + SEATS - 1) % SEATS,
  };
  beginDeal(game);
  return game;
}

function beginDeal(game) {
  game.dealNo += 1;
  game.starter = nextSeat(game.starter);
  const { hands, indicator, pile } = dealHands(game.rng, game.starter);
  Object.assign(game, {
    hands,
    indicator,
    okey: okeyOf(indicator),
    pile,
    discards: [[], [], [], []],
    picked: [[], [], [], []],
    discarded: Array(SEATS).fill(false),
    shown: Array(SEATS).fill(false),
    dealDeltas: Array(SEATS).fill(0),
    turn: game.starter,
    phase: 'discard',
    takeable: false,
    result: null,
    lastMove: { type: 'deal', seat: game.starter, tile: null },
  });
}

/**
 * Deal the next round after a finished deal.
 * @param {object} game
 */
export function startNextDeal(game) {
  if (game.phase !== 'dealOver') throw new Error('The deal is not over');
  beginDeal(game);
}

function assertTurn(game, seat, phase) {
  if (game.phase !== phase || game.turn !== seat) throw new Error(`Seat ${seat} cannot act in phase ${game.phase}`);
}

function handIndex(game, seat, tileId) {
  const index = game.hands[seat].findIndex((t) => t.id === tileId);
  if (index < 0) throw new Error(`Tile ${tileId} is not in hand ${seat}`);
  return index;
}

/**
 * The previous player's last discard when the current player may take it.
 * @param {object} game
 * @returns {object|null}
 */
export function takeableTile(game) {
  if (game.phase !== 'draw' || !game.takeable) return null;
  const pile = game.discards[prevSeat(game.turn)];
  return pile[pile.length - 1] || null;
}

/**
 * Legal draw sources for the current player.
 * @param {object} game
 * @returns {('pile'|'discard')[]}
 */
export function legalDraws(game) {
  if (game.phase !== 'draw') return [];
  const sources = [];
  if (game.pile.length) sources.push('pile');
  if (takeableTile(game)) sources.push('discard');
  return sources;
}

/**
 * Draw a tile from the center pile or take the previous player's discard.
 * @param {object} game
 * @param {number} seat
 * @param {'pile'|'discard'} source
 * @returns {object} The drawn tile.
 */
export function drawTile(game, seat, source) {
  assertTurn(game, seat, 'draw');
  if (!legalDraws(game).includes(source)) throw new Error(`Cannot draw from ${source}`);
  let tile;
  if (source === 'pile') tile = game.pile.pop();
  else {
    tile = game.discards[prevSeat(seat)].pop();
    game.picked[seat].push(tile);
  }
  game.hands[seat].push(tile);
  game.phase = 'discard';
  game.takeable = false;
  game.lastMove = { type: source === 'pile' ? 'draw' : 'take', seat, tile: source === 'pile' ? null : tile, from: prevSeat(seat) };
  return tile;
}

/**
 * Discard a tile for the next player. Ends the deal without a winner when
 * the center pile is empty.
 * @param {object} game
 * @param {number} seat
 * @param {number} tileId
 * @returns {object} The discarded tile.
 */
export function discardTile(game, seat, tileId) {
  assertTurn(game, seat, 'discard');
  const [tile] = game.hands[seat].splice(handIndex(game, seat, tileId), 1);
  game.discards[seat].push(tile);
  game.discarded[seat] = true;
  game.lastMove = { type: 'discard', seat, tile };
  if (game.pile.length === 0) {
    endDeal(game, { winner: null, kind: null, okeyFinish: false, tile: null, groups: [] });
    return tile;
  }
  game.turn = nextSeat(seat);
  game.phase = 'draw';
  game.takeable = true;
  return tile;
}

/**
 * Try to finish by discarding tileId face down. Refuses (without changing
 * anything) when the other 14 tiles do not form a finished hand.
 * @param {object} game
 * @param {number} seat
 * @param {number} tileId
 * @returns {{ok:boolean, kind:'pairs'|'groups'|null, groups:object[][], rest:object[]}}
 */
export function finishHand(game, seat, tileId) {
  assertTurn(game, seat, 'discard');
  const index = handIndex(game, seat, tileId);
  const tile = game.hands[seat][index];
  const remaining = game.hands[seat].filter((_, i) => i !== index);
  const check = checkWinningHand(remaining, game.okey);
  if (!check.ok) return check;
  game.hands[seat] = remaining;
  const penalty = finishPenalty(tile, check.kind, game.okey);
  for (let s = 0; s < SEATS; s++) if (s !== seat) addPoints(game, s, -penalty);
  game.lastMove = { type: 'finish', seat, tile };
  endDeal(game, { winner: seat, kind: check.kind, okeyFinish: isWild(tile, game.okey), tile, groups: check.groups });
  return check;
}

function addPoints(game, seat, delta) {
  game.scores[seat] += delta;
  game.dealDeltas[seat] += delta;
}

function endDeal(game, result) {
  game.result = result;
  game.history.push({
    deal: game.dealNo,
    winner: result.winner,
    kind: result.kind,
    okeyFinish: result.okeyFinish,
    deltas: game.dealDeltas.slice(),
    scores: game.scores.slice(),
  });
  if (result.winner === null) game.lastMove = { type: 'exhausted', seat: game.turn, tile: game.lastMove.tile };
  const over = game.dealNo >= game.totalDeals || game.scores.some((s) => s <= 0);
  game.phase = over ? 'gameOver' : 'dealOver';
}

/**
 * True when the seat may show a tile identical to the indicator now
 * (own turn, before its first discard of the deal, not shown yet).
 * @param {object} game
 * @param {number} seat
 * @returns {boolean}
 */
export function canShowIndicator(game, seat) {
  if (game.turn !== seat || (game.phase !== 'draw' && game.phase !== 'discard')) return false;
  if (game.discarded[seat] || game.shown[seat]) return false;
  return game.hands[seat].some((t) => identicalTiles(t, game.indicator));
}

/**
 * Show the indicator twin: every other player loses 1 point.
 * @param {object} game
 * @param {number} seat
 */
export function showIndicator(game, seat) {
  if (!canShowIndicator(game, seat)) throw new Error('Cannot show the indicator');
  game.shown[seat] = true;
  for (let s = 0; s < SEATS; s++) if (s !== seat) addPoints(game, s, -1);
  game.lastMove = { type: 'show', seat, tile: game.indicator };
}

/**
 * Tiles visible to every player (indicator and discard piles).
 * @param {object} game
 * @returns {object[]}
 */
export function visibleTiles(game) {
  return [game.indicator, ...game.discards.flat()];
}

/**
 * The information a computer player at this seat decides on.
 * @param {object} game
 * @param {number} seat
 * @returns {object} View for ai.chooseDraw / ai.chooseDiscard.
 */
export function aiView(game, seat) {
  const next = nextSeat(seat);
  return {
    hand: game.hands[seat],
    okey: game.okey,
    takeable: takeableTile(game),
    nextPicked: game.picked[next],
    nextDiscards: game.discards[next],
    seen: visibleTiles(game),
  };
}

/**
 * True when the current seat is a computer player still in the deal.
 * @param {object} game
 * @returns {boolean}
 */
export function isAiTurn(game) {
  return (game.phase === 'draw' || game.phase === 'discard') && game.kinds[game.turn] === 'ai';
}

/**
 * Perform one computer action for the current seat (show, draw, or discard/finish).
 * Call repeatedly (e.g. on a timer) while isAiTurn(game).
 * @param {object} game
 * @returns {object} The resulting lastMove.
 */
export function aiStep(game) {
  const seat = game.turn;
  if (canShowIndicator(game, seat)) showIndicator(game, seat);
  else if (game.phase === 'draw') drawTile(game, seat, chooseDraw(aiView(game, seat)));
  else {
    const choice = chooseDiscard(aiView(game, seat));
    if (!choice.finish) discardTile(game, seat, choice.tileId);
    else if (!finishHand(game, seat, choice.tileId).ok) throw new Error('Computer finish refused');
  }
  return game.lastMove;
}

/**
 * Seats with the highest score.
 * @param {object} game
 * @returns {number[]}
 */
export function leaders(game) {
  const top = Math.max(...game.scores);
  return game.scores.map((s, i) => (s === top ? i : -1)).filter((i) => i >= 0);
}

/**
 * A read-only snapshot of the game for rendering.
 * @param {object} game
 * @returns {object}
 */
export function getState(game) {
  return {
    dealNo: game.dealNo,
    totalDeals: game.totalDeals,
    kinds: game.kinds.slice(),
    scores: game.scores.slice(),
    history: game.history.map((h) => ({ ...h, deltas: h.deltas.slice(), scores: h.scores.slice() })),
    starter: game.starter,
    turn: game.turn,
    phase: game.phase,
    hands: game.hands.map((h) => h.slice()),
    handCounts: game.hands.map((h) => h.length),
    pileCount: game.pile.length,
    indicator: game.indicator,
    okey: { ...game.okey },
    discards: game.discards.map((d) => d.slice()),
    takeable: takeableTile(game),
    lastMove: { ...game.lastMove },
    result: game.result,
    canShow: game.kinds[game.turn] === 'human' && canShowIndicator(game, game.turn),
  };
}
