// @ts-check
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';

/**
 * Dependency rule from docs/architecture.md, enforced per package.
 * domain imports nothing; application imports only domain; Firebase only in infra-* and functions.
 */
const forbid = (files, patterns, message) => ({
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: patterns.map((group) => ({ group: [group], message })) },
    ],
  },
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/lib/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'apps/functions/deploy/**',
      'docs/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    plugins: { 'import-x': importX },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  forbid(
    ['packages/domain/src/**/*.ts'],
    [
      '@toli/*',
      'firebase',
      'firebase/*',
      'firebase-admin',
      'firebase-admin/*',
      'react',
      'react/*',
      'next',
      'next/*',
      'node:*',
    ],
    'packages/domain imports nothing (docs/architecture.md, dependency rule).',
  ),
  forbid(
    ['packages/application/src/**/*.ts'],
    [
      '@toli/infra-*',
      '@toli/ui',
      '@toli/catalog',
      'firebase',
      'firebase/*',
      'firebase-admin',
      'firebase-admin/*',
      'react',
      'react/*',
      'next',
      'next/*',
    ],
    'packages/application imports only @toli/domain.',
  ),
  forbid(
    ['packages/infra-client/src/**/*', 'packages/infra-admin/src/**/*'],
    ['react', 'react/*', 'next', 'next/*', '@toli/ui'],
    'infra packages never import react or next.',
  ),
  forbid(
    ['packages/ui/src/**/*'],
    [
      'firebase',
      'firebase/*',
      'firebase-admin',
      'firebase-admin/*',
      '@toli/application',
      '@toli/infra-*',
      'next',
      'next/*',
    ],
    'packages/ui imports only react.',
  ),
  forbid(
    ['packages/catalog/src/**/*'],
    [
      '@toli/*',
      'firebase',
      'firebase/*',
      'firebase-admin',
      'firebase-admin/*',
      'react',
      'react/*',
      'next',
      'next/*',
    ],
    'packages/catalog is a shared seed with no runtime dependencies on other packages.',
  ),
  forbid(
    ['apps/functions/src/**/*'],
    [
      'react',
      'react/*',
      'next',
      'next/*',
      '@toli/infra-client',
      '@toli/ui',
      'firebase',
      'firebase/*',
    ],
    'apps/functions imports domain, application and infra-admin only.',
  ),
  forbid(
    ['apps/web/src/**/*'],
    ['firebase-admin/*', '@toli/infra-admin'],
    'apps/web uses the client SDK; the only admin usage is in the /join/[code] server route (see its own override).',
  ),
  {
    files: ['apps/web/src/app/join/**/*'],
    rules: { 'no-restricted-imports': 'off' },
  },
);
