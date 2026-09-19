/**
 * Brings the Firestore mirror catalog/{cardId} in line with packages/catalog/cards.json.
 *
 *   pnpm catalog:sync                                   dry run against the local emulator
 *   pnpm catalog:sync --write                           write to the local emulator
 *   pnpm catalog:sync --project toli-app-dev            dry run against a real project
 *   pnpm catalog:sync --project toli-app-dev --write    write to it
 *
 * A dry run is the default. Without --project the script only ever talks to the emulator, and a
 * project whose id contains "prod" additionally needs --yes-prod. Real projects use Application
 * Default Credentials (`gcloud auth application-default login`). Nothing is ever deleted.
 */
import { SyncCatalogMirror } from '@toli/application';
import { CATALOG, CATALOG_VERSION } from '@toli/catalog';
import raw from '@toli/catalog/cards.json' with { type: 'json' };
import { catalogSchema } from '@toli/catalog/schema';
import { CardId, type CatalogCard } from '@toli/domain';
import { AdminCatalogMirror } from '@toli/infra-admin';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const EMULATOR_PROJECT = 'demo-toli';
const DEFAULT_EMULATOR_HOST = '127.0.0.1:8080';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function fail(message: string): never {
  console.error(`catalog:sync: ${message}`);
  process.exit(1);
}

const project = option('--project');
const write = flag('--write');

if (flag('--project') && !project) fail('--project needs a project id');
if (project && /prod/i.test(project) && write && !flag('--yes-prod'))
  fail(`${project} looks like production; re-run with --yes-prod if that is intended`);

if (project) {
  // A stray emulator variable must not silently redirect a run the caller aimed at a real project.
  delete process.env['FIRESTORE_EMULATOR_HOST'];
} else {
  process.env['FIRESTORE_EMULATOR_HOST'] ??= DEFAULT_EMULATOR_HOST;
  // The emulator needs no credentials; skip the GCE metadata probe and its timeout warning.
  process.env['METADATA_SERVER_DETECTION'] ??= 'none';
}

// The package's test validates cards.json on every PR; validate again here so a hand-edited or
// half-merged file can never reach Firestore.
const parsed = catalogSchema.safeParse(raw);
if (!parsed.success) fail(`cards.json is invalid:\n${parsed.error.message}`);

const cards: CatalogCard[] = CATALOG.map((c) => ({ ...c, id: CardId(c.id) }));
const target =
  project ?? `${EMULATOR_PROJECT} (emulator at ${process.env['FIRESTORE_EMULATOR_HOST']})`;
console.log(
  `catalog:sync: v${CATALOG_VERSION}, ${cards.length} cards -> ${target}${write ? '' : ' [dry run]'}`,
);

const db = getFirestore(initializeApp({ projectId: project ?? EMULATOR_PROJECT }));
const result = await new SyncCatalogMirror(new AdminCatalogMirror(db)).execute({
  cards,
  dryRun: !write,
});

const verb = write ? '' : 'would be ';
console.log(`  ${verb}created   ${result.created.length}`);
console.log(`  ${verb}updated   ${result.updated.length}`);
console.log(`  unchanged ${result.unchanged}`);
if (result.updated.length > 0) console.log(`  updated ids: ${result.updated.join(', ')}`);
if (result.orphaned.length > 0)
  console.warn(
    `  ORPHANED in the mirror, missing from cards.json (left in place): ${result.orphaned.join(', ')}`,
  );
if (!write) console.log('  dry run: nothing written. Re-run with --write to apply.');
