# toli

Know whose card to use before the bill comes. A shared directory of which cards your friends hold — names and perks only, never numbers.

- Architecture and plan: [`docs/architecture.md`](docs/architecture.md)
- Build plan and milestone status: [`docs/plan.md`](docs/plan.md)
- Design mockups: [`docs/design/`](docs/design/)
- Decisions: [`docs/decisions/`](docs/decisions/)

Stack: Next.js 15 PWA, Firebase (Auth, Firestore, Functions, App Hosting), pnpm workspaces, clean architecture with function-projected read models.

## Layout

```
packages/domain        entities, invariants, errors            imports nothing
packages/application   use cases, ports, in-memory test ports  imports domain
packages/catalog       cards.json + zod schema + search        shared seed
packages/ui            tokens and primitives from the mockups  imports react
packages/infra-client  Firebase client adapters                implements ports
packages/infra-admin   Firebase Admin adapters                 implements ports
apps/web               Next.js app, composition root
apps/functions         Cloud Functions (asia-south1), bundled with esbuild
tests/rules            Firestore rules tests (emulator)
tests/functions        functions integration tests (emulator)
tests/e2e              Playwright golden path (emulator)
```

## Local setup

Requires Node 24, pnpm 10 and Java 21+ (for the emulators).

```sh
pnpm install
cp apps/web/.env.example apps/web/.env.local   # already points at the emulators
pnpm emulators                                 # Auth, Firestore, Functions, UI on :4000
pnpm --filter @toli/web dev                    # http://127.0.0.1:3000
```

## Checks

The four CI tiers, in order of cost:

```sh
pnpm lint && pnpm typecheck && pnpm test   # ESLint + Prettier, tsc, Vitest with in-memory ports
pnpm test:rules                            # @firebase/rules-unit-testing on the Firestore emulator
pnpm test:functions                        # callables and triggers on the emulator
pnpm test:e2e                              # Playwright against the dev server and the emulators
```

`pnpm test:all` runs everything. Never point local code at `toli-prod`.
