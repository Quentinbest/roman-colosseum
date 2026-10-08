import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { resources, supportedLocales, LOCALE_KEY } from '../src/i18n.js';

const value = (locale, key) => key.split('.').reduce((node, part) => node[part], resources[locale].translation);
const same = (a, b) => a.length === b.length && a.every((n, index) => Math.abs(n - b[index]) < .00001);

export async function localization(browser, baseURL) {
  const results = [], errors = [];
  const check = (name, pass, evidence) => results.push({ name, pass: Boolean(pass), evidence });
  const context = await browser.newContext({ locale: 'en-US', reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  await context.route('https://**/*', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const url = `${baseURL}/roman-colosseum/`;
  const ready = async target => { await target.waitForFunction(() => window.colosseum?.ready); await target.locator('#loading').waitFor({ state: 'hidden' }); };
  const state = () => page.evaluate(() => window.colosseum.state());
  const select = locale => page.locator('#language-select').selectOption(locale);
  const layout = () => page.evaluate(() => {
    const selectors = ['.language-control', '.era-control', '.lighting', '.view-caption', '.bottom-controls', '.canvas-footer', '.viewer-tools', '.walk-hint', '.touch-move'];
    const viewer = document.querySelector('#viewer').getBoundingClientRect();
    const visible = element => element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
    const entries = selectors.map(selector => [selector, document.querySelector(selector)]).filter(([, element]) => visible(element));
    const clipped = entries.filter(([, element]) => {
      const rect = element.getBoundingClientRect();
      return rect.left < viewer.left - 1 || rect.right > viewer.right + 1 || rect.top < viewer.top - 1 || rect.bottom > viewer.bottom + 1 || element.scrollWidth > element.clientWidth + 1;
    }).map(([selector]) => selector);
    const overlaps = [];
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i][1].getBoundingClientRect(), b = entries[j][1].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) overlaps.push([entries[i][0], entries[j][0]]);
    }
    const navClipped = [...document.querySelectorAll('.view-copy strong')].some(element => element.scrollWidth > element.clientWidth + 1);
    return { clipped, overlaps, navClipped, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  await page.goto(url); await ready(page);
  check('Hosted assets resolve below /roman-colosseum/', await page.locator('html').getAttribute('lang') === 'en');
  check('Collapsed hotspot labels do not create invisible drag blockers', await page.locator('.hotspot').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().height <= 40)));

  for (const locale of supportedLocales) {
    await select(locale);
    check(`${locale}: document, metadata and accessible names`, await page.locator('html').getAttribute('lang') === locale && await page.title() === value(locale, 'meta.title') && await page.locator('meta[name="description"]').getAttribute('content') === value(locale, 'meta.description') && await page.locator('#scene').getAttribute('aria-label') === value(locale, 'ui.canvas'));
    for (const era of ['ruins', 'ancient']) {
      await page.locator(`[data-era="${era}"]`).click();
      for (const view of ['exterior', 'arena', 'seating', 'passages']) {
        await page.locator(`[data-view="${view}"]`).click();
        check(`${locale}/${era}/${view}: viewpoint text`, await page.locator('#view-title').textContent() === value(locale, `views.${era}.${view}.title`) && await page.locator('#view-description').textContent() === value(locale, `views.${era}.${view}.description`) && (await state()).view === view);
      }
      await page.locator('[data-view="exterior"]').click();
      for (const feature of ['wall', 'hypogeum', 'cavea']) {
        // Projection can occlude a hotspot; activation still exercises its real handler.
        await page.locator(`[data-hotspot="${feature}"]`).evaluate(element => element.click());
        const before = await state();
        const next = supportedLocales[(supportedLocales.indexOf(locale) + 1) % supportedLocales.length];
        await page.evaluate(() => { window.originalModelStats = window.colosseum.stats; });
        await select(next);
        const after = await state();
        check(`${locale}/${era}/${feature}: open card and camera survive language switching`, await page.locator('#feature-card').isVisible() && await page.locator('#feature-title').textContent() === value(next, `features.${era}.${feature}.title`) && await page.locator('#feature-text').textContent() === value(next, `features.${era}.${feature}.text`) && await page.locator(`[data-hotspot="${feature}"]`).getAttribute('aria-label') === value(next, `features.${era}.${feature}.learn`) && same(before.position, after.position) && same(before.quaternion, after.quaternion) && same(before.target, after.target) && before.era === after.era && await page.evaluate(() => window.originalModelStats === window.colosseum.stats));
        await select(locale); await page.locator('#feature-close').click();
      }
    }
    await page.locator('[data-light="golden"]').click();
    await page.locator('#rotate-toggle').click();
    await page.locator('#labels-toggle').click();
    const next = supportedLocales[(supportedLocales.indexOf(locale) + 1) % supportedLocales.length];
    await select(next); await select(locale);
    check(`${locale}: lighting, auto orbit and label settings survive`, (await state()).autoRotate && await page.locator('[data-light="golden"]').getAttribute('aria-pressed') === 'true' && await page.locator('#labels-toggle').getAttribute('aria-pressed') === 'false');
    await page.locator('#rotate-toggle').click(); await page.locator('#labels-toggle').click();
    await page.locator('[data-light="day"]').click();
    await page.locator('#walk-toggle').click();
    await page.keyboard.down('w'); await page.waitForTimeout(100);
    await page.locator('#language-select').focus();
    const before = await state(); await select(next); await select(locale); await page.waitForTimeout(150);
    const after = await state(); await page.keyboard.up('w');
    check(`${locale}: selector focus clears held movement and keeps walking pose`, after.walking && same(before.position, after.position) && same(before.quaternion, after.quaternion) && await page.locator('#walk-toggle span').first().textContent() === value(locale, 'ui.returnOverview'));
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('r');
    check(`${locale}: select keyboard input does not control the scene`, same(after.position, (await state()).position));
    await page.locator('#walk-toggle').click();
    await page.locator('#fullscreen').click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await select(next); await select(locale);
    check(`${locale}: fullscreen contains a usable localized selector`, await page.locator('#language-select').isVisible() && await page.evaluate(() => document.fullscreenElement.contains(document.querySelector('#language-select'))) && await page.locator('#fullscreen').getAttribute('aria-label') === value(locale, 'ui.exitFullscreen'));
    await page.locator('#fullscreen').click(); await page.waitForFunction(() => !document.fullscreenElement);
    for (const dialog of ['about', 'help']) {
      await page.locator(`#${dialog}-open`).click();
      check(`${locale}: ${dialog} dialog localized`, await page.locator(`#${dialog}-dialog h2`).textContent() === value(locale, `dialogs.${dialog}.title`));
      await page.keyboard.press('Escape');
    }
    for (const width of [320, 390, 391, 800, 801, 1100, 1101, 1500]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await layout();
      check(`${locale}: layout at ${width}px`, !result.overflow && !result.navClipped && !result.clipped.length && !result.overlaps.length, result);
      if ([320, 390].includes(width)) {
        await page.screenshot({ path: `test-results/localization/${locale}-${width}.png`, fullPage: true });
        await page.locator('#walk-toggle').click();
        const walkingLayout = await layout();
        check(`${locale}: walking layout at ${width}px`, !walkingLayout.clipped.length && !walkingLayout.overlaps.length, walkingLayout);
        await page.locator('#walk-toggle').click();
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    console.log(`Localization ${locale}: switching, state, fullscreen, walking and layout checked.`);
  }

  await select('en');
  // Schedule observations in the page so automation latency cannot consume the
  // notification's lifetime before we change its language or inspect it.
  const notification = await page.evaluate(expected => new Promise(resolve => {
    document.querySelector('#reset').click();
    let retranslated = false;
    setTimeout(() => {
      const select = document.querySelector('#language-select');
      select.value = 'es'; select.dispatchEvent(new Event('change', { bubbles: true }));
      const toast = document.querySelector('#toast');
      retranslated = toast.textContent === expected && toast.classList.contains('visible');
    }, 2200);
    setTimeout(() => resolve({ retranslated, expired: !document.querySelector('#toast').classList.contains('visible') }), 4100);
  }), value('es', 'messages.reset'));
  check('Visible notification is retranslated', notification.retranslated);
  check('Language change preserves notification expiry', notification.expired);

  await page.locator('[data-era="ruins"]').click(); await page.locator('[data-view="arena"]').click(); await page.locator('#walk-toggle').click();
  await page.keyboard.down('d');
  try { await page.waitForFunction(expected => document.querySelector('#toast').textContent === expected, value('es', 'messages.blocked'), { timeout: 10000 }); }
  finally { await page.keyboard.up('d'); }
  check('Blocked walking emits a localized message', await page.locator('#toast').textContent() === value('es', 'messages.blocked'));
  await page.locator('#walk-toggle').click();

  // Expanded strings stress the real layout without adding a shipped pseudo-locale.
  await page.evaluate(() => {
    for (const selector of ['[data-era]', '.view-copy strong', '#walk-toggle span:first-of-type', '#rotate-toggle span', '#labels-toggle span', '#view-title', '#view-description']) {
      document.querySelectorAll(selector).forEach(element => { element.textContent = `[!! ${element.textContent} ${element.textContent} !!]`; });
    }
  });
  for (const width of [320, 801, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const result = await layout();
    check(`Expanded pseudolocalization at ${width}px`, !result.overflow && !result.navClipped && !result.clipped.length && !result.overlaps.length, result);
    await page.screenshot({ path: `test-results/localization/pseudo-${width}.png`, fullPage: true });
  }
  await select('ja');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  const zoomLayout = await layout();
  check('200% zoom keeps controls within the viewer', !zoomLayout.overflow && !zoomLayout.clipped.length && !zoomLayout.overlaps.length, zoomLayout);
  await page.screenshot({ path: 'test-results/localization/zoom-200.png', fullPage: true });
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  check('Offline CJK system font fallback is declared', await page.locator('body').evaluate(element => /CJK|PingFang|Hiragino/.test(getComputedStyle(element).fontFamily)));
  check('No unexpected browser runtime errors', errors.length === 0, errors);
  await context.close();

  const visit = async (options = {}, setup) => {
    const context = await browser.newContext({ locale: 'zh-TW', reducedMotion: 'reduce', ...options });
    await context.route('https://**/*', route => route.abort());
    if (setup) await context.addInitScript(setup);
    const page = await context.newPage(); await page.goto(url);
    return { context, page };
  };
  const persisted = await visit(); await ready(persisted.page);
  check('HTTP fresh visit matches Traditional Chinese browser preference', await persisted.page.locator('html').getAttribute('lang') === 'zh-Hant');
  await persisted.page.locator('#language-select').selectOption('es'); await persisted.page.reload(); await ready(persisted.page);
  check('HTTP explicit choice persists across reload', await persisted.page.locator('html').getAttribute('lang') === 'es');
  await persisted.page.evaluate(key => localStorage.setItem(key, 'cimode'), LOCALE_KEY); await persisted.page.reload(); await ready(persisted.page);
  check('Invalid stored choice falls back to browser preference', await persisted.page.locator('html').getAttribute('lang') === 'zh-Hant');
  await persisted.context.close();
  const ordered = await visit({}, () => Object.defineProperty(navigator, 'languages', { value: ['fr-FR', 'ja-JP', 'en'] })); await ready(ordered.page);
  check('HTTP browser preference list skips unsupported languages', await ordered.page.locator('html').getAttribute('lang') === 'ja'); await ordered.context.close();
  const denied = await visit({}, () => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } })); await ready(denied.page);
  await denied.page.locator('#language-select').selectOption('ja');
  check('Denied storage still permits live selection', await denied.page.locator('html').getAttribute('lang') === 'ja'); await denied.context.close();

  for (const mode of ['building', 'webgl', 'failed']) {
    const fixture = await visit({ locale: 'es' }, mode === 'building' ? () => {
      const timeout = window.setTimeout; window.setTimeout = (fn, delay, ...args) => timeout(fn, delay === 60 ? 2500 : delay, ...args);
    } : mode === 'webgl' ? () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.startsWith('webgl') ? null : get.call(this, type, ...args); };
    } : () => {
      const get = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === '2d' ? null : get.call(this, type, ...args); };
    });
    await fixture.page.waitForFunction(expected => document.querySelector('#loading p').textContent === expected, value('es', `loading.${mode}.title`));
    await fixture.page.locator('#language-select').selectOption('zh-Hans');
    check(`${mode}: loading/error UI supports early language switching`, await fixture.page.locator('#loading p').textContent() === value('zh-Hans', `loading.${mode}.title`) && await fixture.page.locator('#loading small').textContent() === value('zh-Hans', `loading.${mode}.detail`));
    await fixture.context.close();
  }

  const failure = await visit({ locale: 'ja' }); await ready(failure.page);
  await failure.page.evaluate(() => { document.querySelector('#viewer').requestFullscreen = () => Promise.reject(new Error('Denied')); });
  await failure.page.locator('#fullscreen').click();
  check('Fullscreen rejection is localized', await failure.page.locator('#toast').textContent() === value('ja', 'messages.fullscreenFailed'));
  await failure.page.evaluate(() => { document.querySelector('#viewer').requestFullscreen = undefined; });
  await failure.page.locator('#fullscreen').click();
  check('Unavailable fullscreen is localized', await failure.page.locator('#toast').textContent() === value('ja', 'messages.fullscreenUnsupported'));
  await failure.page.evaluate(() => document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await failure.page.waitForFunction(expected => document.querySelector('#toast').textContent === expected, value('ja', 'messages.contextLost'));
  check('Actual WebGL context loss is localized', await failure.page.locator('#toast').textContent() === value('ja', 'messages.contextLost'));
  await failure.context.close();

  const offline = await browser.newContext({ offline: true, locale: 'ja-JP', reducedMotion: 'reduce' });
  const filePage = await offline.newPage(), requests = [];
  filePage.on('request', request => { if (/locales|\.json(?:\?|$)/.test(request.url())) requests.push(request.url()); });
  await filePage.goto(pathToFileURL(path.resolve('dist/colosseum.html')).href); await ready(filePage);
  for (const locale of supportedLocales) {
    await filePage.locator('#language-select').selectOption(locale);
    assert.equal(await filePage.locator('html').getAttribute('lang'), locale);
  }
  check('Direct-file standalone works offline with all five embedded locales', requests.length === 0, requests);
  const html = await fs.readFile('dist/colosseum.html', 'utf8');
  check('Standalone has no external script, stylesheet, or dynamic locale import', !/<script[^>]+src=|<link[^>]+rel="stylesheet"|import\(['"].*locales/.test(html));
  await offline.close();
  return { passed: results.filter(result => result.pass).length, failed: results.filter(result => !result.pass).length, results };
}
