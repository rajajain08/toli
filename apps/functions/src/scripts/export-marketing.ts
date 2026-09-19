/**
 * Writes the marketing list (ADR-0013) to a CSV: name, phone, opted_in_at, cards. Only people who said yes.
 *
 *   pnpm marketing:export --out ~/toli-dev.marketing.csv                          from the local emulator
 *   pnpm marketing:export --project toli-app-dev --out ~/toli-dev.marketing.csv   from a real project
 *
 * The file holds phone numbers, so: --out is required (nothing is ever printed but counts), the file is
 * created readable by you alone, and a path inside this repository is refused unless it ends in
 * `.marketing.csv`, which .gitignore covers. Read-only: it never writes to Firestore. Real projects use
 * Application Default Credentials (`gcloud auth application-default login`).
 *
 * Messaging anyone who is not in this file is a compliance breach, not a product choice.
 */
import { ExportMarketingList, marketingCsv, type CardCatalogReader } from '@toli/application';
import { getCatalogCard } from '@toli/catalog';
import {
  AdminContactRepository,
  AdminUserCardRepository,
  AdminUserRepository,
} from '@toli/infra-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { chmodSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { homedir } from 'node:os';

const EMULATOR_PROJECT = 'demo-toli';
const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
function fail(message: string): never {
  console.error(`marketing:export: ${message}`);
  process.exit(1);
}

const project = option('--project');
const rawOut = option('--out');
if (args.includes('--project') && !project) fail('--project needs a project id');
if (!rawOut) fail('--out <file> is required. The list holds phone numbers and is never printed.');

const base = process.env['TOLI_INVOKED_FROM'] ?? process.cwd();
const expanded = rawOut.startsWith('~/') ? resolve(homedir(), rawOut.slice(2)) : rawOut;
const out = isAbsolute(expanded) ? expanded : resolve(base, expanded);
if (!existsSync(dirname(out))) fail(`the folder ${dirname(out)} does not exist`);

// Walk up from the output file; if a .git is found on the way, the file would sit inside a repository.
const repoRoot = (() => {
  let dir = dirname(out);
  for (;;) {
    if (existsSync(resolve(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
})();
if (repoRoot && !out.endsWith('.marketing.csv'))
  fail(
    `${relative(repoRoot, out)} is inside a git repository. Name it something.marketing.csv (git-ignored) or write it elsewhere.`,
  );

if (project) delete process.env['FIRESTORE_EMULATOR_HOST'];
else {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
  process.env['METADATA_SERVER_DETECTION'] ??= 'none';
}

const catalog: CardCatalogReader = { get: (id) => getCatalogCard(id) };
const db = getFirestore(initializeApp({ projectId: project ?? EMULATOR_PROJECT }));
const { rows, skipped } = await new ExportMarketingList(
  new AdminContactRepository(db),
  new AdminUserRepository(db),
  new AdminUserCardRepository(db),
  catalog,
).execute();

writeFileSync(out, marketingCsv(rows), { mode: 0o600 });
chmodSync(out, 0o600);

const target =
  project ?? `${EMULATOR_PROJECT} (emulator at ${process.env['FIRESTORE_EMULATOR_HOST']})`;
console.log(`marketing:export: ${target}`);
console.log(`  opted in, written   ${rows.length}`);
console.log(
  `  left out            ${skipped.noProfile} with no profile, ${skipped.consentOutdated} on an older consent text`,
);
console.log(`  file                ${out}  (readable by you only)`);
console.log('  Delete the file when the campaign is sent. Anyone not in it must not be messaged.');
