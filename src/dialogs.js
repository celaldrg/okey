/**
 * Modal dialogs: rules, settings, score table, discard piles, a refused
 * finish and the end of a deal. Built with createElement only.
 */
import { t, seatName, rulesText, tileName } from './i18n.js';
import { DEAL_OPTIONS, leaders } from './game.js';
import { finishPenalty } from './groups.js';
import { el, tileRow, scoreTable } from './view.js';

/** Computer speed options and their delay per action in ms. */
export const SPEEDS = Object.freeze({ slow: 950, normal: 600, fast: 260 });

/**
 * Show the shared <dialog> with a title, body nodes and action buttons.
 * @param {HTMLDialogElement} dialog
 * @param {{title:string, body:Node[], actions:{label:string, primary?:boolean, run?:()=>void}[]}} spec
 */
export function showDialog(dialog, spec) {
  const head = el('h2', '', spec.title);
  head.id = 'dlg-title';
  const foot = el('div', 'dlg-actions');
  for (const action of spec.actions) {
    const button = el('button', action.primary ? 'btn primary' : 'btn', action.label);
    button.type = 'button';
    button.addEventListener('click', () => {
      dialog.close();
      if (action.run) action.run();
    });
    foot.append(button);
  }
  const body = el('div', 'dlg-body');
  body.append(...spec.body);
  dialog.replaceChildren(head, body, foot);
  if (!dialog.open) dialog.showModal();
  const primary = foot.querySelector('.primary') || foot.querySelector('button');
  if (primary) primary.focus();
}

/**
 * Rules page body.
 * @param {string} lang
 * @returns {Node[]}
 */
export function rulesBody(lang) {
  return rulesText(lang).map((p) => el('p', '', p));
}

function choiceGroup(label, options, current, onPick) {
  const box = el('fieldset', 'choice');
  box.append(el('legend', '', label));
  const row = el('div', 'seg');
  for (const option of options) {
    const button = el('button', option.value === current ? 'seg-btn on' : 'seg-btn', option.label);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(option.value === current));
    button.addEventListener('click', () => {
      for (const other of row.children) {
        other.classList.toggle('on', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      }
      onPick(option.value);
    });
    row.append(button);
  }
  box.append(row);
  return box;
}

/**
 * Settings body: number of deals and computer speed.
 * @param {string} lang
 * @param {{deals:number, speed:string}} settings
 * @param {(change:{deals?:number, speed?:string})=>void} onChange
 * @returns {Node[]}
 */
export function settingsBody(lang, settings, onChange) {
  const deals = DEAL_OPTIONS.map((n) => ({ value: n, label: String(n) }));
  const speeds = Object.keys(SPEEDS).map((key) => ({ value: key, label: t(lang, key) }));
  return [
    choiceGroup(t(lang, 'dealsLabel'), deals, settings.deals, (v) => onChange({ deals: v })),
    el('p', 'muted small', t(lang, 'settingsNote')),
    choiceGroup(t(lang, 'speedLabel'), speeds, settings.speed, (v) => onChange({ speed: v })),
  ];
}

/**
 * Body of a whole discard pile.
 * @param {object[]} pile
 * @param {object} okey
 * @param {string} lang
 * @returns {Node[]}
 */
export function pileBody(pile, okey, lang) {
  return pile.length ? [tileRow(pile, okey, lang)] : [el('p', 'muted', t(lang, 'noDiscards'))];
}

function groupsBlock(title, groups, okey, lang) {
  const block = el('div', 'groups');
  block.append(el('h3', '', title));
  for (const group of groups) block.append(tileRow(group, okey, lang));
  return block;
}

/**
 * Body explaining why a finish was refused, with the groups found.
 * @param {{groups:object[][], rest:object[]}} check
 * @param {object} okey
 * @param {string} lang
 * @returns {Node[]}
 */
export function refusedBody(check, okey, lang) {
  const body = [el('p', '', t(lang, 'notFinished', { n: check.rest.length }))];
  if (check.groups.length) body.push(groupsBlock(t(lang, 'groupsFound'), check.groups, okey, lang));
  if (check.rest.length) body.push(groupsBlock(t(lang, 'leftOver'), [check.rest], okey, lang));
  return body;
}

/**
 * Title and body for the end of a deal (and of the game).
 * @param {object} state getState() snapshot.
 * @param {object} game Game, for leaders().
 * @param {string} lang
 * @returns {{title:string, body:Node[]}}
 */
export function dealOverContent(state, game, lang) {
  const { result } = state;
  const body = [el('p', 'muted', t(lang, 'dealOf', { n: state.dealNo, m: state.totalDeals }))];
  let title = t(lang, 'noWinner');
  if (result.winner !== null) {
    title = result.winner === 0 ? t(lang, 'winYou') : t(lang, 'winOther', { p: seatName(lang, result.winner) });
    const kind = t(lang, result.kind === 'pairs' ? 'kindPairs' : 'kindGroups');
    const extra = result.okeyFinish ? ` · ${t(lang, 'okeyFinish')}` : '';
    body.push(el('p', 'result-kind', `${kind}${extra}`));
    body.push(el('p', '', `${t(lang, 'finishTip', { t: tileName(lang, result.tile) })} · ${t(lang, 'penalty', { n: finishPenalty(result.tile, result.kind, state.okey) })}`));
    body.push(groupsBlock(t(lang, 'winningHand'), result.groups, state.okey, lang));
  }
  if (state.phase === 'gameOver') {
    const top = leaders(game);
    const names = top.map((s) => seatName(lang, s)).join(', ');
    body.unshift(el('p', 'game-over', `${t(lang, 'gameOver')}: ${t(lang, 'winnerLine', { names, n: state.scores[top[0]] })}`));
  }
  body.push(scoreTable(state, lang));
  return { title, body };
}
