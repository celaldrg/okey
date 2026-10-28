import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, keysOf, rulesText, describeMove, tileName, seatName, normalizeLang } from '../src/i18n.js';

const red7 = { id: 6, color: 0, num: 7, fake: false };

test('English and Turkish define the same keys and rule paragraphs', () => {
  assert.deepEqual(keysOf('tr').sort(), keysOf('en').sort());
  assert.equal(rulesText('tr').length, rulesText('en').length);
  assert.equal(normalizeLang('de'), 'en');
});

test('every data-i18n key used in index.html exists', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="(\w+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 5);
  for (const key of keys) assert.ok(keysOf('en').includes(key), key);
});

test('placeholders are filled and moves are described in both languages', () => {
  assert.equal(t('en', 'pts', { n: 18 }), '18 pts');
  assert.equal(tileName('tr', red7), 'kırmızı 7');
  assert.equal(seatName('en', 0), 'You');
  assert.equal(describeMove('en', { type: 'take', seat: 1, tile: red7, from: 0 }, 1), 'Ayla took your red 7.');
  assert.equal(describeMove('tr', { type: 'take', seat: 1, tile: red7, from: 0 }, 1), 'Ayla senin kırmızı 7 taşını aldı.');
  assert.equal(describeMove('tr', { type: 'discard', seat: 0, tile: red7 }, 1), 'Kırmızı 7 attın.');
  assert.equal(describeMove('en', { type: 'deal', seat: 2, tile: null }, 3), 'Deal 3: Kerem starts.');
  for (const lang of ['en', 'tr']) {
    for (const type of ['deal', 'draw', 'take', 'discard', 'show', 'finish', 'exhausted']) {
      for (const seat of [0, 2]) {
        const text = describeMove(lang, { type, seat, tile: red7, from: 3 }, 4);
        assert.ok(text.length > 5 && !/[{}]/.test(text), `${lang} ${type} ${seat}: ${text}`);
      }
    }
  }
});
