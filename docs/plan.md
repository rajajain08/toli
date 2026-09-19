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
- [x] PR opened, CI green, merged (#1)

## Milestone 2 — Identity (`m2-identity`)

Done when a fresh phone signs up on the dev URL. The project id `toli-dev` was taken, so dev is `toli-app-dev` (created 2026-09-18, Firestore in `asia-south1`, web app registered, rules deployed). Blaze enabled 2026-09-19; `PHONE_HASH_SECRET` in Secret Manager; `ping` and `completeSignup` deployed to `asia-south1`. App Hosting backend `toli-web` (asia-southeast1, nearest region offered) serves https://toli-web--toli-app-dev.asia-southeast1.hosted.app. Phone provider on. App Check: reCAPTCHA Enterprise key `6Ldy0MMt…` registered for the web app, debug token for local dev, callables enforce outside the emulator. Firestore enforcement: flip to Enforced in App Check → APIs → Cloud Firestore.

- [x] `CompleteSignup` use case: name, consent timestamp, phoneHash via a `PhoneHasher` port; 4 tests with in-memory ports; `parsePhone` value object in domain
- [x] Callable `completeSignup` writes `users/{uid}`; phone read from the ID token, HMAC-SHA256 with `PHONE_HASH_SECRET`; emulator test covers consent, hash, idempotency, unauthenticated
- [x] Web: `/auth` route with phone, code and profile steps; Auth, reCAPTCHA, Firestore and Functions all behind one lazy `loadFirebase()` gateway so every route stays under the 180 KB budget (about 110 KB gz)
- [x] App Check wired (`startAppCheck`, reCAPTCHA Enterprise, debug token env); callables enforce it outside the emulator. Firestore-side enforcement is switched on in the console once the key exists
- [x] `RequireAuth` in the shell: signed out or no profile → `/auth?next=…` and back
- [x] Rules: client never creates `users/{uid}`, may only rename itself (1–40 chars); `phoneHash`, `consentAt`, `createdAt` untouchable. 19 rules tests
- [x] `track()` helper (no-op without a measurement id); `otp_completed` fired after OTP
- [x] `deploy-dev.yml` deploys rules and functions on merge when `DEPLOY_DEV=true` and the service-account secret exist; `apps/web/apphosting.yaml` for App Hosting
- [x] Playwright golden path: fresh phone, OTP from the Auth emulator, name, consent, lands on `/groups`; wrong code and bad phone stay in place
- [ ] A real phone signs up on the dev URL

## Milestone 3 — My cards (`m3-my-cards`)

Done when usable as a single-player app.

- [x] Use cases `AddUserCard` (idempotent per catalogue card, client-chosen id, 30-card cap), `RemoveUserCard`, `ListMyCards`, `SetCardVisibility` (hide never needs membership); 12 tests with in-memory ports
- [x] `FirestoreUserCardRepository` exercised through the real rules on the emulator; `BrowserClock`, `BrowserIdGenerator`, `myCardsQuery`
- [x] Screens: Add cards, My cards (wallet carousel, perks, remove with confirm), Privacy; new people go from sign-up to Add cards as step 2 of 2. Primitives: `CardRow`, `TrayChip`, `SearchField`, `SectionLabel`, `PerkChip`, `PageDots`, `Panel`, `ActionBar`, `FactRow`
- [x] `useMyCards` on `useLiveCollection`; `useAddCard` / `useRemoveCard` optimistic with rollback
- [x] In-memory catalogue search and bank chips; zod moved to `@toli/catalog/schema` so the validator never ships to the browser (routes 100–125 KB gz)
- [x] Playwright: sign up, add two cards via bank chip and search, remove one, reload; suite passes 3× with retries off (test phones are random so parallel workers never share an OTP)
- [x] GA4 `card_added`
- [ ] Visibility toggles on My cards arrive with audiences in milestone 4 (the use case is already in)

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

- [ ] `DeleteAccount` cascade: memberships, read-model rows, invites created, `contacts/{uid}` (ADR-0013), auth user; only path that deletes `users/{uid}`
- [ ] Settings toggle to withdraw the marketing opt-in; owed before any campaign is sent
- [ ] Marketing export job: `contacts where marketingOptIn == true` joined to name and cards, Admin SDK or BigQuery only
- [ ] Privacy page with grievance contact; DPDP consent copy
- [ ] PWA install prompt, icons, offline fallback
- [ ] Performance Monitoring, Error Reporting, structured logs per use case
- [ ] Lighthouse CI budgets (LCP 2.5 s, CLS 0)
- [ ] `toli-prod` project, tag-based deploy, rules and functions in the same release

## Open items needing Raja

- `toli-app-dev` fully provisioned. `toli-prod` waits for milestone 6
- reCAPTCHA Enterprise site key for App Check
- Production font choice for the serif display and sans body
- Card catalogue review before M3 ships
