# 0006 — Move the photo bucket to the EU (data residency + kill cross-region egress)

**Date:** 2026-06-23 (session 72)
**Status:** Done — executed + verified S72 (one-way door, taken early on purpose)

> **Executed 2026-06-23:** created `gs://aevia-uploads-eu` (`europe-west1`),
> `rsync`-copied all 9.22 GiB (verified byte-identical), repointed all server-side
> code, redeployed 17 functions + the Cloud Run renderer, and confirmed
> `generateDerivative` fires on the new bucket (24.4 MiB original → 263 KiB
> preview). The old US bucket is retained as a fallback until the next billing
> cycle confirms egress dropped. Remaining: a live dashboard PDF render on AEV-043
> + a billing check the day after to confirm near-zero "Worldwide Destinations".

## Context

While investigating an egress charge (3.63 GiB / €0.37 on 2026-06-22), we found
the stack is **already almost entirely in the EU** — except one resource:

- **Firestore** (names, emails, order data — the real personal data): `europe-west3` ✓
- **Cloud Functions**: `europe-west1` ✓
- **Cloud Run PDF renderer** (`aevia-pdf-renderer`): `europe-west1` ✓
- **Photo bucket** (`aevia-uploads.firebasestorage.app`): **`US-WEST1`** ✗

The bucket being in the US (it landed there as the Firebase default at project
creation) caused the egress: the EU renderer drags ~1 GiB of full-res originals
across the Atlantic per PDF (2 PDFs ≈ 2.1 GiB of the 3.63 GiB). It also means
every EU customer's browser load is trans-atlantic, and that customer photos
(personal data) sit in the US while their metadata sits in Frankfurt — an odd
residency split for a premium Vienna brand heading to aevia.at.

Two myths cleared on the way in: (1) US hosting does **not** break GDPR —
processing EU data in the US is lawful with SCCs / the EU–US Data Privacy
Framework, both of which Google Cloud supports; so there is no legal emergency.
(2) "US is cheaper for the trial" is **false here** — the US bucket is the *only*
thing generating the egress cost; EU storage is not pricier. Staying US is the
expensive option, not the cheap one.

Why decide now: a Firebase default bucket **cannot be relocated** — migration
means copying objects to a new bucket and repointing the app. That is a one-way
door whose cost only grows with data. Today it is a handful of throwaway test
orders; at launch it is real customers' photos on a live service. The trial
period is the cheapest window we will ever have to do this.

## Options Considered

1. **Move compute to the bucket** — redeploy the renderer in `us-west1` to match
   the US bucket. Kills egress with near-zero effort, but drags EU services toward
   the US, keeps the residency split, and bets on a US future we don't want.
2. **Stay US, migrate "later" before launch** — defer. Cheapest effort *now*, but
   the one-way door only gets costlier; we'd be migrating real customer photos on a
   live service at the busiest moment, and there is no cost or legal reason to wait.
3. **Create an EU bucket now, migrate test data, repoint the app** — take the
   one-way door at its cheapest moment, while there is no real customer data.

## Decision

We chose **Option 3 — create an `europe-west1` bucket now and migrate to it.**

- **Region:** `europe-west1`, to match the renderer and functions (the renderer is
  the heavy reader, so co-locating there makes its ~1 GiB/PDF reads free in-region).
  Chosen over `europe-west3` (Firestore's region) because the big read is the
  renderer, not Firestore.

Key trade-offs:
- **We gain:** full EU data residency (clean GDPR story + a real premium-brand
  signal — "your photos never leave Europe"); permanent elimination of the
  cross-region PDF egress (in-region reads are free); local browser loads for EU
  customers.
- **We accept:** one focused session of migration work now (new bucket, copy/
  discard test objects, repoint bucket name across functions config + frontend
  Firebase config + storage rules + renderer, redeploy, verify a full
  order→engine→PDF round-trip).
- **We assume:** the only region-locked resource needing change is the bucket
  (Firestore/functions/renderer are already EU); the migration is "repoint a config
  string in every place it appears," which a round-trip test catches.

## Consequences

- Enables EU-residency claims in customer-facing copy and any future DPA.
- The chunk-024 "in-region PDF render" optimisation finally lands as intended
  (it never did while the bucket was in the US).
- Constrains nothing we want to keep; the old US default bucket can be emptied and
  ignored (it can't be deleted as the Firebase default, but it need not be used).
- **Revisit/monitor:** confirm post-migration that the 2026-06-22-style egress line
  drops to ~zero on a day with PDF renders; verify no code path still references the
  old bucket name.

## Next Steps

Scope the migration as its own task (hand off to creating-briefs): enumerate every
place the bucket name appears (functions config, frontend Firebase config, storage
rules, renderer, signed-URL code, upload path), decide migrate-vs-discard for the
existing test orders, then execute + verify a full round-trip before retiring the
US bucket.
