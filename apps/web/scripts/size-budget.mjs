// Initial-JS budget from docs/architecture.md: <= 180 KB gzipped per route, measured from Next's own
// app-build-manifest (exactly the scripts a route ships), not a glob over the chunks directory.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 180;
const manifest = JSON.parse(readFileSync('.next/app-build-manifest.json', 'utf8'));
let failed = false;
for (const [route, files] of Object.entries(manifest.pages)) {
  if (!route.endsWith('/page')) continue;
  const total = files
    .filter((f) => f.endsWith('.js'))
    .reduce((sum, f) => sum + gzipSync(readFileSync(`.next/${f}`), { level: 9 }).length, 0);
  const kb = total / 1024;
  const ok = kb <= LIMIT_KB;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${kb.toFixed(1).padStart(7)} KB gz  ${route}`);
}
console.log(`budget ${LIMIT_KB} KB gz per route`);
process.exit(failed ? 1 : 0);
