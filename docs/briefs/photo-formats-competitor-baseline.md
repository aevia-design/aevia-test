# Photo formats: competitor baseline

_Research for S164. Feeds the fix brief for Aevia's upload path._
_Compiled 2026-08-11. Sources are consumer-facing help centres, accessed via search index._

**Read this with one caveat up front.** Every major competitor runs its help centre on
Zendesk, which returns HTTP 403 to direct fetching. The format claims below come from the
search engine's index of those pages, not from pages I opened myself. Two independent
searches agreeing on the same wording is the strongest evidence here, and I have flagged
which claims meet that bar. Anything single-sourced should be re-checked by hand in a
browser before it hardens into a decision.

---

## 1. The baseline in one table

| Service | JPG | PNG | HEIC/HEIF | WebP | AVIF | BMP | RAW | Size cap | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| **Artifact Uprising** | ✅ | ✅ | ✅ | ✅ | ✖ | ✖ | ✖ | 40 MB/file | Confirmed (2 searches) |
| **Journi** | ✅ | ✅ | ✅ | ✖ | ✖ | ✖ | ✖ | not stated | Likely (2 searches, same phrasing) |
| **Papier** | ✅ | ✅ | ✅ | ✖ | ✖ | ✖ | ✖ | ~10 MB soft, 20 MB hard | Likely (1 search, detailed) |
| **Mixbook** | ✅ | ✅ | ✅ | ✖ | ✖ | ✖ | ✖ | 15 MB | Likely (1 search) |
| **Shutterfly** | ✅ | ✅ | ✅ app only | ✖ | ✖ | ✅ | ✖ | 10 GB/session | Possible (1 search) |
| **Blurb** | ✅ | ✅ | ❌ explicit | ✖ | ✖ | ✖ | ✖ | not stated | Confirmed (dedicated page) |
| **Aevia today** | ✅ | ✅ | ✅ | ⚠ drag-drop only | ⚠ drag-drop only | ⚠ drag-drop only | ❌ rejected | none | Confirmed (code) |

✅ documented as supported · ❌ documented as unsupported · ✖ not mentioned anywhere
· ⚠ accepted by accident

---

## 2. Findings

### 2.1 The industry standard is exactly three formats

JPG, PNG, HEIC. Every service in the sample supports that trio, and only that trio, with two
exceptions in either direction: Artifact Uprising adds WebP, and Blurb refuses HEIC.

This is the single most useful number in the research. **Aevia's picker already offers the
industry-standard set.** The deficiency identified in the S164 audit is not that we accept too
few formats — it is that our four checkpoints disagree about which formats those are, and that
drag-and-drop silently admits three more (WebP, AVIF, BMP) that no competitor accepts and that
our own derivative pipeline cannot process.

The competitive gap is not coverage. It is coherence.

### 2.2 Nobody in this market accepts RAW, and the reasoning is explicit

Not one consumer photo-book service in the sample accepts RAW. The stated industry reason is
blunt: websites cannot display raw images, so a JPEG export is required. Where RAW appears to
work — Lightroom's Blurb Book module — it is a desktop application converting to JPEG inside a
PDF before anything is uploaded, which is a different architecture from a browser upload.

**Implication for Aevia:** rejecting RAW is the correct and universal choice, not a shortfall.
The `JPEG or RAW both work` line in `help.html` is not merely wrong about our own capability;
it promises something no competitor in the category offers. Fixing the copy closes the gap
entirely. No engineering work is justified here.

### 2.3 HEIC is handled server-side, and Shutterfly names the pattern

Shutterfly accepts HEIC and HEIF **through its app only, converting to JPG at upload**. That is
architecturally identical to Aevia's `convertHeic` Cloud Function, and it is a useful
confirmation that our approach is mainstream rather than eccentric.

Blurb is the instructive counter-example: rather than build conversion, it published a
dedicated help page telling customers HEIC is unsupported and to convert first. Two viable
strategies — build the converter, or say no clearly. Aevia already built the converter. What we
have not done is either strategy for WebP, AVIF and BMP.

Artifact Uprising adds an operational note worth stealing: *if uploading HEIC files, try using
a mobile device or QR code upload.* They know the desktop HEIC path is the fragile one and they
route customers around it in the help text rather than fixing it.

### 2.4 EXIF rotation is a known, named industry failure — and it is ours

This is the most important external finding, because it independently corroborates the S164
audit's highest-severity bug.

The general-purpose literature on EXIF orientation describes the exact failure mode found in
`functions/index.js:1780`: *"Web apps that process uploaded images server-side often use
libraries that ignore orientation, so vertical photos end up displaying horizontally."*

Our derivative generator calls `sharp(...).resize(...).jpeg(...)` with no `.rotate()`. Sharp
does not auto-orient unless asked, and its JPEG encoder drops the metadata. That is the
textbook case, verbatim. The consumer-facing workaround the industry recommends — open the
photo, rotate it, re-save so the pixels are permanently rotated — is precisely what `.rotate()`
does server-side, and it is what we should be doing on the customer's behalf.

No competitor advertises this as a feature, because in a working product it is invisible. That
is the point: **correct rotation is table stakes, not a differentiator.** We are currently below
the baseline on an issue customers would never think to check for.

### 2.5 WebP and AVIF are print-industry pariahs

Print services broadly reject WebP and AVIF; the standing advice is to convert to JPG, PNG or
TIFF first. The reasoning is that both are screen-delivery formats. Artifact Uprising's WebP
support is the outlier in the entire sample.

**Implication for Aevia:** our accidental drag-and-drop acceptance of WebP and AVIF is worse
than a plain refusal. We admit files the whole print industry rejects, then fail to generate a
derivative for them (`isImageFile()` omits AVIF and BMP), so they silently fall back to
full-size originals and cost egress. If we want WebP, we should support it deliberately and add
it to `isImageFile()`. If we do not, it should be refused at the door with a clear message.

### 2.6 Everyone states a file-size cap. We state none.

Artifact Uprising 40 MB per file. Mixbook 15 MB. Papier soft-fails around 10 MB and hard-fails
above 20 MB. Shutterfly 10 GB per session.

Aevia has **no documented and no enforced per-file size limit.** Combined with our lack of
server-side validation (`functions/upload.js` performs no format or size check at all), a
customer can upload arbitrarily large files. For a premium product where orders already run
1–4 GB, this is a cost-exposure question as much as a UX one, and it deserves a line in the
brief even though it sits slightly outside the format question as posed.

### 2.7 How competitors phrase it — and how they warn

Two consistent patterns worth copying.

**Formats are stated as a plain closed list**, near the upload step, not buried in an FAQ.
Papier's phrasing is the model of the genre: *accepts .jpeg, HEIC and PNG format only*, followed
by the actionable instruction to *re-export images in high-resolution as .jpeg*. Note the two
moves — name the list, then tell the customer what to do about a file that is not on it.

Papier also warns about a specific known-bad case: *photos taken with a panoramic setting are
not compatible and will not process correctly.* They name the failure rather than letting the
customer discover it.

**Low resolution is a warning, never a block.** The consistent industry pattern is an advisory
icon plus an explanation and a route out — use a smaller product, or upload a better file —
while still letting the customer proceed. Aevia already does this correctly with the 1575px
`_lowRes` badge. Worth noting as a thing not to change.

The contrast with our own copy is stark. `It depends on the template and page count. We'll tell
you the ideal range when you order. JPEG or RAW both work.` is vague where competitors are
specific, and wrong where competitors are correct.

---

## 3. What this means for the brief

1. **Do not expand format coverage to compete.** JPG + PNG + HEIC matches every competitor.
   The work is making our own checkpoints agree on that list, not lengthening it.
2. **Decide WebP deliberately.** Only Artifact Uprising takes it. Either support it properly —
   `accept` attribute, `isImageFile()`, the copy — or refuse it at the door. The current
   accidental half-acceptance is the worst option.
3. **Refuse AVIF and BMP outright.** No competitor takes them; the print industry rejects them;
   our pipeline cannot make derivatives for them.
4. **Reject RAW and say so plainly.** Universal industry practice. Copy fix only, no code.
5. **`.rotate()` is a baseline defect, not an enhancement.** The industry describes our exact
   bug as the classic server-side mistake.
6. **Consider a per-file size cap.** Everyone else has one. We have neither a limit nor a
   number in the copy. 40 MB (Artifact Uprising's figure) suits a premium print product.
7. **Rewrite the format copy on Papier's pattern:** closed list, then what to do otherwise.
   Applies to `help.html`, both copy files, and the four `dz-formats` labels in `order.html`.

---

## 4. Limitations

- **No page was opened directly.** All competitor claims come from a search index of
  Zendesk-hosted help centres that return 403 to automated fetching. Before anything here
  becomes a customer-facing promise, open the Artifact Uprising, Papier and Journi pages in a
  browser and confirm the wording.
- **Chatbooks could not be sourced.** No official documentation surfaced; a third-party
  comparison implies narrower support than Shutterfly. Treat as unknown.
- **Journi's format list is single-origin.** Two searches returned the same sentence, which may
  reflect one indexed page rather than two independent confirmations. Journi matters more than
  its weight here — it is the company whose ex-developer prompted this work — so it is worth a
  manual check.
- **Help centres describe intent, not behaviour.** Every one of these services may accept more
  or less than it documents, exactly as Aevia does. This is a baseline for what competitors
  *promise*, which is the right benchmark for our copy, and only a proxy for what their code does.
- **No German-market services sampled.** Aevia's market is Vienna. CEWE and Pixum are the
  relevant local incumbents and were not covered.

---

## 5. Sources

- [Artifact Uprising — Uploading Photos & Troubleshooting](https://help.artifactuprising.com/hc/en-us/articles/360000290332-Uploading-Images)
- [Artifact Uprising — File Specifications & Profiles](https://help.artifactuprising.com/hc/en-us/articles/360000290372-File-Specifications-Profiles)
- [Artifact Uprising — Understanding DPI & How to Improve Photo Quality for Print](https://help.artifactuprising.com/hc/en-us/articles/360028714312-Understanding-DPI-How-to-Improve-Photo-Quality-for-Print)
- [Papier — What kind of photo should I upload?](https://papier.zendesk.com/hc/en-us/articles/212065045-What-kind-of-photo-should-I-upload)
- [Journi — Upload errors & Preview problems](https://support.journiapp.com/hc/en-us/articles/5458412735261-Upload-errors-Preview-problems)
- [Journi — Photo Books support section](https://support.journiapp.com/hc/en-us/sections/5191587207325-Photo-Books)
- [Blurb — HEIC file formats](https://support.blurb.com/hc/en-us/articles/360053087651-HEIC-file-formats)
- [Blurb — Image guidelines for BookSmart](https://support.blurb.com/hc/en-us/articles/207795856-Image-guidelines-for-BookSmart)
- [Mixbook — Recommended file format & quality specs](https://help.mixbook.com/en_us/what-is-the-recommended-file-format-quality-specs-for-my-photos-HkDRpFlR7)
- [Pic-Time — How do I resolve the low resolution warning?](https://help.pic-time.com/en/articles/10301222-how-do-i-resolve-the-low-resolution-warning)
- [CreateMyCookbook — What does the photo warning for low resolution/DPI mean?](https://support.createmycookbook.com/hc/en-us/articles/211872778-What-does-the-photo-warning-for-low-resolution-DPI-mean)
- [How-To Geek — Why Your Photos Don't Always Appear Correctly Rotated](https://www.howtogeek.com/254830/why-your-photos-dont-always-appear-correctly-rotated/)
- [ExifCheck — Understanding the EXIF Orientation Tag](https://www.exifcheck.com/en/blog/understanding-exif-orientation-tag/)
- [PhotoFormatLab — Best Image Format for Printing in 2026](https://www.photoformatlab.com/blog/best-image-format-for-printing)
