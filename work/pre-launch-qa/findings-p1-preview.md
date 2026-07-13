# Pre-Launch QA — Findings: P1 customer-preview + auth track (S125, 2026-07-13)

Batch: **P1-6, P1-8, P1-9**. Live dev site, real Firebase/Brevo. Order under test: **AEV-053**
(newborn, `review_sent`).

## Verdicts

| ID | Case | Verdict | Findings |
|----|------|---------|----------|
| **P1-6** | Forgot password → reset email → new password → sign in | **PASS** | 2 × S3 |
| **P1-8** | Preview in **view-only** mode | **PASS** (all 4 pass criteria met) | 2 × S3 |
| **P1-9** | Reposition (✥) drag, WebKit + Chromium, scaled book | **PASS** — 30/30 drag-gains = **1.000** | 0 |

**No S1 or S2 in this track.** New scripts (uncommitted): `qa/p1-auth-reset.mjs`,
`qa/p1-preview-viewonly.mjs`, `qa/p1-preview-reposition.mjs`, helpers `qa/p1-preview-token.mjs`,
`qa/p1-set-status.mjs`.

---

## P1-9 — the numbers (the evidence)

**Method.** Photo is `object-fit:cover` with `object-position: X% Y%`. In layout px the offset is
`off = −overflow · pct/100`; the book is `transform: scale(s)`-fitted, so on screen it is
`off · s` with `s = slotRect.width / slot.clientWidth`. For a pointer delta `D` screen px:
`moved = (pctBefore − pctAfter)/100 · overflow_layout · s`, **gain = moved / D**. All inputs read
from the DOM after a real pointer drag. The pre-S118 bug (delta not divided by scale,
`customer-preview.html:953-954`) would surface as `gain = s` (≈0.51 at 950px), so this
measurement would have caught it.

Cover (always-on drag) + two interior spread slots armed via ✥ — one X-overflowing, one
Y-overflowing. Tolerance ±0.05; nothing came near it. Book scale spanned 1.00 → 0.51 on the
spread slots; Chromium and WebKit agreed to 3 decimals; **all 30 gains = 1.000**. Raw numbers in
`sessions/qa-runs/2026-07-13-p1-preview-reposition/findings.json`.

**Repro:** `node qa/p1-preview-token.mjs AEV-053 && node qa/p1-preview-reposition.mjs`

---

## P1-8 — view-only mode

42 behavioural checks, Chromium + WebKit. Every gesture is first proved to **work** in Edit, so
"nothing happened in Preview" isn't vacuous. Cover/interior photo drag, cover/spread caption
edit, slot→slot swap all correctly inert in Preview and restored on return to Edit; flip nav
works in Preview. Two minor gaps:

### F-P1-P01 (S3) — Preview blocks the mouse but not the keyboard: captions stay editable
**One Tab press** from the top of the page focuses the cover caption in view-only mode, and
typing edits it. Both browsers. The guard is CSS-only — `customer-preview.html:255-256`
(`pointer-events:none`) — which suppresses mouse hit-testing but does not clear `contenteditable`
or remove the element from the tab order. The photo path *is* guarded in JS (`window._previewMode`,
`customer-preview.html:923`); the caption path has no JS equivalent. Contrast `lockForApproval()`
(`customer-preview.html:2776`), which correctly sets `contenteditable="false"`.
**Impact:** low — Save is hidden in Preview, so it can't be persisted from that mode. Also means
view-only isn't keyboard-equivalent.
**Fix (not applied):** have the mode toggle set `contenteditable="false"/"true"`, as
`lockForApproval()` does.

### F-P1-P02 (S3) — Preview → Edit leaves the `.preview-mode` class on the canvas; the book jumps ~40px
Enter (`customer-preview.html:2717`) adds the class via `querySelectorAll('.book-canvas-wrap')`
— works. Leave (`customer-preview.html:2700`) removes by **id** via
`getElementById('book-canvas-wrap')` — but no element has that id (the markup at
`customer-preview.html:758` is `<div class="book-canvas-wrap">`; the `id="book-canvas"` at 759 is
the *inner* div). `getElementById` returns null, `?.` swallows it, removal silently no-ops, so
`.book-canvas-wrap.preview-mode` (lines 257-260) stays applied in Edit: `max-width` 1400→1290px,
book shifts ~40px.
**Impact:** cosmetic, self-heals on reload; 6px headroom left against the spread, thin but safe.
**Fix (not applied):** mirror line 2717 — remove by class.

**Repro:** `node qa/p1-preview-viewonly.mjs`. **Artefacts:** `sessions/qa-runs/2026-07-13-p1-preview-viewonly/`.

---

## P1-6 — password reset — PASS

Branded in-app reset completes, new password works, old one rejected, security-alert email
fires. The reset link lands on **our** branded page
(`aevia-test.pages.dev/pages/account?mode=resetPassword&oobCode=…`), NOT Firebase's default
`__/auth/action`. Reset email from `Aevia <noreply@aevia.at>`; security-alert email *"Your Aevia
password was changed"* fires. Response copy does not disclose account existence. Two minor gaps:

### F-P1-P03 (S3) — the security-alert email is fire-and-forget; closing the tab within ~8s kills it
`account.html:728` calls `fetch(SEND_PW_CHANGED, …).catch(() => {})` **without awaiting**. The
function takes ~8s cold. Close/navigate before it completes and the request aborts — **no
security-alert email is sent, silently** (the `.catch` swallows it). Low likelihood, but the
missing mail is exactly the *"wasn't you? contact us"* alert that matters if the reset was an
attacker's.
**Fix (not applied):** `await` it before routing, or move the send server-side on a
password-change trigger.

### F-P1-P04 (S3, UX) — the reset request shows nothing for ~8 seconds
"Send reset link" disables the button and shows **nothing** until the Cloud Function returns —
measured **8.1s** cold. No spinner. A customer would assume the click didn't register. The reset
form's own submit does this correctly (`account.html:719`, "Saving…").

**Artefacts:** `sessions/qa-runs/2026-07-13-p1-auth-reset/` (incl. `reset-email.html`,
`password-changed-email.html`).

---

## Ruled out — looked like findings, are not

1. **Drag-gain = 0** — harness. `customer-preview.html:121` sets `scroll-behavior:smooth`, so
   `scrollIntoView()` animates and the pointerdown raced the animation. Fixed with
   `behavior:'instant'` + settle-wait.
2. **Drag-gain = 0 only at 1100/950px** — harness. Leftover `scrollX` put the next slot under the
   fixed 240px photo sidebar; the pointer hit a sidebar thumbnail. Fixed with `inline:'center'`.
3. **Reset request returns empty message** — harness read at 4s; message appears at 8.1s (the real
   UX point survives as F-P1-P04).
4. **`sendPasswordChangedEmail` never fires** — harness (tab closed before the un-awaited fetch);
   endpoint is correct (`200 {"ok":true}`, email arrives). Real risk survives as F-P1-P03.
5. **`403 {"error":"unverified"}` on `getMyAddress`/`getMyReferralCode` in console** — correct;
   fires only while the token still says unverified right after signup; both 200 after refresh.

---

## Environment note — AEV-053 status

AEV-053 arrived **`approved`**, not `review_sent` (the parallel staff track approved it for its
own leg). `approved` sets `window._readOnly`, disabling reposition/caption/swap — untestable for
P1-8/P1-9. Reset to `review_sent` via the dashboard status dropdown (plain Firestore field
update, no emails/side effects) using new `qa/p1-set-status.mjs`. **Left in `review_sent`, saved
book intact (54 photos).** Nothing here saved/approved/paid on AEV-053; caption/crop edits were
in-memory only (S24 trap avoided). Touched only AEV-053.
