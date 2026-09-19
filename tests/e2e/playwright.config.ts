import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts/,
  timeout: 30_000,
  // The dev server compiles routes and the lazy Firebase chunk on first hit; 5 s is too tight when
  // several workers arrive cold at once.
  expect: { timeout: 10_000 },
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'android', use: { ...devices['Pixel 7'] } }],
  webServer: {
    // A production build, not `next dev`: it is what people actually get, and the dev server compiling
    // routes on demand under several parallel workers made first hits slow enough to time out.
    command: 'pnpm --filter @toli/web build && pnpm --filter @toli/web start',
    url: 'http://127.0.0.1:3000/groups',
    // Never reuse: a server left over from an earlier run serves an old build, and the suite would test that
    // without saying so. If the port is taken, Playwright fails loudly instead.
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-toli.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-toli',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:demo:web:demo',
      NEXT_PUBLIC_USE_EMULATORS: '1',
      NEXT_PUBLIC_EMULATOR_HOST: '127.0.0.1',
      // The /join/[code] server route reads the invite preview through the Admin SDK.
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      GCLOUD_PROJECT: 'demo-toli',
    },
  },
});
