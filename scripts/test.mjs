import fs from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const source = (await fs.readFile('tests/acceptance.js', 'utf8')).replaceAll('/Users/quentin/workspace/roman-colosseum', process.cwd());
  const acceptance = vm.runInNewContext(source, { Number, Math, Boolean });
  await fs.mkdir('artifacts', { recursive: true });
  const results = await acceptance(page);
  for (const file of ['tests/routes.js', 'tests/reconstruction.js']) {
    const suite = vm.runInNewContext(await fs.readFile(file, 'utf8'), { Number, Math, Boolean });
    const suiteResults = await suite(page);
    results.results.push(...suiteResults.results);
    results.passed += suiteResults.passed;
    results.failed += suiteResults.failed;
  }
  await fs.writeFile('artifacts/acceptance-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exitCode = results.failed ? 1 : 0;
} finally {
  await browser.close();
}
