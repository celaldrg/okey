import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadValue, saveValue } from '../src/storage.js';

test('storage falls back safely when localStorage is missing or throws', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.equal(loadValue('lang', 'en'), 'en');
    assert.equal(saveValue('lang', 'tr'), false);
    const store = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    });
    assert.equal(saveValue('lang', 'tr'), true);
    assert.equal(loadValue('lang', 'en'), 'tr');
    assert.equal(loadValue('other', 5), 5);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
