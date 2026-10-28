/**
 * App controller: wires the game state machine to the page (rendering,
 * pointer and keyboard input, computer turns, dialogs, settings, language).
 */
import {
  createGame, startNextDeal, getState, drawTile, discardTile, finishHand,
  showIndicator, isAiTurn, aiStep, DEAL_OPTIONS,
} from './game.js';
import { buildDemoGame } from './demo.js';
import { findFinishes, chooseFinish } from './groups.js';
import { solveHand } from './solver.js';
import { syncRack, moveTile, sortRuns, sortPairs, stepCursor, SLOTS } from './rack.js';
import { t, normalizeLang, describeMove } from './i18n.js';
import { loadValue, saveValue } from './storage.js';
import { renderSeat, renderMe, renderCorner, renderCenter, renderRack, scoreTable, el } from './view.js';
import { showDialog, rulesBody, settingsBody, pileBody, refusedBody, dealOverContent, SPEEDS } from './dialogs.js';
import { enableDrag } from './drag.js';

const $ = (selector) => document.querySelector(selector);

const dom = {
  play: $('#play'),
  rack: $('#rack'),
  hint: $('#hint'),
  pile: $('#pile'),
  indicator: $('#indicator'),
  me: $('#seat-0'),
  seats: [null, $('#seat-1'), $('#seat-2'), $('#seat-3')],
  corners: [$('#disc-0'), $('#disc-1'), $('#disc-2'), $('#disc-3')],
  dialog: $('#dlg'),
  sideTitle: $('#side-title'),
  sideScores: $('#side-scores'),
  btn: {
    lang: $('#btn-lang'),
    newGame: $('#btn-new'),
    scores: $('#btn-scores'),
    settings: $('#btn-settings'),
    rules: $('#btn-rules'),
    sortRuns: $('#btn-sort-runs'),
    sortPairs: $('#btn-sort-pairs'),
    show: $('#btn-show'),
    discard: $('#btn-discard'),
    finish: $('#btn-finish'),
    next: $('#btn-next'),
  },
};

const settings = {
  lang: normalizeLang(loadValue('lang', 'en')),
  deals: DEAL_OPTIONS.includes(loadValue('deals', 10)) ? loadValue('deals', 10) : 10,
  speed: loadValue('speed', 'normal') in SPEEDS ? loadValue('speed', 'normal') : 'normal',
};

const ui = { slots: [], selectedId: -1, dragging: -1, fresh: -1, message: '', timer: 0, finishCache: { key: '', options: [] } };
let game = null;

/* ---------- helpers ---------- */

const myHand = () => game.hands[0];
const myTurn = (phase) => game.turn === 0 && game.phase === phase;
const tileAt = (slot) => myHand().find((tile) => tile.id === ui.slots[slot]);
const selectedSlot = () => (ui.selectedId < 0 ? -1 : ui.slots.indexOf(ui.selectedId));

function say(key) {
  ui.message = t(settings.lang, key);
  render();
}

function finishOptions() {
  if (!myTurn('discard')) return [];
  const key = myHand().map((tile) => tile.id).sort((a, b) => a - b).join(',');
  if (ui.finishCache.key !== key) ui.finishCache = { key, options: findFinishes(myHand(), game.okey) };
  return ui.finishCache.options;
}

/* ---------- rendering ---------- */

function applyStatic() {
  const { lang } = settings;
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(lang, node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-aria]')) {
    const label = t(lang, node.dataset.i18nAria);
    node.setAttribute('aria-label', label);
    if (node.tagName === 'BUTTON') node.title = label;
  }
  dom.btn.lang.textContent = lang === 'en' ? 'TR' : 'EN';
  dom.btn.lang.setAttribute('aria-label', t(lang, 'langSwitch'));
}

function renderControls(state) {
  const active = state.phase === 'draw' || state.phase === 'discard';
  dom.btn.discard.disabled = !myTurn('discard');
  dom.btn.finish.disabled = !myTurn('discard');
  dom.btn.finish.classList.toggle('ready', finishOptions().length > 0);
  dom.btn.show.hidden = !state.canShow;
  dom.btn.next.hidden = active || dom.dialog.open;
  dom.btn.next.textContent = t(settings.lang, state.phase === 'gameOver' ? 'newGame' : 'nextDeal');
}

function render() {
  const { lang } = settings;
  const state = getState(game);
  for (let seat = 1; seat < 4; seat++) renderSeat(dom.seats[seat], state, seat, lang);
  renderMe(dom.me, state, lang);
  for (let seat = 0; seat < 4; seat++) renderCorner(dom.corners[seat], state, seat, lang);
  dom.corners[0].classList.toggle('ready', myTurn('discard'));
  renderCenter(dom.pile, dom.indicator, state, lang);
  const tilesById = new Map(myHand().map((tile) => [tile.id, tile]));
  renderRack(dom.rack, ui.slots, tilesById, { okey: game.okey, lang, selected: selectedSlot(), dragging: ui.dragging, fresh: ui.fresh });
  dom.hint.textContent = ui.message || describeMove(lang, state.lastMove, state.dealNo);
  renderControls(state);
  dom.sideTitle.textContent = t(lang, 'dealOf', { n: state.dealNo, m: state.totalDeals });
  dom.sideScores.replaceChildren(scoreTable(state, lang));
}

/* ---------- game flow ---------- */

function schedule() {
  clearTimeout(ui.timer);
  if (!isAiTurn(game) || dom.dialog.open) return;
  ui.timer = setTimeout(() => {
    aiStep(game);
    afterMove();
  }, SPEEDS[settings.speed]);
}

function afterMove(preferSlot = -1) {
  ui.message = '';
  ui.slots = syncRack(ui.slots, myHand().map((tile) => tile.id), preferSlot);
  render();
  clearTimeout(ui.timer);
  if (game.phase === 'dealOver' || game.phase === 'gameOver') ui.timer = setTimeout(showDealOver, 700);
  else schedule();
}

function startDeal() {
  ui.slots = sortRuns(myHand(), game.okey);
  ui.selectedId = -1;
  ui.fresh = -1;
  ui.message = '';
  render();
  schedule();
}

function newGame() {
  clearTimeout(ui.timer);
  if (dom.dialog.open) dom.dialog.close();
  game = createGame({ seed: Math.floor(Math.random() * 2 ** 31), deals: settings.deals });
  startDeal();
}

function nextDeal() {
  if (game.phase === 'gameOver') newGame();
  else if (game.phase === 'dealOver') {
    startNextDeal(game);
    startDeal();
  }
}

/* ---------- your moves ---------- */

function drawFrom(source, slot = -1) {
  if (!myTurn('draw')) return say(game.turn === 0 ? 'notYourDraw' : 'waitTurn');
  if (source === 'discard' && !game.takeable) return say('nothingToTake');
  const tile = drawTile(game, 0, source);
  ui.fresh = tile.id;
  ui.selectedId = -1;
  return afterMove(slot);
}

function discardId(tileId) {
  if (!myTurn('discard')) return say(game.turn === 0 ? 'notYourDiscard' : 'waitTurn');
  if (tileId < 0) return say('pickFirst');
  discardTile(game, 0, tileId);
  ui.selectedId = -1;
  ui.fresh = -1;
  return afterMove();
}

/** The tile to finish with: the given one if it finishes, else (unless exact) any finishing tile, else the best guess to explain the refusal. */
function finishTileId(tileId, exact) {
  if (exact) return tileId;
  const choice = chooseFinish(finishOptions(), tileId, game.okey);
  if (choice) return choice.tile.id;
  if (tileId >= 0) return tileId;
  return (solveHand(myHand(), game.okey).rest[0] || myHand()[0]).id;
}

function tryFinish(tileId = ui.selectedId, exact = false) {
  if (!myTurn('discard')) return say(game.turn === 0 ? 'notYourDiscard' : 'waitTurn');
  const id = finishTileId(tileId, exact);
  const check = finishHand(game, 0, id);
  if (check.ok) return afterMove();
  clearTimeout(ui.timer);
  return showDialog(dom.dialog, {
    title: t(settings.lang, 'notFinishedTitle'),
    body: refusedBody(check, game.okey, settings.lang),
    actions: [{ label: t(settings.lang, 'close'), primary: true }],
  });
}

function onShowIndicator() {
  showIndicator(game, 0);
  afterMove();
}

/* ---------- dialogs ---------- */

function showDealOver() {
  if (game.phase !== 'dealOver' && game.phase !== 'gameOver') return;
  const { title, body } = dealOverContent(getState(game), game, settings.lang);
  const over = game.phase === 'gameOver';
  showDialog(dom.dialog, {
    title,
    body,
    actions: [{ label: t(settings.lang, over ? 'newGame' : 'nextDeal'), primary: true, run: nextDeal }, { label: t(settings.lang, 'close') }],
  });
  render();
}

function showScores() {
  const state = getState(game);
  showDialog(dom.dialog, {
    title: t(settings.lang, 'scoreTitle'),
    body: [el('p', 'muted', t(settings.lang, 'dealOf', { n: state.dealNo, m: state.totalDeals })), scoreTable(state, settings.lang)],
    actions: [{ label: t(settings.lang, 'close'), primary: true }],
  });
}

function showRules() {
  showDialog(dom.dialog, { title: t(settings.lang, 'rulesTitle'), body: rulesBody(settings.lang), actions: [{ label: t(settings.lang, 'close'), primary: true }] });
}

function showSettings() {
  const onChange = (change) => {
    Object.assign(settings, change);
    if (change.deals) saveValue('deals', change.deals);
    if (change.speed) saveValue('speed', change.speed);
  };
  showDialog(dom.dialog, {
    title: t(settings.lang, 'settings'),
    body: settingsBody(settings.lang, settings, onChange),
    actions: [{ label: t(settings.lang, 'close'), primary: true }],
  });
}

function showPile(seat) {
  const lang = settings.lang;
  const title = seat === 0 ? t(lang, 'yourDiscards') : t(lang, 'discardsOf', { p: dom.seats[seat].querySelector('.seat-name').textContent });
  showDialog(dom.dialog, { title, body: pileBody(game.discards[seat], game.okey, lang), actions: [{ label: t(lang, 'close'), primary: true }] });
}

/* ---------- input ---------- */

/** The rack slot nearest to a point, so taps in the gaps between narrow slots still count. */
function nearestSlot(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const cell of dom.rack.children) {
    const r = cell.getBoundingClientRect();
    const dist = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
    if (dist < bestDist) [best, bestDist] = [cell, dist];
  }
  return best;
}

function onRackClick(event) {
  const cell = event.target.closest('.slot') || nearestSlot(event.clientX, event.clientY);
  if (!cell) return;
  const slot = Number(cell.dataset.slot);
  const id = ui.slots[slot];
  if (id === null) {
    const from = selectedSlot();
    if (from >= 0) ui.slots = moveTile(ui.slots, from, slot);
  } else ui.selectedId = ui.selectedId === id ? -1 : id;
  render();
}

function onCornerClick(seat) {
  if (seat === 3 && myTurn('draw') && game.takeable) return drawFrom('discard');
  if (seat === 0 && myTurn('discard') && ui.selectedId >= 0) return discardId(ui.selectedId);
  return showPile(seat);
}

const dragHandlers = {
  start(source) {
    if (source.kind === 'rack') {
      ui.dragging = source.slot;
      render();
    }
  },
  drop(source, target) {
    ui.dragging = -1;
    if (source.kind === 'rack') {
      const tile = tileAt(source.slot);
      if (!target || !tile) return render();
      if (target.kind === 'slot') {
        ui.slots = moveTile(ui.slots, source.slot, target.slot);
        return render();
      }
      if (target.kind === 'discard') return discardId(tile.id);
      if (target.kind === 'finish') return tryFinish(tile.id, true);
      return render();
    }
    if (target && target.kind === 'slot') return drawFrom(source.kind === 'pile' ? 'pile' : 'discard', target.slot);
    return render();
  },
  end() {
    if (ui.dragging >= 0) {
      ui.dragging = -1;
      render();
    }
  },
};

function moveCursor(dir, shift) {
  const from = selectedSlot();
  if (shift && from >= 0 && (dir === 'left' || dir === 'right')) {
    const to = from + (dir === 'left' ? -1 : 1);
    if (to >= 0 && to < SLOTS) ui.slots = moveTile(ui.slots, from, to);
  } else {
    const slot = stepCursor(ui.slots, from, dir);
    ui.selectedId = slot < 0 ? -1 : ui.slots[slot];
  }
  render();
}

const ARROWS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

function onKey(event) {
  if (dom.dialog.open || event.ctrlKey || event.metaKey || event.altKey) return;
  const onButton = event.target instanceof Element && event.target.closest('button, a');
  if (ARROWS[event.key]) {
    event.preventDefault();
    moveCursor(ARROWS[event.key], event.shiftKey);
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'd') drawFrom('pile');
  else if (key === 't') drawFrom('discard');
  else if (key === 'f') tryFinish();
  else if (event.key === 'Enter' && !onButton) discardId(ui.selectedId);
}

function bind() {
  const { btn } = dom;
  btn.lang.addEventListener('click', () => {
    settings.lang = settings.lang === 'en' ? 'tr' : 'en';
    saveValue('lang', settings.lang);
    applyStatic();
    render();
  });
  btn.newGame.addEventListener('click', newGame);
  btn.scores.addEventListener('click', showScores);
  btn.settings.addEventListener('click', showSettings);
  btn.rules.addEventListener('click', showRules);
  btn.sortRuns.addEventListener('click', () => { ui.slots = sortRuns(myHand(), game.okey); render(); });
  btn.sortPairs.addEventListener('click', () => { ui.slots = sortPairs(myHand(), game.okey); render(); });
  btn.show.addEventListener('click', onShowIndicator);
  btn.discard.addEventListener('click', () => discardId(ui.selectedId));
  btn.finish.addEventListener('click', () => tryFinish());
  btn.next.addEventListener('click', () => (game.phase === 'gameOver' ? newGame() : nextDeal()));
  dom.pile.addEventListener('click', () => drawFrom('pile'));
  dom.corners.forEach((corner, seat) => corner.addEventListener('click', () => onCornerClick(seat)));
  dom.rack.addEventListener('click', onRackClick);
  dom.dialog.addEventListener('close', () => {
    render();
    schedule();
  });
  document.addEventListener('keydown', onKey);
  enableDrag(dom.play, dragHandlers);
}

function init() {
  applyStatic();
  bind();
  if (new URLSearchParams(location.search).has('demo')) {
    game = buildDemoGame();
    startDeal();
  } else newGame();
}

init();
