# ADR-0013: Store the verified phone number, with separate marketing consent

- Status: accepted
- Date: 2026-09-19
- Amends: the "Phone numbers" bullet under Security in `architecture.md`

## Context

The original design stored a phone number only as an HMAC, enough to answer "is this person on Toli" and nothing more. The product now wants to be able to reach its own users (launch news, offers) and to know who they are: name, phone number and the cards they hold. Name and cards are already stored. The phone number is not recoverable from the HMAC.

India's DPDP Act requires consent to be specific to a purpose. Consent to use the app does not cover marketing, and a pre-ticked or bundled box is not consent.

## Decision

Store the verified E.164 phone number for every user in `contacts/{uid}`, a server-only collection written by the `completeSignup` callable from the ID token's `phone_number` claim (never from client input). The same document holds `marketingOptIn` and `marketingOptInAt`, set from a separate, optional, unticked checkbox at sign-up. Anything but a literal `true` is a no.

`User` and `users/{uid}` do not change: the profile friends can be shown still has no phone field, and keeps the HMAC for matching. Rules deny every client read and write on `contacts/**`, including the owner's. The sign-up consent text and the Privacy screen say plainly that the number is kept and that friends never see it.

## Consequences

- A marketing list is `contacts where marketingOptIn == true`, joined on uid to `users/{uid}` (name) and `users/{uid}/cards` (cards held). It is an Admin SDK or BigQuery export job; no client path exists.
- Messaging anyone with `marketingOptIn == false` is a compliance breach, not a product choice. Transactional messages about their own account are the only exception.
- The blast radius of a database leak grows from names and card names to names, card names and phone numbers. `contacts` stays out of every read model, log line and analytics event.
- `DeleteAccount` (milestone 6) must delete `contacts/{uid}` in the same cascade. A settings toggle to withdraw the opt-in is owed before any campaign is sent.
- The "never stored" list is unchanged: card number, expiry, CVV, limit, spend, statements. There is still no field for them.
