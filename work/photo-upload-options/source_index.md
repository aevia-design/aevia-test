# Source Index

**Task**: photo-upload-options · **Research questions**: (1) Which photo sources do competing photo-book/print services offer at upload, and how has that changed; (2) where do customers' photos actually live today; (3) technical/cost facts of Google Photos Picker API, Google Drive Picker, Dropbox Chooser, and iCloud for a small team; (4) evidence on multi-photo upload friction/abandonment and whether cloud sources reduce it · **Collection date**: 2026-09-24

## Summary Statistics
- Total sources: 17 — web pages: 9 · documentation: 4 · blog posts: 4
- Retrieval methods: WebFetch (direct fetch succeeded) 5 · WebSearch (snippet synthesis, direct fetch blocked or not attempted) 12
- Average reliability: 0.72; distribution: excellent ≥0.8 (4) · good 0.7–0.79 (3) · acceptable 0.6–0.69 (7) · below 0.6 but ≥0.5, flagged (3)
- One candidate (Journi photo-source claim) scored 0.44, below the 0.5 floor, and was **excluded** — see Collection Notes.

## Sources by Topic

### Competitor photo-source offerings (Research Q1)

**src_001** — Mixbook Help Center: 3rd-party upload (Google Photos, Facebook, Instagram, SmugMug)
- **URL**: https://help.mixbook.com/how-can-i-upload-from-3rd-party-sites-such-as-google-photos-facebook-instagram-and-smugmug-H1hMtMiVB · **Type**: web_page · **Reliability**: 0.68 · **Retrieval**: WebSearch
- **Summary**: Mixbook supports Google Photos, Facebook, Instagram, SmugMug as upload sources; 15MB/file cap; has a dedicated troubleshooting article for 3rd-party upload failures.
- **Metadata**: `sources/web/src_001.meta.yaml`

**src_002** — Shutterfly Support: Uploading Photos Guide
- **URL**: https://support.shutterfly.com/s/article/uploading-photos-guide · **Type**: web_page · **Reliability**: 0.92 · **Retrieval**: WebFetch
- **Summary**: Explicitly states Shutterfly does NOT support Google Drive, Dropbox, or FTP; supports device, Google Photos, Amazon Photos, Facebook. Strongest direct evidence for the Drive/Dropbox question.
- **Metadata**: `sources/web/src_002.meta.yaml`

**src_003** — CEWE: Aus der Cloud ins CEWE FOTOBUCH (cloud import tutorial)
- **URL**: https://www.cewe.de/inspiration/tutorial-aus-der-cloud-ins-cewe-fotobuch.html · **Type**: web_page · **Reliability**: 0.68 · **Retrieval**: WebSearch
- **Summary**: CEWE's desktop software (Fotowelt) supports Dropbox, CEWE myPhotos, and formerly Google Photos as "Online-Fotoquellen" — but via a downloadable desktop app, not a browser flow.
- **Metadata**: `sources/web/src_003.meta.yaml`

**src_005** — Artifact Uprising Help Center: Uploading Images / Google Photos
- **URL**: https://help.artifactuprising.com/hc/en-us/articles/360000290332-Uploading-Images · **Type**: web_page · **Reliability**: 0.64 · **Retrieval**: WebSearch (direct fetch 403)
- **Summary**: Artifact Uprising (Aevia's own design reference point) offers only device upload + Google Photos + QR mobile handoff; explicitly does not support direct Instagram import; 40MB/file cap matches Aevia's own.
- **Metadata**: `sources/web/src_005.meta.yaml`

**src_006** — Chatbooks Help Center: Instagram as a Photo Source
- **URL**: https://help.chatbooks.com/en/articles/10139802-instagram-as-a-photo-source · **Type**: web_page · **Reliability**: 0.76 · **Retrieval**: WebSearch
- **Summary**: Confirms Meta removed third-party Instagram API access in late 2024, killing direct Instagram import; Chatbooks otherwise supports Facebook, Google Photos, Dropbox, Flickr.
- **Metadata**: `sources/web/src_006.meta.yaml`

**src_008** — Snapfish Support: Uploading from Facebook/Google Photos
- **URL**: https://support.snapfish.com/hc/en-us/articles/900001965086-Uploading-photos-from-Facebook-or-Google-Photos · **Type**: web_page · **Reliability**: 0.6 · **Retrieval**: WebSearch (direct fetch 403)
- **Summary**: Supports device, Facebook, Google Photos; no evidence of Dropbox/Drive support; has its own "Unable to upload via Google Photos" troubleshooting article.
- **Metadata**: `sources/web/src_008.meta.yaml`

**src_009** — Popsa Help Centre: Select photos from other apps
- **URL**: https://support.popsa.com/hc/en-gb/articles/360014472298-Select-photos-from-other-apps · **Type**: web_page · **Reliability**: 0.6 · **Retrieval**: WebSearch (direct fetch 403)
- **Summary**: The one competitor found that explicitly integrates Dropbox as a working source, alongside Google Photos and Facebook/Instagram — but Popsa is a native app (OS-level access), not a web order form.
- **Metadata**: `sources/web/src_009.meta.yaml`

### Google Photos / Instagram API changes and breakages (Research Q1, Q3)

**src_004** — CEWE Community Forum: "Abschaltung von Google Fotos" (2025-04-04)
- **URL**: https://www.cewe-community.com/forum/fb/viewtopic.php?f=55&t=16635 · **Type**: web_page · **Reliability**: 0.8 · **Retrieval**: WebFetch
- **Summary**: Dated, primary evidence that Google's 1 April 2025 API change broke CEWE's live Google Photos integration across web/Android/iOS, forcing a download-then-upload fallback.
- **Metadata**: `sources/web/src_004.meta.yaml`

**src_007** — Chatbooks Help Center: Why has adding Google Photos Changed?
- **URL**: https://help.chatbooks.com/en/articles/10760721-why-has-adding-google-photos-changed · **Type**: web_page · **Reliability**: 0.88 · **Retrieval**: WebFetch
- **Summary**: Specific, quoted friction detail: one-hour Google Photos session limit with no warning, 60-photo cap, no cross-session memory of selections. Strong evidence for Q4 (cloud pickers introduce their own friction).
- **Metadata**: `sources/web/src_007.meta.yaml`

**src_011** — Google for Developers: Updates to the Google Photos APIs (official)
- **URL**: https://developers.google.com/photos/support/updates · **Type**: documentation · **Reliability**: 1.0 · **Retrieval**: WebFetch
- **Summary**: Primary official source: 31 March 2025 Library API scope removal (photoslibrary, .readonly, .sharing); Picker API is the only replacement and requires manual, per-session, non-syncing selection. Highest-authority source in the collection.
- **Metadata**: `sources/docs/src_011.meta.yaml`

**src_012** — Google Developers Blog: Picker API launch and Library API changes
- **URL**: https://developers.googleblog.com/en/google-photos-picker-api-launch-and-library-api-updates/ · **Type**: blog · **Reliability**: 0.84 · **Retrieval**: WebSearch
- **Summary**: Official announcement corroborating src_011, framed around privacy/security rationale for the restriction.
- **Metadata**: `sources/docs/src_012.meta.yaml`

**src_015** — memoryKPR: Instagram API Deprecation, manual import ending 4 Dec 2024
- **URL**: https://memorykpr.com/blog/instagram-api-deprecation-manual-import-ending-dec-4-2024/ · **Type**: blog · **Reliability**: 0.76 · **Retrieval**: WebSearch
- **Summary**: Independently dates and corroborates the Instagram Basic Display API shutdown (4 Dec 2024) that ended personal-account photo import industry-wide; names Day One app as a casualty.
- **Metadata**: `sources/blogs/src_015.meta.yaml`

### Integration technical/cost facts: Dropbox and Google Drive (Research Q3)

**src_013** — Dropbox API Documentation: Chooser (pre-built component)
- **URL**: https://docs.dropboxapi.com/dropbox-api/docs/pre-built-components/chooser · **Type**: documentation · **Reliability**: 1.0 · **Retrieval**: WebFetch
- **Summary**: Official docs: Chooser requires no OAuth/access token (uses the user's own Dropbox web session), one script tag to integrate, no production approval needed — markedly lower integration cost than an OAuth-based picker.
- **Metadata**: `sources/docs/src_013.meta.yaml`

**src_014** — Google for Developers: Overview of the Google Picker (Drive)
- **URL**: https://developers.google.com/workspace/drive/picker/guides/overview · **Type**: documentation · **Reliability**: 0.76 · **Retrieval**: WebSearch
- **Summary**: Official docs: Drive Picker requires enabling two APIs in a Google Cloud project plus full OAuth 2.0 consent — heavier to stand up and maintain than Dropbox's Chooser, and subject to Google's OAuth app verification.
- **Metadata**: `sources/docs/src_014.meta.yaml`

### Where customers' photos actually live (Research Q2)

**src_016** — Threadgold Consulting: Personal Cloud Storage Usage 2025
- **URL**: https://threadgoldconsulting.com/research/personal-cloud-storage-usage · **Type**: blog · **Reliability**: 0.6 · **Retrieval**: WebSearch
- **Summary**: ~2.3bn cloud storage users in 2025; 55% use 3+ services, typically one per content type (photos in Google Photos, docs in Dropbox, backups in iCloud) — suggests Dropbox is not typically where personal photos live.
- **Metadata**: `sources/blogs/src_016.meta.yaml`

**src_017** — DB Labs: iPhone Storage & Photo Statistics (2026)
- **URL**: https://dblabsapps.com/statistics/iphone-storage-photos-statistics/ · **Type**: blog · **Reliability**: 0.52 (flagged, borderline) · **Retrieval**: WebSearch
- **Summary**: Claims ~75% of iPhone owners never back up photos beyond iCloud/on-device storage. Weak methodology disclosure; use as directional corroboration only.
- **Metadata**: `sources/blogs/src_017.meta.yaml`

### Upload friction and abandonment evidence (Research Q4)

**src_018** — Filestack Blog: 12 File Upload UI Patterns That Improve Completion Rates
- **URL**: https://blog.filestack.com/file-upload-ui-patterns-improve-completion-rates/ · **Type**: blog · **Reliability**: 0.56 (flagged, borderline) · **Retrieval**: WebSearch
- **Summary**: Names common upload-abandonment causes (missing progress feedback, no retry, poor mobile UX) and mitigations. Vendor content-marketing source; no primary data cited. Weakest-evidence source retained for lack of a stronger substitute — see Collection Notes.
- **Metadata**: `sources/blogs/src_018.meta.yaml`

## Collection Notes

- Tools used: WebSearch (primary discovery), WebFetch (direct retrieval where the target site allowed it). Quality threshold applied: 0.6, with 0.5–0.6 sources retained-and-flagged per skill guidance since the collection otherwise met its 15-source target.
- **Exclusion**: one candidate — a WebSearch-derived claim about Journi's supported photo sources (iCloud/Google Photos/Facebook/Instagram) — scored 0.44 (below the 0.5 floor) because its Instagram-support claim likely predates and contradicts the independently corroborated Dec 2024 Instagram API shutdown (src_006, src_015), and no primary Journi page could be fetched to verify. Its files were deleted; it is not counted in the 17.
- **403 pattern**: Direct WebFetch was blocked (HTTP 403) on Artifact Uprising, Snapfish, Popsa, and Mixbook help-center pages, likely bot-blocking on their help-desk platforms (Zendesk/Intercom-style). For these, content was reconstructed from WebSearch's own snippet synthesis of the same pages rather than a raw fetch — noted explicitly in each source's `provenance.notes` and reflected in a reduced `accuracy` RADAR score. This is a genuine limitation: none of these four sources should be treated as a verbatim quote-level citation without a follow-up fetch attempt (e.g., via a different tool or a cached/archived copy) if precision becomes important in synthesis.
- **Baymard/NN-g gap**: No Baymard Institute or NN/g content specifically on multi-file/photo upload friction could be located despite multiple targeted searches; Baymard's public output on file uploads was not found at all, and the NN/g material found was generic 10-heuristics content, judged too tangential to include. This is a genuine coverage gap against the brief's stated preference — flagged rather than papered over with a weak substitute beyond the one vendor blog (src_018) retained.
- **iCloud web-picker gap**: No developer-facing iCloud/Apple Photos web picker API was found (Apple does not appear to expose one), which is itself a research finding for Q3 but is documented only within src_017's tangential context, not a dedicated primary Apple source — flagged as an open point for any synthesis step to state as "absence of evidence found," not "confirmed absent."
- Domain caveat: this is a general web/e-commerce topic, not academic — no CORE/Unpaywall/arXiv/PMC retrieval chain was applicable; all sources are web pages, vendor documentation, or blog posts, evaluated on RADAR as specified for non-academic content.
