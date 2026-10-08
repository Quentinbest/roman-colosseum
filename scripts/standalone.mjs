import fs from 'node:fs';

const html = fs.readFileSync('dist/index.html', 'utf8');
const scriptPattern = /<script type="module" crossorigin src="([^"]+)"><\/script>/;
const stylePattern = /<link rel="stylesheet" crossorigin href="([^"]+)">/;
const script = fs.readFileSync(`dist${html.match(scriptPattern)[1]}`, 'utf8');
const style = fs.readFileSync(`dist${html.match(stylePattern)[1]}`, 'utf8');
const standalone = html
  .replace(scriptPattern, () => `<script type="module">${script.replaceAll('</script', '<\\/script')}</script>`)
  .replace(stylePattern, () => `<style>${style}</style>`);
fs.writeFileSync('dist/colosseum.html', standalone);
console.log('Self-contained preview: dist/colosseum.html');
