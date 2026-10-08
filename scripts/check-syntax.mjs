import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

for (const directory of ['src', 'scripts', 'tests']) {
  for (const name of fs.readdirSync(directory).filter(name => /\.m?js$/.test(name))) {
    const result = spawnSync(process.execPath, ['--check', `${directory}/${name}`], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
console.log('JavaScript syntax checks passed.');
