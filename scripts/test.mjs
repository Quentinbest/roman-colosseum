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
const results = { completed: false, passed: 0, failed: 0, results: [] };
const contextOptions = { deviceScaleFactor: Number(process.env.TEST_DEVICE_SCALE_FACTOR ?? 1) };
const launchBrowser = () => chromium.launch({
  channel: process.env.PLAYWRIGHT_CHROMIUM ? 'chromium' : 'chrome',
  headless: process.env.PLAYWRIGHT_HEADED !== '1',
  args: process.env.PLAYWRIGHT_ANGLE ? ['--use-gl=angle', `--use-angle=${process.env.PLAYWRIGHT_ANGLE}`, '--ignore-gpu-blocklist'] : [],
});
try {
  browser = await launchBrowser();
  await fs.mkdir('test-results/regression', { recursive: true });
  await fs.mkdir('test-results/localization', { recursive: true });
  if (!process.argv.includes('--localization-only')) {
    const context = await browser.newContext({ locale: 'en-US', ...contextOptions });
    const page = await context.newPage();
    for (const file of ['tests/acceptance.js', 'tests/routes.js', 'tests/reconstruction.js']) {
      const source = (await fs.readFile(file, 'utf8')).replaceAll('/Users/quentin/workspace/roman-colosseum', process.cwd()).replaceAll('artifacts/', 'test-results/regression/');
      const suite = vm.runInNewContext(source, { Number, Math, Boolean, console });
      const started = Date.now();
      const suiteResults = await suite(page);
      results.results.push(...suiteResults.results);
      results.passed += suiteResults.passed;
      results.failed += suiteResults.failed;
      console.log(`${file}: ${suiteResults.passed} passed, ${suiteResults.failed} failed in ${Math.round((Date.now() - started) / 1000)}s`);
      await fs.writeFile('test-results/regression-results.json', JSON.stringify(results, null, 2));
    }
    await context.close();
    // The long geometry suites and localization matrix get separate browser sessions.
    await browser.close();
    browser = await launchBrowser();
  }
  const localized = await localization(browser, `http://127.0.0.1:${server.address().port}`, contextOptions);
  results.results.push(...localized.results); results.passed += localized.passed; results.failed += localized.failed;
  results.completed = true;
  console.log(JSON.stringify({ passed: results.passed, failed: results.failed, failures: results.results.filter(result => !result.pass) }, null, 2));
  process.exitCode = results.failed ? 1 : 0;
} catch (error) {
  results.error = error.stack ?? String(error);
  throw error;
} finally {
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile('test-results/acceptance-results.json', JSON.stringify(results, null, 2));
  await browser?.close();
  server.close();
}
