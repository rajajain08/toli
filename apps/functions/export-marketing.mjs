// Bundles src/scripts/export-marketing.ts with the workspace packages inlined (same recipe as
// sync-catalog.mjs) and runs it, passing the arguments through. See the script's header for usage.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const outfile = 'node_modules/.cache/toli/export-marketing.js';

await build({
  entryPoints: ['src/scripts/export-marketing.ts'],
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

// INIT_CWD is where the person ran pnpm from, so a relative --out lands where they expect.
const { status } = spawnSync(process.execPath, [outfile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, TOLI_INVOKED_FROM: process.env.INIT_CWD ?? process.cwd() },
});
process.exit(status ?? 1);
