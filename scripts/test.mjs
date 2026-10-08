import fs from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import { localization } from '../tests/localization.js';

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/roman-colosseum/')) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(pathname.slice('/roman-colosseum/'.length)) || 'index.html';
    const file = path.resolve('dist', relative);
    if (!file.startsWith(`${path.resolve('dist')}${path.sep}`)) { response.writeHead(403).end(); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }).end(await fs.readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
let browser;
const launchBrowser = () => chromium.launch({ channel: process.env.PLAYWRIGHT_CHROMIUM ? 'chromium' : 'chrome', headless: true });
try {
  browser = await launchBrowser();
  await fs.mkdir('test-results/regression', { recursive: true });
  await fs.mkdir('test-results/localization', { recursive: true });
  const results = { passed: 0, failed: 0, results: [] };
  if (!process.argv.includes('--localization-only')) {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    for (const file of ['tests/acceptance.js', 'tests/routes.js', 'tests/reconstruction.js']) {
      const source = (await fs.readFile(file, 'utf8')).replaceAll('/Users/quentin/workspace/roman-colosseum', process.cwd()).replaceAll('artifacts/', 'test-results/regression/');
      const suite = vm.runInNewContext(source, { Number, Math, Boolean });
      const suiteResults = await suite(page);
      results.results.push(...suiteResults.results);
      results.passed += suiteResults.passed;
      results.failed += suiteResults.failed;
      console.log(`${file}: ${suiteResults.passed} passed, ${suiteResults.failed} failed`);
    }
    await context.close();
    await fs.writeFile('test-results/regression-results.json', JSON.stringify(results, null, 2));
    // The long geometry suites and localization matrix get separate browser sessions.
    await browser.close();
    browser = await launchBrowser();
  }
  const localized = await localization(browser, `http://127.0.0.1:${server.address().port}`);
  results.results.push(...localized.results); results.passed += localized.passed; results.failed += localized.failed;
  await fs.writeFile('test-results/acceptance-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, failures: results.results.filter(result => !result.pass) }, null, 2));
  process.exitCode = results.failed ? 1 : 0;
} finally {
  await browser?.close();
  server.close();
}
