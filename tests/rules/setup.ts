import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
const [hostname, port] = host.split(':');

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-toli',
    firestore: {
      host: hostname ?? '127.0.0.1',
      port: Number(port ?? 8080),
      rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
    },
  });
}
