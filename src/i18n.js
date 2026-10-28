/**
 * English and Turkish strings, plus helpers that turn game events into text.
 * Pure module: no DOM access.
 */

/** Supported languages. */
export const LANGS = Object.freeze(['en', 'tr']);

/** Computer player names by seat (seat 0 is you). */
export const SEAT_NAMES = Object.freeze([null, 'Ayla', 'Kerem', 'Deniz']);

const EN = {
  title: 'Okey',
  newGame: 'New game',
  scores: 'Scores',
  settings: 'Settings',
  rules: 'Rules',
  langSwitch: 'TR: switch to Turkish',
  footer: 'MIT · Source on GitHub',
  you: 'You',
  pts: '{n} pts',
  tilesLeft: '{n} tiles',
  pile: 'Pile',
  pileAria: 'Center pile, {n} tiles. Tap to draw, drop a tile here to finish.',
  indicator: 'Indicator',
  okey: 'Okey',
  discardHere: 'Discard',
  sortRuns: 'Sort runs',
  sortPairs: 'Sort pairs',
  discard: 'Discard',
  finish: 'Finish',
  showIndicator: 'Show indicator',
  rack: 'Your rack',
  tableAria: 'Table',
  yourDraw: 'Your turn: draw from the pile or take {p}’s tile',
  yourDiscard: 'Your turn: discard a tile',
  playing: '{p} is playing…',
  dealOverStatus: 'Deal over',
  gameOverStatus: 'Game over',
  pickFirst: 'Pick a tile in your rack first.',
  nothingToTake: 'There is no discard to take: draw from the pile.',
  notYourDraw: 'You can draw only at the start of your turn.',
  notYourDiscard: 'Draw a tile first, then discard.',
  waitTurn: 'Wait for your turn.',
  notFinishedTitle: 'Not finished yet',
  notFinished: 'Your hand does not finish: {n} of the other 14 tiles do not fit a group or a pair.',
  groupsFound: 'Groups found',
  leftOver: 'Left over',
  finishTip: 'Finishing tile: {t}',
  scoreTitle: 'Score table',
  dealCol: 'Deal',
  totalRow: 'Now',
  close: 'Close',
  nextDeal: 'Next deal',
  dealOf: 'Deal {n} of {m}',
  winYou: 'You finished the deal!',
  winOther: '{p} finished the deal!',
  noWinner: 'The pile ran out: no winner this deal.',
  kindPairs: 'Seven pairs',
  kindGroups: 'All in groups',
  okeyFinish: 'finished by discarding an okey',
  penalty: 'Everyone else loses {n} points.',
  winningHand: 'Winning hand',
  gameOver: 'Game over',
  winnerLine: '{names} won with {n} points.',
  settingsNote: 'The number of deals applies from the next new game.',
  dealsLabel: 'Number of deals',
  speedLabel: 'Computer speed',
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  discardsOf: '{p}’s discards',
  yourDiscards: 'Your discards',
  noDiscards: 'No discards yet.',
  red: 'red',
  yellow: 'yellow',
  blue: 'blue',
  black: 'black',
  falseJoker: 'false joker',
  move_deal: 'Deal {n}: {p} starts.',
  move_deal_you: 'Deal {n}: you start with 15 tiles. Discard one.',
  move_draw: '{p} drew from the pile.',
  move_draw_you: 'You drew from the pile.',
  move_take: '{p} took {q}’s {t}.',
  move_take_you: 'You took {q}’s {t}.',
  move_take_from_you: '{p} took your {t}.',
  move_discard: '{p} discarded {t}.',
  move_discard_you: 'You discarded {t}.',
  move_show: '{p} showed the indicator: everyone else loses 1 point.',
  move_show_you: 'You showed the indicator: everyone else loses 1 point.',
  move_finish: '{p} finished the deal!',
  move_finish_you: 'You finished the deal!',
  move_exhausted: 'The pile ran out: no winner this deal.',
  rulesTitle: 'How to play Okey',
  rulesText: [
    'Okey is the Turkish tile game of the rummy family. You play against three computer players.',
    'There are 106 tiles: the numbers 1 to 13 in four colors (red, yellow, blue, black), two of each, plus two false jokers.',
    'Each deal the tiles are shuffled. The starting player (it rotates every deal) gets 15 tiles, the others 14. One tile is turned face up as the indicator. The okey is the tile of the indicator’s color one number higher (13 wraps to 1). Both okey tiles are wild and can stand for any tile; they carry a small star in your rack. The false jokers play as the plain okey tile (its color and number).',
    'Play passes counter-clockwise. On your turn draw either the top tile of the center pile or the tile the previous player (on your left) just discarded, then discard one tile for the next player. The starting player skips the draw and only discards.',
    'A set is 3 or 4 tiles of the same number in different colors. A run is 3 or more consecutive numbers of one color; 1 may follow 13 at the end (11-12-13-1), but a run never continues past it (13-1-2 is not a run).',
    'You finish by discarding your 15th tile face down onto the center pile when the other 14 split completely into groups, or into seven pairs of identical tiles (çifte gitmek). Okey tiles can complete groups and pairs. If the center pile runs out, the deal ends without a winner.',
    'Everyone starts with 20 points. When a player finishes, each other player loses 2 points, 4 if the finishing discard was an okey or the hand was seven pairs, 8 if both. A player holding a tile identical to the indicator may show it before their first discard of the deal; each other player then loses 1 point.',
    'A game is 5, 10 or 20 deals (10 by default) and ends early when a player reaches 0. The highest score wins.',
    'Touch: drag tiles to rearrange your rack. Tap the pile or the glowing discard to draw (or drag them onto your rack). Tap a tile and press Discard, or drag it to your discard spot. Drop a tile on the center pile, or press Finish, to finish.',
    'Keyboard: arrow keys pick a tile, Shift + Left/Right moves it, D draws from the pile, T takes the discard, Enter discards the picked tile, F finishes.',
  ],
};

const TR = {
  title: 'Okey',
  newGame: 'Yeni oyun',
  scores: 'Puanlar',
  settings: 'Ayarlar',
  rules: 'Kurallar',
  langSwitch: 'EN: İngilizceye geç',
  footer: 'MIT · Kaynak kod GitHub’da',
  you: 'Sen',
  pts: '{n} puan',
  tilesLeft: '{n} taş',
  pile: 'Deste',
  pileAria: 'Orta deste, {n} taş. Çekmek için dokun, bitirmek için taşı buraya bırak.',
  indicator: 'Gösterge',
  okey: 'Okey',
  discardHere: 'At',
  sortRuns: 'Seri diz',
  sortPairs: 'Çift diz',
  discard: 'At',
  finish: 'Bitir',
  showIndicator: 'Göstergeyi göster',
  rack: 'Istakan',
  tableAria: 'Masa',
  yourDraw: 'Sıra sende: desteden çek ya da {p} oyuncusunun taşını al',
  yourDiscard: 'Sıra sende: bir taş at',
  playing: '{p} oynuyor…',
  dealOverStatus: 'El bitti',
  gameOverStatus: 'Oyun bitti',
  pickFirst: 'Önce ıstakandan bir taş seç.',
  nothingToTake: 'Alınacak atılmış taş yok: ortadan çek.',
  notYourDraw: 'Taşı yalnızca sıranın başında çekebilirsin.',
  notYourDiscard: 'Önce bir taş çek, sonra at.',
  waitTurn: 'Sıranı bekle.',
  notFinishedTitle: 'Henüz bitmedi',
  notFinished: 'Elin bitmiyor: kalan 14 taştan {n} tanesi bir gruba ya da çifte girmiyor.',
  groupsFound: 'Bulunan gruplar',
  leftOver: 'Artan taşlar',
  finishTip: 'Bitiren taş: {t}',
  scoreTitle: 'Puan tablosu',
  dealCol: 'El',
  totalRow: 'Şimdi',
  close: 'Kapat',
  nextDeal: 'Sonraki el',
  dealOf: 'El {n} / {m}',
  winYou: 'Eli sen bitirdin!',
  winOther: '{p} eli bitirdi!',
  noWinner: 'Deste bitti: bu elde kazanan yok.',
  kindPairs: 'Çifte',
  kindGroups: 'Hepsi grupta',
  okeyFinish: 'okey atarak bitti',
  penalty: 'Diğer herkes {n} puan kaybeder.',
  winningHand: 'Kazanan el',
  gameOver: 'Oyun bitti',
  winnerLine: '{names} {n} puanla kazandı.',
  settingsNote: 'El sayısı bir sonraki yeni oyundan itibaren geçerli olur.',
  dealsLabel: 'El sayısı',
  speedLabel: 'Bilgisayar hızı',
  slow: 'Yavaş',
  normal: 'Normal',
  fast: 'Hızlı',
  discardsOf: '{p} oyuncusunun attıkları',
  yourDiscards: 'Attığın taşlar',
  noDiscards: 'Henüz atılan taş yok.',
  red: 'kırmızı',
  yellow: 'sarı',
  blue: 'mavi',
  black: 'siyah',
  falseJoker: 'sahte okey',
  move_deal: '{n}. el: {p} başlıyor.',
  move_deal_you: '{n}. el: 15 taşla sen başlıyorsun. Bir taş at.',
  move_draw: '{p} desteden çekti.',
  move_draw_you: 'Desteden çektin.',
  move_take: '{p}, {q} oyuncusunun {t} taşını aldı.',
  move_take_you: '{q} oyuncusunun {t} taşını aldın.',
  move_take_from_you: '{p} senin {t} taşını aldı.',
  move_discard: '{p} {t} attı.',
  move_discard_you: '{t} attın.',
  move_show: '{p} göstergeyi gösterdi: diğer herkes 1 puan kaybeder.',
  move_show_you: 'Göstergeyi gösterdin: diğer herkes 1 puan kaybeder.',
  move_finish: '{p} eli bitirdi!',
  move_finish_you: 'Eli bitirdin!',
  move_exhausted: 'Deste bitti: bu elde kazanan yok.',
  rulesTitle: 'Okey nasıl oynanır',
  rulesText: [
    'Okey, rummy ailesinden Türk taş oyunudur. Üç bilgisayar oyuncusuna karşı oynarsın.',
    '106 taş vardır: dört renkte (kırmızı, sarı, mavi, siyah) 1’den 13’e kadar sayılar, her birinden iki tane, artı iki sahte okey.',
    'Her elde taşlar karılır. Başlayan oyuncu (her elde sırayla değişir) 15, diğerleri 14 taş alır. Bir taş gösterge olarak açılır. Okey, göstergenin renginde bir büyük sayıdır (13’ten sonra 1 gelir). İki okey taşı da jokerdir, her taşın yerine geçebilir; ıstakanda küçük bir yıldız taşırlar. Sahte okeyler düz okey taşı (onun rengi ve sayısı) olarak oynar.',
    'Oyun saat yönünün tersine döner. Sıran gelince orta destenin üstündeki taşı ya da önceki oyuncunun (solundaki) az önce attığı taşı çek, sonra sonraki oyuncu için bir taş at. Başlayan oyuncu çekmez, yalnızca atar.',
    'Per: aynı sayıda, farklı renklerde 3 ya da 4 taş. Seri: aynı renkte ardışık 3 ya da daha fazla sayı; 13’ten sonra sona 1 gelebilir (11-12-13-1) ama seri ondan sonra devam etmez (13-1-2 seri değildir).',
    'Diğer 14 taş tamamen gruplara ya da yedi çift aynı taşa (çifte gitmek) ayrıldığında 15. taşı orta destenin üstüne kapalı atarak bitirirsin. Okeyler grupları ve çiftleri tamamlayabilir. Orta deste biterse el kazanansız biter.',
    'Herkes 20 puanla başlar. Bir oyuncu bitirince diğer her oyuncu 2 puan kaybeder; bitiren taş okeyse ya da el çifteyse 4, ikisi birdense 8. Göstergenin aynısını tutan oyuncu eldeki ilk atışından önce onu gösterebilir; diğer her oyuncu 1 puan kaybeder.',
    'Bir oyun 5, 10 ya da 20 eldir (varsayılan 10) ve bir oyuncu 0’a inince erken biter. En yüksek puan kazanır.',
    'Dokunmatik: taşları sürükleyerek ıstakanı düzenle. Çekmek için desteye ya da parlayan atılmış taşa dokun (ya da ıstakana sürükle). Bir taşa dokunup At’a bas ya da taşı atma yerine sürükle. Bitirmek için taşı orta desteye bırak ya da Bitir’e bas.',
    'Klavye: ok tuşları taş seçer, Shift + Sol/Sağ taşı kaydırır, D desteden çeker, T atılan taşı alır, Enter seçili taşı atar, F bitirir.',
  ],
};

const STRINGS = { en: EN, tr: TR };
const COLOR_KEYS = ['red', 'yellow', 'blue', 'black'];

/**
 * Normalise a language code to a supported one.
 * @param {unknown} lang
 * @returns {'en'|'tr'}
 */
export function normalizeLang(lang) {
  return lang === 'tr' ? 'tr' : 'en';
}

/**
 * Translate a key and fill {placeholders}. Falls back to English, then to the key.
 * @param {'en'|'tr'} lang
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(lang, key, params = {}) {
  const table = STRINGS[normalizeLang(lang)];
  const text = key in table ? table[key] : EN[key] ?? key;
  if (typeof text !== 'string') return key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/**
 * The rules page as a list of paragraphs.
 * @param {'en'|'tr'} lang
 * @returns {string[]}
 */
export function rulesText(lang) {
  return STRINGS[normalizeLang(lang)].rulesText.slice();
}

/**
 * Every translation key of a language (used to check both languages match).
 * @param {'en'|'tr'} lang
 * @returns {string[]}
 */
export function keysOf(lang) {
  return Object.keys(STRINGS[normalizeLang(lang)]);
}

/**
 * Display name of a seat ("You" for seat 0).
 * @param {'en'|'tr'} lang
 * @param {number} seat
 * @returns {string}
 */
export function seatName(lang, seat) {
  return seat === 0 ? t(lang, 'you') : SEAT_NAMES[seat];
}

/**
 * Spoken name of a tile, e.g. "red 7" or "false joker".
 * @param {'en'|'tr'} lang
 * @param {{color:number,num:number,fake:boolean}} tile
 * @returns {string}
 */
export function tileName(lang, tile) {
  if (tile.fake) return t(lang, 'falseJoker');
  return `${t(lang, COLOR_KEYS[tile.color])} ${tile.num}`;
}

function capitalize(text) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/**
 * One-line description of the last move, e.g. "Ayla took your red 7.".
 * @param {'en'|'tr'} lang
 * @param {{type:string, seat:number, tile:object|null, from?:number}} move
 * @param {number} dealNo
 * @returns {string}
 */
export function describeMove(lang, move, dealNo) {
  const you = move.seat === 0;
  const params = {
    p: seatName(lang, move.seat),
    q: move.from === undefined ? '' : seatName(lang, move.from),
    t: move.tile ? tileName(lang, move.tile) : '',
    n: dealNo,
  };
  let key = `move_${move.type}`;
  if (move.type === 'exhausted') return t(lang, key);
  if (move.type === 'take' && move.from === 0 && !you) key = 'move_take_from_you';
  else if (you) key += '_you';
  return capitalize(t(lang, key, params));
}
