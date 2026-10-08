import fs from 'node:fs';

const indexUrl = new URL('../dist/index.html', import.meta.url);
const html = fs.readFileSync(indexUrl, 'utf8');
const scriptPattern = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
const stylePattern = /<link rel="stylesheet" crossorigin href="([^"]+)">/;
const script = fs.readFileSync(new URL(html.match(scriptPattern)[1], indexUrl), 'utf8');
const style = fs.readFileSync(new URL(html.match(stylePattern)[1], indexUrl), 'utf8');
const standalone = html
  .replace(scriptPattern, () => `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`)
  .replace(stylePattern, () => `<style>${style}</style>`);
fs.writeFileSync(new URL('colosseum.html', indexUrl), standalone);
console.log('Self-contained preview: dist/colosseum.html');
