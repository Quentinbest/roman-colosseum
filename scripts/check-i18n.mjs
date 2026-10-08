import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const locales = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'es'];
export const flatten = (node, prefix = '') => Object.fromEntries(Object.entries(node).flatMap(([key, value]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(flatten(value, path)) : [[path, value]];
}));
const placeholders = value => [...value.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map(match => match[1]).sort().join(',');
const sharedValues = new Set(['ui.metres', 'ui.footprintValue']);
// Names, coordinates, keyboard bindings, catalog numbers, and decorative glyphs only.
export const preservedText = new Set(['MONUMENT', 'ATLAS', 'Amphitheatrum Flavium', 'English', '简体中文', '繁體中文', '日本語', 'Español', 'W A S D', 'Shift', 'Esc', 'N', 'W', 'E', 'S', '41°53′25.1″N', '12°29′32.2″E', '01', '02', '03', '04', '01—04', '.', '↗', '↑', '←', '↓', '→', '+', '?', '×', '✳', '48 m', '189 × 156 m', '20 m']);

export function validateCatalogs(catalogs) {
  const errors = [], english = flatten(catalogs.en);
  for (const locale of locales) {
    const entries = flatten(catalogs[locale] ?? {});
    for (const key of Object.keys(english)) {
      const value = entries[key];
      if (typeof value !== 'string' || !value.trim()) { errors.push(`${locale}: missing/empty/non-string ${key}`); continue; }
      if (/<[^>]+>/.test(value)) errors.push(`${locale}: HTML is not allowed in ${key}`);
      if (typeof english[key] === 'string' && placeholders(value) !== placeholders(english[key])) errors.push(`${locale}: placeholder mismatch ${key}`);
      if (locale !== 'en' && value === english[key] && !sharedValues.has(key)) errors.push(`${locale}: untranslated ${key}`);
    }
    for (const key of Object.keys(entries)) if (!(key in english)) errors.push(`${locale}: extra key ${key}`);
  }
  // Validate dynamic families independently of English so deleting a key from every
  // catalog cannot make a required runtime lookup disappear from validation.
  const requireKey = key => { if (typeof english[key] !== 'string') errors.push(`en: required key ${key}`); };
  for (const era of ['ruins', 'ancient']) {
    for (const view of ['exterior', 'arena', 'seating', 'passages']) {
      for (const field of ['title', 'description']) requireKey(`views.${era}.${view}.${field}`);
      for (const field of ['index', 'mode']) requireKey(`views.ruins.${view}.${field}`);
    }
    for (const feature of ['wall', 'hypogeum', 'cavea']) for (const field of ['label', 'title', 'text', 'learn']) requireKey(`features.${era}.${feature}.${field}`);
    for (const field of ['note', 'sidebar']) requireKey(`eras.${era}.${field}`);
  }
  for (const state of ['building', 'failed', 'webgl']) for (const field of ['title', 'detail']) requireKey(`loading.${state}.${field}`);
  return errors;
}

export function checkSource(catalogs, html, javascript) {
  const errors = [], english = flatten(catalogs.en);
  const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
  const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], decode(match[2])]));
  const stack = [];
  for (const token of html.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (token.startsWith('</')) { stack.pop(); continue; }
    if (token.startsWith('<')) {
      if (/^<!/.test(token)) continue;
      const attrs = attributes(token), tag = token.match(/^<(\w+)/)?.[1];
      for (const [attribute, key] of Object.entries(attrs)) {
        if (!attribute.startsWith('data-i18n')) continue;
        if (!(key in english)) errors.push(`HTML references missing key ${key}`);
        if (attribute !== 'data-i18n' && attrs[attribute.slice(10)] !== english[key]) errors.push(`HTML attribute differs from English: ${key}`);
      }
      for (const attr of ['aria-label', 'title']) if (attrs[attr] && !attrs[`data-i18n-${attr}`]) errors.push(`Unbound ${attr}: ${attrs[attr]}`);
      if (!/\/>$/.test(token) && !['meta', 'link', 'br', 'input', 'hr'].includes(tag)) stack.push({ tag, attrs });
      continue;
    }
    const value = decode(token.trim());
    if (!value || stack.some(item => ['script', 'style', 'svg'].includes(item.tag))) continue;
    const binding = stack.findLast(item => item.attrs['data-i18n']);
    if (binding) {
      const key = binding.attrs['data-i18n'];
      if (english[key] !== value) errors.push(`HTML text differs from English: ${key}`);
    } else if (!preservedText.has(value)) errors.push(`Unbound HTML text: ${value}`);
  }
  for (const match of javascript.matchAll(/['"]((?:ui|messages|dialogs|meta|loading|eras|features|views)\.[\w.]+)['"]/g)) {
    if (!(match[1] in english)) errors.push(`JavaScript references missing key ${match[1]}`);
  }
  if (/\.innerHTML\s*=/.test(javascript)) errors.push('Use textContent/DOM nodes instead of translated innerHTML');
  if (/\.textContent\s*=\s*['"][A-Za-z][^'"]*\s[^'"]*['"]/.test(javascript)) errors.push('Hard-coded JavaScript display text');
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const catalogs = Object.fromEntries(locales.map(locale => [locale, JSON.parse(fs.readFileSync(`src/locales/${locale}.json`, 'utf8'))]));
  const errors = [...validateCatalogs(catalogs), ...checkSource(catalogs, fs.readFileSync('index.html', 'utf8'), ['src/main.js', 'src/navigation.js'].map(file => fs.readFileSync(file, 'utf8')).join('\n'))];
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Catalog coverage and English HTML parity: ${locales.length} locales × ${Object.keys(flatten(catalogs.en)).length} entries passed. No count-dependent messages currently require plural variants.`);
}
