/**
 * DOM builders for tiles, seats, discard corners, the center and the rack.
 * Only creates elements with textContent: no HTML strings.
 */
import { COLORS, isWild } from './tiles.js';
import { t, seatName, tileName } from './i18n.js';
import { prevSeat } from './game.js';
import { ROW } from './rack.js';

/**
 * Create an element with an optional class and text.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * A face-up tile.
 * @param {object} tile
 * @param {{color:number,num:number}} okey
 * @param {string} lang
 * @param {string} [extra] Extra classes.
 * @returns {HTMLElement}
 */
export function tileEl(tile, okey, lang, extra = '') {
  const node = el('span', `tile ${extra}`.trim());
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', tileName(lang, tile) + (isWild(tile, okey) ? ` (${t(lang, 'okey')})` : ''));
  if (tile.fake) {
    node.classList.add('fake');
    node.append(el('span', 'fj'));
  } else {
    node.classList.add(`c-${COLORS[tile.color]}`);
    node.append(el('span', 'num', String(tile.num)), el('span', 'dot'));
  }
  if (isWild(tile, okey)) {
    node.classList.add('wild');
    node.append(el('span', 'star', '★'));
  }
  return node;
}

/**
 * A face-down tile.
 * @param {string} [extra]
 * @returns {HTMLElement}
 */
export function backEl(extra = '') {
  return el('span', `tile back ${extra}`.trim());
}

/**
 * A row of small tiles (used in dialogs).
 * @param {object[]} tiles
 * @param {object} okey
 * @param {string} lang
 * @returns {HTMLElement}
 */
export function tileRow(tiles, okey, lang) {
  const row = el('span', 'tile-row');
  for (const tile of tiles) row.append(tileEl(tile, okey, lang, 'mini'));
  return row;
}

/**
 * Fill an opponent seat box.
 * @param {HTMLElement} box
 * @param {object} state getState() snapshot.
 * @param {number} seat
 * @param {string} lang
 */
export function renderSeat(box, state, seat, lang) {
  const active = state.turn === seat && (state.phase === 'draw' || state.phase === 'discard');
  box.classList.toggle('active', active);
  const name = seatName(lang, seat);
  const avatar = el('span', 'avatar', name.charAt(0));
  const info = el('div', 'seat-info');
  info.append(el('span', 'seat-name', name), el('span', 'seat-score', t(lang, 'pts', { n: state.scores[seat] })));
  const count = el('span', 'seat-count');
  count.append(el('span', 'mini-back'), el('span', '', String(state.handCounts[seat])));
  count.setAttribute('aria-label', t(lang, 'tilesLeft', { n: state.handCounts[seat] }));
  box.replaceChildren(avatar, info, count);
  if (active) box.append(el('span', 'thinking'));
}

/**
 * Fill your own seat box with your score and a turn status line.
 * @param {HTMLElement} box
 * @param {object} state
 * @param {string} lang
 */
export function renderMe(box, state, lang) {
  const mine = state.turn === 0 && (state.phase === 'draw' || state.phase === 'discard');
  box.classList.toggle('active', mine);
  const top = el('div', 'me-top');
  top.append(el('span', 'seat-name', t(lang, 'you')), el('span', 'seat-score', t(lang, 'pts', { n: state.scores[0] })));
  box.replaceChildren(top, el('span', 'status', statusText(state, lang)));
}

function statusText(state, lang) {
  if (state.phase === 'dealOver') return t(lang, 'dealOverStatus');
  if (state.phase === 'gameOver') return t(lang, 'gameOverStatus');
  if (state.turn !== 0) return t(lang, 'playing', { p: seatName(lang, state.turn) });
  if (state.phase === 'draw') return t(lang, 'yourDraw', { p: seatName(lang, prevSeat(0)) });
  return t(lang, 'yourDiscard');
}

/**
 * Fill a discard corner: the top tile of that seat's pile (or an empty spot).
 * @param {HTMLElement} corner
 * @param {object} state
 * @param {number} seat
 * @param {string} lang
 */
export function renderCorner(corner, state, seat, lang) {
  const pile = state.discards[seat];
  const top = pile[pile.length - 1];
  const takeable = seat === prevSeat(0) && state.takeable && state.turn === 0;
  corner.classList.toggle('takeable', Boolean(takeable));
  corner.toggleAttribute('data-drag', Boolean(takeable));
  if (takeable) corner.dataset.drag = 'take';
  const label = seat === 0 ? t(lang, 'yourDiscards') : t(lang, 'discardsOf', { p: seatName(lang, seat) });
  corner.setAttribute('aria-label', top ? `${label}: ${tileName(lang, top)}` : label);
  const children = [];
  if (top) children.push(tileEl(top, state.okey, lang, 'table'));
  else children.push(el('span', 'tile slot-empty table', seat === 0 ? t(lang, 'discardHere') : ''));
  if (pile.length > 1) children.push(el('span', 'badge', String(pile.length)));
  corner.replaceChildren(...children);
}

/**
 * Fill the center: the face-down pile with its count and the indicator.
 * @param {HTMLElement} pileBtn
 * @param {HTMLElement} indicatorBox
 * @param {object} state
 * @param {string} lang
 */
export function renderCenter(pileBtn, indicatorBox, state, lang) {
  const canDraw = state.turn === 0 && state.phase === 'draw';
  pileBtn.classList.toggle('ready', canDraw);
  pileBtn.toggleAttribute('data-drag', canDraw);
  if (canDraw) pileBtn.dataset.drag = 'pile';
  pileBtn.setAttribute('aria-label', t(lang, 'pileAria', { n: state.pileCount }));
  const stack = el('span', 'stack');
  stack.append(backEl('table under'), backEl('table'));
  pileBtn.replaceChildren(stack, el('span', 'pile-count', String(state.pileCount)), el('span', 'cap', t(lang, 'pile')));
  const okeyTile = { id: -1, color: state.okey.color, num: state.okey.num, fake: false };
  const okeyLine = el('span', 'okey-line');
  okeyLine.append(el('span', 'cap', t(lang, 'okey')), tileEl(okeyTile, state.okey, lang, 'mini'));
  indicatorBox.replaceChildren(tileEl(state.indicator, state.okey, lang, 'table indicator'), el('span', 'cap', t(lang, 'indicator')), okeyLine);
}

/**
 * Rebuild the rack's 26 slots.
 * @param {HTMLElement} rack
 * @param {(number|null)[]} slots
 * @param {Map<number, object>} tilesById
 * @param {{okey:object, lang:string, selected:number, dragging:number, fresh:number}} opts
 */
export function renderRack(rack, slots, tilesById, opts) {
  const cells = slots.map((id, i) => {
    const cell = el('div', 'slot');
    cell.dataset.drop = 'slot';
    cell.dataset.slot = String(i);
    if (i === ROW) cell.classList.add('row-start');
    if (id === null) return cell;
    const classes = ['in-rack'];
    if (i === opts.selected) classes.push('selected');
    if (i === opts.dragging) classes.push('ghosted');
    if (id === opts.fresh) classes.push('fresh');
    const tile = tileEl(tilesById.get(id), opts.okey, opts.lang, classes.join(' '));
    tile.dataset.drag = 'rack';
    tile.dataset.slot = String(i);
    cell.append(tile);
    return cell;
  });
  rack.replaceChildren(...cells);
}

/**
 * A score table: one row per finished deal (score with the change below) and a current row.
 * @param {object} state
 * @param {string} lang
 * @returns {HTMLTableElement}
 */
export function scoreTable(state, lang) {
  const table = el('table', 'scores');
  const head = el('tr');
  head.append(el('th', '', t(lang, 'dealCol')));
  for (let s = 0; s < 4; s++) head.append(el('th', s === 0 ? 'me' : '', seatName(lang, s)));
  const body = el('tbody');
  for (const row of state.history) {
    const tr = el('tr');
    tr.append(el('td', 'deal-no', String(row.deal)));
    row.scores.forEach((score, s) => {
      const td = el('td', row.winner === s ? 'winner' : '', String(score));
      const delta = row.deltas[s];
      td.append(el('small', delta < 0 ? 'neg' : '', delta === 0 ? '±0' : String(delta).replace('-', '−')));
      tr.append(td);
    });
    body.append(tr);
  }
  const now = el('tr', 'now');
  now.append(el('td', 'deal-no', t(lang, 'totalRow')));
  for (const score of state.scores) now.append(el('td', '', String(score)));
  body.append(now);
  const thead = el('thead');
  thead.append(head);
  table.append(thead, body);
  return table;
}
