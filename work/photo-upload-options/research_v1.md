# Photo upload options — cloud sources vs device-only

**Task:** photo-upload-options · **Mode:** thorough (synthesis from 17 pre-collected sources only) · **Date:** 2026-09-24

## Inputs received and confirmed
- Source index: `work/photo-upload-options/source_index.md` (17 sources, src_001–src_018 minus excluded src_010-equivalent Journi claim)
- Sources directory: `work/photo-upload-options/sources/`
- Purpose: decide whether Aevia's site copy promising Google Drive/Dropbox upload should be (a) changed to device-only, (b) backed by a real Dropbox Chooser build, (c) backed by a real Google Photos Picker build, or (d) something else (iCloud guidance, staff-handled share links)
- Reliability/flags respected: src_016–018 treated as weak/directional only; snippet-reconstructed 403 sources (src_001, src_005, src_008, src_009) treated as non-verbatim

## Executive summary

**The copy promise is wrong on both named services.** No competitor in this source set offers Google **Drive** or Dropbox upload as a mainstream web order-form feature. Shutterfly explicitly rules both out [src_002]. Popsa's Dropbox support is inside a native mobile app with OS-level file access, not a browser form [src_009]. The pattern across every mainstream competitor (Shutterfly, Mixbook, Chatbooks, Snapfish, Artifact Uprising) is **device upload + Google Photos + Facebook**, not Drive/Dropbox [src_001, src_002, src_005, src_006, src_008].

That pattern exists because it matches where photos actually live: camera roll, iCloud Photos (iPhone), or Google Photos (Android/synced) — not Drive or Dropbox, which the evidence suggests are used for documents and backups, not as a personal photo library [src_016]. So even the "obvious" cloud-picker candidate, Google Photos, is really the only cloud source worth discussing; Drive and Dropbox are close to irrelevant to where the photos are.

But Google Photos integration is now in a worse state than site copy likely assumes: Google shut off the old Library API scopes on 31 March 2025 and replaced them with a Picker API that requires a new per-session, manual, non-syncing selection flow, cannot browse or search, and — per Chatbooks' own account — silently expires selections after one hour with no warning [src_007, src_011, src_012]. CEWE's integration broke live in production from this exact change [src_004]. For a tiny team, this is a moving, actively-being-restricted API, not a stable convenience feature.

**Recommendation: (a) — change the copy to device-only now**, because that is the only option matching the truth of what exists today, and it removes a customer-facing promise Aevia cannot currently keep. Do not build Dropbox Chooser (low value — wrong place for photos) or Google Photos Picker now (real but fragile value, non-trivial and Google-controlled ongoing cost) without a stronger signal that upload abandonment is actually a live problem — which this source set could not establish. Revisit if Aevia gets hard data that customers are abandoning the order form specifically at the upload step.

## Findings by sub-question

### Q1 — What do competitors actually offer?

| Service | Sources offered | Source |
|---|---|---|
| Shutterfly | Device, Google Photos, Amazon Photos, Facebook. **Explicitly not** Drive/Dropbox/FTP | src_002 (high reliability, direct fetch) |
| Mixbook | Device, Google Photos, Facebook, Instagram, SmugMug | src_001 |
| Chatbooks | Device, Facebook, Google Photos, Dropbox, Flickr (Instagram now dead, see Q1b) | src_006 |
| Snapfish | Device, Facebook, Google Photos | src_008 |
| Artifact Uprising (Aevia's own design reference) | Device, Google Photos, QR-code mobile handoff; explicitly no Instagram | src_005 |
| Popsa | Device, Dropbox, Google Photos, Facebook/Instagram — but this is a **native app**, not a web form | src_009 |
| CEWE (desktop software, not the web form) | Dropbox, CEWE myPhotos, formerly Google Photos, via a downloadable desktop app | src_003 |

**Pattern:** Google Photos is the near-universal second source after device upload. Facebook is common. **Dropbox appears exactly once as a genuinely working feature (Chatbooks), and once more inside a native app with OS file-picker access (Popsa) — never as a browser Chooser widget on a mainstream competitor's web order form.** Google **Drive** does not appear as a supported source anywhere in this source set. Confidence: **high** for "Drive/Dropbox are not the competitive norm" (multiple independent, mostly high-reliability sources converge); **medium** for the exact completeness of each vendor's source list, since four of these pages (src_001, src_005, src_008, src_009) were snippet-reconstructed after a 403 block rather than directly fetched, so a minor unlisted source can't be fully ruled out.

### Q1b — API breakage risk (also bears on Q3)

Two unrelated platforms independently pulled third-party photo/API access in the last two years:
- **Instagram**: Meta shut off the Basic Display API for personal-account import on 4 December 2024, killing direct Instagram import industry-wide (corroborated independently by src_006 and src_015, plus Artifact Uprising's explicit "no Instagram" note in src_005).
- **Google Photos**: the Library API's read/search/sharing scopes were removed 31 March 2025, replaced by a much more limited Picker API (src_011, the official Google documentation, reliability 1.0; corroborated by Google's own blog post src_012). CEWE's live integration broke as a direct result (src_004, a dated forum thread from the outage window).

Confidence: **high**. This is corroborated by primary/official sources (src_011, src_012) plus independent third-party confirmation of real-world breakage (src_004, src_006, src_007). The pattern — social/cloud platforms progressively restricting third-party photo access — is not a one-off; it has now happened twice in under 18 months to different platforms for different (privacy/security) stated reasons.

### Q2 — Where do customers' photos actually live?

Weak evidence here, flagged as such in the index. Src_016 (0.6 reliability, directional) suggests personal cloud storage users typically use different services for different content types — photos in Google Photos, documents in Dropbox, backups in iCloud — rather than one platform for everything, which argues against Dropbox being a meaningful home for a customer's photo library. Src_017 (0.52, borderline, flagged) claims ~75% of iPhone owners never back their photos up beyond iCloud/on-device storage, which — if true — would put a large share of Aevia's likely-iPhone-heavy customer base in "camera roll or iCloud only," with **no developer-facing iCloud web picker existing at all** (a documented gap, not a confirmed absence — src_017's own note).

Confidence: **low**. Neither source clears the 0.6 threshold comfortably (src_017 is below it and retained only flagged), no primary usage-behaviour data was found, and this is the weakest-evidenced sub-question in the whole set. Treat the inference "most Aevia customers' relevant photos sit in camera roll/iCloud/Google Photos, not Drive/Dropbox" as **directionally plausible but not established** by this research.

### Q3 — Build/maintenance cost and risk per option

- **Dropbox Chooser** (src_013, official docs, reliability 1.0): no OAuth, no access token, no app-review/production approval — it rides the user's existing browser session with Dropbox and is a single script tag. This is a genuinely low build cost. The catch is Q2: it is cheap to build but aimed at a place photos likely don't live.
- **Google Drive Picker** (src_014, official docs, reliability 0.76): requires enabling two APIs in a Google Cloud project and a full OAuth 2.0 consent flow, which brings Google's app-verification process into scope — a materially heavier and more ongoing-maintenance-prone build than Dropbox's, for a source that (per Q1/Q2) customers don't typically keep photos in either.
- **Google Photos Picker API** (src_011, src_012, official, reliability 1.0/0.84): also OAuth-based, and per Chatbooks' first-hand account (src_007) delivers a materially degraded experience versus the old Library API — one-hour session expiry with no warning and no memory of a selection across sessions. (Corrected S192 by Claude: the "60-photo cap" in src_007 is Chatbooks' own Monthbook product limit, not a Picker API limit. The Picker's real per-session maximum is not in this source set, so it is UNVERIFIED whether 150 photos fit one session.)
- **iCloud**: no developer-facing web picker API exists for Apple Photos (a gap the research could not fill — flagged as absence-of-evidence, not confirmed absence, per src_017's note and the index's own caveat).

Confidence: **high** for the relative cost ordering (Dropbox cheapest to build, Drive/Google Photos both require OAuth + Google-side approval risk) — this rests on two official, reliability-1.0 documentation sources. **Medium-high** for the Google Photos Picker's functional limitations, since it's corroborated by both Google's own docs and an independent vendor's lived experience. **Low** on iCloud, which is an absence finding, not a positive one.

### Q4 — Evidence that cloud sources actually reduce upload friction/abandonment

This is the weakest-evidenced question in the set, and the index says so directly: no Baymard Institute or Nielsen Norman Group material specifically on multi-photo upload friction could be found despite targeted searching — a genuine coverage gap, not a null result. The one retained source (src_018, Filestack, a vendor blog, reliability 0.56, flagged as borderline) lists generic abandonment causes — missing progress feedback, no retry, poor mobile UX — with no primary data and an obvious commercial interest in the topic.

**No source in this collection provides direct evidence that adding a cloud picker (Drive, Dropbox, or Google Photos) reduces abandonment in a multi-photo upload flow.** If anything, the strongest first-hand account of a cloud picker in practice (src_007, Chatbooks on Google Photos) describes it as a source of *new* friction — silent session expiry, hard caps — rather than a friction reducer.

Confidence: **low**, and this is a genuine "we don't know" rather than a soft finding. The claim "cloud upload reduces abandonment" that seems to motivate the original site copy is **not supported by any source found**; the closest we have (device-upload pain points in general) doesn't address whether a cloud alternative would help or just relocate the friction.

## Options table

| Option | Value to customer | Build effort | Ongoing risk |
|---|---|---|---|
| (a) Device-only copy | Matches reality; removes a broken promise; zero build | None | None — but foregoes any convenience upside if one exists |
| (b) Dropbox Chooser | Low — evidence suggests photos rarely live in Dropbox (Q2, low confidence) | Low (src_013: no OAuth, one script tag) | Low, but built for the wrong place |
| (c) Google Photos Picker | Real but degraded — sessions expire after 1hr with no warning, no cross-session memory (src_007); per-session photo maximum unverified | Medium-high (OAuth setup, Google Cloud project, app verification) | **High** — Google has already cut this API back once (2025) for a stated privacy rationale, and could restrict further |
| (d) Other (iCloud guidance / staff-handled share links) | Unquantified — no iCloud web picker exists to build against (gap); a manual "send us a share link, we'll pull it" flow is a process change, not evidenced here | Low-medium if staff-mediated, but adds staff labour per order, which is out of scope for this source set to cost | Depends entirely on implementation, not covered by sources |

## What we don't know (explicit gaps)

- Whether Aevia customers are actually abandoning the order form at the photo-upload step, and if so, why — no internal data was part of this research, and no external source establishes cloud pickers as the fix (Q4).
- Where Aevia's own customers' photos actually live (Q2 rests on two sub-0.65-reliability sources; no primary survey data of Aevia's actual customer base).
- The true, current feature lists of Mixbook, Artifact Uprising, Snapfish, and Popsa, since four sources were reconstructed from search snippets after a 403 block rather than fetched directly — a materially different offering could exist that this research missed.
- Whether Apple exposes any iCloud-photo web integration path at all (documented as a gap, not resolved).
- The real-world cost of Google's OAuth app-verification process in time/effort for a team Aevia's size — the docs describe the requirement (src_014) but not the practical burden.

## Recommendation

Change the site copy to **device-only** (option a) now — it is the only option the evidence supports without further build or further data, and it stops promising something that does not exist. Do not invest in Dropbox Chooser (cheap but aimed at where photos don't usually live) or the Google Photos Picker (real convenience but capped well below Aevia's typical photo count, session-fragile, and sitting on an API Google has already tightened once).

**What would change this recommendation:** direct evidence (support tickets, drop-off analytics, or a handful of customer complaints) that people are actually struggling to get 40–150 photos off their own device and onto the order form — at that point Google Photos Picker becomes worth reconsidering despite its fragility, since it is still the closest match to where non-iPhone customers' photos live (Q1/Q2). Dropbox would need much stronger Q2 evidence than exists here before it's worth reconsidering at all.

## Sources
All citations above use the source IDs from `work/photo-upload-options/source_index.md` (src_001–src_009, src_011–src_018; src_010-equivalent Journi claim excluded per index, below reliability floor).
