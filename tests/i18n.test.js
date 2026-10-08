import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalization, matchLocale, resolveLocale, resources, supportedLocales, LOCALE_KEY, initializeLocale, changeLocale, getLocale, formatNumber, formatMetres } from '../src/i18n.js';
import { validateCatalogs } from '../scripts/check-i18n.mjs';

test('browser matching respects explicit scripts before regions', () => {
  for (const [input, expected] of Object.entries({ 'en-GB': 'en', 'ja-JP': 'ja', 'es-MX': 'es', 'es-419': 'es', zh: 'zh-Hans', 'zh-CN': 'zh-Hans', 'zh-SG': 'zh-Hans', 'zh-TW': 'zh-Hant', 'zh-HK': 'zh-Hant', 'zh-MO': 'zh-Hant', 'zh-Hans-TW': 'zh-Hans', 'zh-Hant-CN': 'zh-Hant', 'ZH-hant': 'zh-Hant' })) assert.equal(matchLocale(input), expected, input);
  for (const input of [null, {}, '', 'xx-!', 'zh_CN', 'fr-FR', 'zh-Latn']) assert.equal(matchLocale(input), null);
});

test('saved catalog choices precede the first supported browser language', () => {
  assert.equal(resolveLocale('ja', ['es', 'en']), 'ja');
  for (const invalid of ['fr', 'es-MX', '', 'cimode', '__proto__', null]) assert.equal(resolveLocale(invalid, ['fr-FR', 'zh-HK', 'ja']), 'zh-Hant');
  assert.equal(resolveLocale(undefined, ['de', 'fr']), 'en');
  assert.equal(resolveLocale(undefined, []), 'en');
});

test('missing target entries fall back to English; missing source keys stay visible', () => {
  const catalogs = structuredClone(resources);
  delete catalogs.ja.translation.ui.about;
  const instance = createLocalization('ja', catalogs);
  assert.equal(instance.t('ui.about'), resources.en.translation.ui.about);
  assert.equal(instance.t('missing.key'), '⟦missing.key⟧');
  assert.equal(instance.t('ui.metres', { value: '1.5' }), '1.5 m');
});

test('removing a supported locale invalidates stale choices without reassigning resources', () => {
  const index = supportedLocales.indexOf('zh-Hant');
  supportedLocales.splice(index, 1);
  try {
    assert.equal(resolveLocale('zh-Hant', ['zh-TW', 'es']), 'es');
    assert.equal(createLocalization('ja').t('ui.language'), '言語');
  } finally { supportedLocales.splice(index, 0, 'zh-Hant'); }
});

test('raw validation rejects holes, missing source families, empty values, markup and placeholder drift', () => {
  const valid = Object.fromEntries(Object.entries(resources).map(([locale, resource]) => [locale, resource.translation]));
  assert.deepEqual(validateCatalogs(valid), []);
  const missing = structuredClone(valid); delete missing.es.ui.about;
  assert.ok(validateCatalogs(missing).some(error => error.includes('es: missing/empty/non-string ui.about')));
  for (const value of ['', '<b>Idioma</b>', 'Language']) {
    const broken = structuredClone(valid); broken.es.ui.language = value;
    assert.ok(validateCatalogs(broken).length);
  }
  const placeholders = structuredClone(valid); placeholders.ja.ui.metres = '{{wrong}} m';
  assert.ok(validateCatalogs(placeholders).some(error => error.includes('placeholder mismatch')));
  const noSource = structuredClone(valid);
  for (const catalog of Object.values(noSource)) delete catalog.features.ancient.hypogeum.title;
  assert.ok(validateCatalogs(noSource).some(error => error.includes('en: required key features.ancient.hypogeum.title')));
});

test('storage failures preserve the in-memory choice and formatting follows the locale', () => {
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const navigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['fr', 'ja-JP'] } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Denied'); } });
    initializeLocale(); assert.equal(getLocale(), 'ja');
    changeLocale('es'); assert.equal(getLocale(), 'es');
    assert.equal(formatNumber(12.5), '12,5');
    assert.equal(formatMetres(12.5), '12,5 m');
    changeLocale('zh-Hans'); assert.equal(formatMetres(12.5), '12.5 米');
    changeLocale('cimode'); assert.equal(getLocale(), 'zh-Hans');
    let saved;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => { assert.equal(key, LOCALE_KEY); return 'zh-Hant'; }, setItem: (key, value) => { assert.equal(key, LOCALE_KEY); saved = value; } } });
    initializeLocale(); assert.equal(getLocale(), 'zh-Hant');
    changeLocale('en'); assert.equal(saved, 'en');
  } finally {
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage;
    if (navigator) Object.defineProperty(globalThis, 'navigator', navigator); else delete globalThis.navigator;
    changeLocale('en');
  }
});
