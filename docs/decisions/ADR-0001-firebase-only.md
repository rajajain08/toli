# ADR-0001: Firebase only

- Status: accepted
- Date: 2026-09-18

## Context

Toli needs phone OTP auth, a document store with offline cache and live listeners, server-side logic for invites and fan-out, and hosting for a Next.js PWA. A single-engineer team cannot afford two consoles, two billing accounts or two deploy pipelines.

## Decision

Use Firebase for everything: Auth (phone), Firestore (`asia-south1`), Cloud Functions (2nd gen), App Hosting, App Check, Remote Config, Performance Monitoring and GA4. No Supabase, no separate Postgres.

## Consequences

- One pipeline deploys app, rules and functions together, so they cannot drift.
- Relational shapes (per-audience visibility) are served by function-maintained read models instead of joins; see ADR-0002.
- Rules cannot express joins, so the client is restricted to its own documents; see ADR-0003.
- The domain and application packages stay Firebase-free, so the choice is reversible at the adapter layer.
