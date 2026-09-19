// Bundles src/scripts/sync-catalog.ts with the workspace packages inlined (same recipe as build.mjs)
// and runs it, passing the arguments through. See the script's header for usage.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

// Not deploy/: that directory is uploaded to Cloud Functions. node_modules is ignored everywhere.
const outfile = 'node_modules/.cache/toli/sync-catalog.js';

await build({
  entryPoints: ['src/scripts/sync-catalog.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  external: ['firebase-admin', 'firebase-admin/*'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'warning',
});

const { status } = spawnSync(process.execPath, [outfile, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(status ?? 1);
