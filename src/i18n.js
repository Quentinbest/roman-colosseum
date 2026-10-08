import { createInstance } from 'i18next';
import en from './locales/en.json' with { type: 'json' };
import zhHans from './locales/zh-Hans.json' with { type: 'json' };
import zhHant from './locales/zh-Hant.json' with { type: 'json' };
import ja from './locales/ja.json' with { type: 'json' };
import es from './locales/es.json' with { type: 'json' };

export const LOCALE_KEY = 'monument-atlas.colosseum.locale.v1';
export const supportedLocales = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'es'];
export const resources = {
  en: { translation: en },
  'zh-Hans': { translation: zhHans },
  'zh-Hant': { translation: zhHant },
  ja: { translation: ja },
  es: { translation: es },
};

export function matchLocale(value) {
  if (typeof value !== 'string' || !value) return null;
  let locale;
  try { locale = new Intl.Locale(value); } catch { return null; }
  if (locale.language === 'zh') {
    if (locale.script === 'Hant') return 'zh-Hant';
    if (locale.script === 'Hans') return 'zh-Hans';
    if (locale.script) return null;
    return ['TW', 'HK', 'MO'].includes(locale.region) ? 'zh-Hant' : 'zh-Hans';
  }
  return ['en', 'ja', 'es'].includes(locale.language) ? locale.language : null;
}

export function resolveLocale(saved, languages = []) {
  // Only explicit catalog identifiers are valid saved choices.
  if (supportedLocales.includes(saved)) return saved;
  for (const language of languages) {
    const match = matchLocale(language);
    if (supportedLocales.includes(match)) return match;
  }
  return 'en';
}

export function createLocalization(locale = 'en', catalogs = resources) {
  const instance = createInstance();
  instance.init({
    lng: resolveLocale(locale), supportedLngs: supportedLocales, fallbackLng: 'en',
    load: 'currentOnly', resources: catalogs, initAsync: false,
    interpolation: { escapeValue: false }, returnEmptyString: false,
    parseMissingKeyHandler: key => `⟦${key}⟧`,
  });
  return instance;
}

export const i18n = createLocalization();
export const t = (key, parameters) => i18n.t(key, parameters);
export const getLocale = () => i18n.language;

export function initializeLocale() {
  let saved;
  try { saved = globalThis.localStorage?.getItem(LOCALE_KEY); } catch { /* Storage may be denied. */ }
  i18n.changeLanguage(resolveLocale(saved, globalThis.navigator?.languages ?? []));
}

export function changeLocale(locale) {
  if (!supportedLocales.includes(locale)) return;
  i18n.changeLanguage(locale);
  try { globalThis.localStorage?.setItem(LOCALE_KEY, locale); } catch { /* Keep the in-memory choice. */ }
}

const numberFormats = new Map();
export function formatNumber(value) {
  const locale = getLocale();
  if (!numberFormats.has(locale)) numberFormats.set(locale, new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }));
  return numberFormats.get(locale).format(value);
}
export const formatMetres = value => t('ui.metres', { value: formatNumber(value) });
