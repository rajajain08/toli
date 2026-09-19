# ADR-0014: No warm instances at launch

- Status: accepted
- Date: 2026-09-19
- Amends: "Instant screens" in `architecture.md`, which kept `joinByInvite` and `createAudience` at `minInstances: 1` in prod

## Context

A warm instance is billed whether or not anyone calls it. Two warm 2nd-gen functions plus one warm App Hosting instance come to roughly ₹1,500 to ₹2,500 a month at idle. At launch the audience is one friend group. The architecture's own growth path already places `minInstances` in the 10k to 100k users row, not at zero users.

## Decision

Everything scales to zero in production as well as dev: `WARM_INSTANCES = 0` in `apps/functions/src/index.ts`, `minInstances: 0` in `apps/web/apphosting.prod.yaml`.

## Consequences

- The idle bill is close to nothing.
- The first call after a quiet spell pays a cold start: a second or two on `joinByInvite` / `createAudience`, and on the first open of an invite link, which is the server-rendered page a new person sees first. Once the group is active, instances stay warm on their own between uses.
- The rest of the app does not notice: screens behind sign-in render from the local cache and Firestore listeners, not from functions.
- Turning it back on is two numbers and a deploy. The signal to do so is cold starts showing up in Performance Monitoring on the invite page, or in function latency logs, for real users.
