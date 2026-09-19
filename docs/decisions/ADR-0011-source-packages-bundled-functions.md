# ADR-0011: Packages ship TypeScript source; functions are bundled by esbuild

- Status: accepted
- Date: 2026-09-18

## Context

`domain`, `application`, `catalog`, `ui`, `infra-client` and `infra-admin` are consumed by three different hosts: Next.js (webpack or Turbopack), Cloud Functions (Node 22 on Cloud Build, which runs `npm install` and cannot resolve pnpm `workspace:*` links) and Vitest. A per-package `tsc` build step would add `dist/` outputs, ordering in Turborepo and stale-build bugs, and would still not solve the functions deploy problem.

## Decision

Every workspace package exports its TypeScript source directly (`"exports": { ".": "./src/index.ts" }`) and has no build step; each host compiles it. Next.js lists them in `transpilePackages`. `apps/functions` bundles `src/index.ts` with esbuild into a self-contained `deploy/` directory (one `index.js` plus a package.json listing only the Firebase SDKs), inlining the workspace packages and leaving only `firebase-admin` and `firebase-functions` external, so the deployed artefact has no workspace dependencies. Relative imports inside packages carry no extension and every package uses `moduleResolution: "Bundler"`.

## Consequences

- No `dist/` anywhere; `pnpm typecheck` is the only per-package check and Turborepo has nothing to order.
- The functions artefact is one file; the emulator and Cloud Build see the same code.
- Nothing in `packages/` can be run by plain Node without a loader. That is acceptable: the packages are libraries, and the two apps are the only entry points.
- If a package is ever published outside the monorepo (the Expo path in ADR-0008), it gains a build step then.
