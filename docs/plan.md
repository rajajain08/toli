# Toli — build plan

2026-09-18 · derived from `architecture.md`. One milestone per branch, one PR per milestone. Tick boxes as work lands.

Toolchain pinned for the repo (ADR-0011 for the packaging shape): Node 24, pnpm 10, Turborepo 2, TypeScript 5.9, Next.js 15.5, React 19, Firebase JS SDK 12, firebase-admin 14, firebase-functions 7 (2nd gen), Vitest 5, Playwright 1.6x, ESLint 10 flat config. Emulators need Java 21+.

## Milestone 1 — Skeleton (`m1-skeleton`)

Done when a PR runs all four test tiers green.

- [x] pnpm workspace, Turborepo pipeline (`build`, `lint`, `typecheck`, `test`, `test:rules`, `test:functions`, `test:e2e`)
- [x] Root tooling: TypeScript base config, ESLint flat config with the dependency rule as `no-restricted-imports` per package, Prettier, `.nvmrc`
- [x] `packages/domain`: branded ids, `User`, `CatalogCard`, `UserCard`, `Audience`, `Membership`, `Invite`, domain errors, every invariant with a Vitest test
- [x] `packages/application`: port interfaces, `Clock`, `IdGenerator`, `RateLimiter`, in-memory ports under `src/testing`, one smoke use case (`ListMyCards`) to prove the wiring
- [x] `packages/catalog`: `cards.json` seed (~40 Indian cards), zod schema, validator test, typed export
- [x] `packages/ui`: tokens (Ivory, Slate, Clay, Oat, greys, type scale, radii, elevation), CSS variables, `CardTile`, `Chip`, `Toggle`, `AvatarRow`, `TabBar` primitives, one render test each
- [x] `packages/infra-client`: Firebase app init with `persistentLocalCache`, `useLiveCollection` hook, `FirestoreUserCardRepository` stub against emulator
- [x] `packages/infra-admin`: Admin init, `AdminUserRepository` stub
- [x] `apps/web`: Next 15 App Router, PWA manifest, `container.ts` composition root, empty authenticated shell, `/join/[code]` placeholder
- [x] `apps/functions`: 2nd gen, `asia-south1`, `container.ts`, one `ping` callable
- [x] `firebase.json` (emulators for auth, firestore, functions, hosting), `firestore.rules` from the spec, `firestore.indexes.json`, `.firebaserc` with `dev`/`prod` aliases
- [x] Rules tests with `@firebase/rules-unit-testing`: own docs allowed, other user's docs denied, audience read requires membership, invites never readable, catalog read requires auth
- [x] Functions emulator test: `ping` callable answers
- [x] Playwright golden-path skeleton: app boots against emulators, renders the shell
- [x] `.github/workflows/ci.yml`: install, lint, typecheck, unit, rules, functions, e2e; size-limit budget 180 KB gz on the web bundle
- [ ] PR opened, CI green, merged

## Milestone 2 — Identity (`m2-identity`)

Done when a fresh phone signs up on the dev URL. Needs `toli-dev` Firebase project, phone auth enabled, App Check reCAPTCHA Enterprise key, HMAC secret in Secret Manager.

- [ ] `CreateUserProfile` use case: name, consent timestamp, phoneHash; test with in-memory ports
- [ ] `onUserCreate` callable `completeSignup` writes `users/{uid}` (server computes the HMAC; client never sees the secret)
- [ ] Web: `/auth` route, lazy-loaded Auth + reCAPTCHA, OTP form, name + consent screen (from `Main.dc.html` copy)
- [ ] App Check enforced on Firestore and callables; emulator debug token locally
- [ ] Auth guard in the shell; redirect to `/auth` when signed out
- [ ] Rules test: `users/{uid}` write allowed for self, denied for others; `phoneHash` cannot be written by the client
- [ ] GA4 events `otp_completed`
- [ ] Dev deploy from `main` via App Hosting

## Milestone 3 — My cards (`m3-my-cards`)

Done when usable as a single-player app.

- [ ] Use cases `AddUserCard`, `RemoveUserCard`, `ListMyCards`, `SetCardVisibility` with tests
- [ ] `FirestoreUserCardRepository` adapter, emulator integration test
- [ ] Screens: Add cards (`AddCards.dc.html`), My cards (`MyCards.dc.html`), Privacy (`Privacy.dc.html`)
- [ ] TanStack Query + `useLiveCollection`; optimistic add and remove with rollback
- [ ] In-memory catalogue search and bank filter; works offline
- [ ] Playwright: sign in, add two cards, remove one, reload from cache
- [ ] GA4 `card_added`

## Milestone 4 — Audiences (`m4-audiences`)

Done when the friend group is on it.

- [ ] Use cases `CreateAudience`, `JoinByInvite` (rate limited), `ListAudienceCards`, `ProjectUserCard` with tests incl. redelivery idempotency and 50-member cap
- [ ] Admin adapters: `AdminAudienceRepository`, `AdminInviteRepository`, `AdminGroupCardReadModel`
- [ ] Callables `createAudience` (`minInstances: 1`), `joinByInvite` (`minInstances: 1`), `createInvite`
- [ ] Trigger `onUserCardWritten` → `ProjectUserCard`, single batch, counters
- [ ] `/join/[code]` server component with OG tags via `infra-admin` public preview
- [ ] Screens: Groups home + empty state, Group (avatar and chip filters), visibility toggles on My cards
- [ ] Rules tests: member read allowed, non-member denied, all writes denied, tampered `ownerId` denied
- [ ] Functions emulator tests: projection diff, join rate limit, invite expiry, memberCount cap
- [ ] Playwright golden path: open invite, OTP, add two cards, see them in the group
- [ ] GA4 `invite_opened`, `group_joined`, `visibility_changed`

## Milestone 5 — Direct shares and Find (`m5-share-find`)

- [ ] `ShareWith` use case: deterministic `direct_<min>_<max>`, both memberships, cards visible
- [ ] `FindCardHolders` use case; MVP adapter = parallel per-membership queries
- [ ] Screens: Share (`Share.dc.html`), Find (`Search.dc.html`)
- [ ] Remote Config flag `directSharesEnabled`
- [ ] GA4 `find_used`

## Milestone 6 — Launch (`m6-launch`)

- [ ] `DeleteAccount` cascade: memberships, read-model rows, invites created, auth user; only path that deletes `users/{uid}`
- [ ] Privacy page with grievance contact; DPDP consent copy
- [ ] PWA install prompt, icons, offline fallback
- [ ] Performance Monitoring, Error Reporting, structured logs per use case
- [ ] Lighthouse CI budgets (LCP 2.5 s, CLS 0)
- [ ] `toli-prod` project, tag-based deploy, rules and functions in the same release

## Open items needing Raja

- Firebase projects `toli-dev` and `toli-prod` (create in console, billing on Blaze for functions)
- reCAPTCHA Enterprise site key for App Check
- Production font choice for the serif display and sans body
- Card catalogue review before M3 ships
