// Bundles the functions entry with the workspace packages inlined into deploy/, a self-contained
// directory Firebase can deploy: one index.js plus a package.json with only the Firebase SDKs, so
// Cloud Build's npm install never sees a `workspace:*` dependency. The emulator points at deploy/ too.
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
mkdirSync('deploy', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'deploy/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

writeFileSync(
  'deploy/package.json',
  JSON.stringify(
    {
      name: 'toli-functions',
      private: true,
      type: 'module',
      main: 'index.js',
      engines: { node: '22' },
      dependencies: pkg.dependencies,
    },
    null,
    2,
  ) + '\n',
);
if (existsSync('.secret.local')) copyFileSync('.secret.local', 'deploy/.secret.local');

// The Firebase CLI resolves the SDK from <source>/node_modules to discover triggers; link the
// workspace copies. Deploy ignores node_modules, so the links never leave this machine.
import { symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('deploy/node_modules', { recursive: true });
for (const dep of [...Object.keys(pkg.dependencies), '.bin']) {
  const link = `deploy/node_modules/${dep}`;
  if (!existsSync(link)) symlinkSync(resolve('node_modules', dep), link, 'dir');
}
