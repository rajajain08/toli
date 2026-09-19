# Toli — instructions for Claude Code

Read `docs/architecture.md` before writing any code. It is the spec; if a change contradicts it, propose an ADR under `docs/decisions/` instead of silently diverging.

## Non-negotiables

- Dependency rule: `packages/domain` imports nothing; `packages/application` imports only `domain`; Firebase appears only in `infra-client`, `infra-admin` and `apps/functions`.
- The client never writes to `audiences/**`, `invites/**` or any read-model document. Those writes go through callables or triggers.
- No field, type or form input for a card number, expiry, CVV, credit limit or spend. If you find yourself adding one, stop.
- Every use case gets a Vitest test with in-memory ports before it gets an adapter.
- Firestore rules changes ship with a rules test in the same PR.

## Working style

- One milestone per branch, PRs against green CI.
- Screens come from `docs/design/` and compose primitives from `packages/ui`; do not style ad hoc.
- Prefer the Firebase Emulator Suite for everything local; never point local code at `toli-app-prod`.
