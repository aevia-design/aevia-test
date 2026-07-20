// ─── Shared email transport (Brevo SMTP relay) ───────────────────────────────
// Replaces the old per-file Gmail SMTP transports. Brevo is a drop-in SMTP
// relay, so this stays plain nodemailer — no new SDK dependency.
// Required env vars (functions/.env, never committed):
//   BREVO_SMTP_LOGIN — the SMTP login shown in Brevo's SMTP & API settings
//   BREVO_SMTP_KEY   — the SMTP key (not the API key) from the same page
// See docs/briefs/email-communication.md for the full migration plan.
const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
}

// Sender identities. All route replies to a human-read Microsoft 365 alias
// (docs/briefs/email-communication.md) so a customer replying to an
// automated email lands in an inbox someone reads, not at Brevo.
const FROM = {
  // Internal staff notifications (new order / payment received) → EMAIL_NOTIFY.
  orders: { from: '"Aevia Orders" <orders@aevia.at>', replyTo: 'orders@aevia.at' },
  // Customer-facing order + payment emails. Sent from orders@ (recognisable,
  // good for trust/deliverability) but replies route to the monitored support@
  // inbox. orders@ still receives, so writing to it directly also works.
  customer: { from: '"Aevia" <orders@aevia.at>', replyTo: 'support@aevia.at' },
  // Account/security emails (verification, password reset, password-changed).
  // Sent from noreply@ because they're system-generated; the body tells the
  // customer not to reply and to contact support@ instead, and replyTo points
  // there too so a stray reply still reaches a human.
  account: { from: '"Aevia" <noreply@aevia.at>', replyTo: 'support@aevia.at' },
  artists: { from: '"Aevia Artists" <partners@aevia.at>', to: 'partners@aevia.at' },
};

// ─── Shared branded email template (S105-approved design) ────────────────────
// One layout for every customer email: opens straight into the body ("Hi <name>"),
// logo lives in the footer (not a header), footer is left-aligned and tiered.
// Logo is a hosted CDN URL (NOT base64) — this deliberately avoids the S105
// base64-integrity bug (a truncated embedded copy rendered clipped). Email clients
// load it like any other image.
// Served from our own domain (S144). It previously pointed at a Webflow CDN left
// over from the old prototype — still responding, but an asset on infrastructure
// we neither control nor pay for. Absolute and production-only on purpose: email
// clients have no origin to resolve against, and a pages.dev URL would leak the
// test rig into real customer mail.
const LOGO_URL = 'https://aevia.at/assets/images/aevia_logo_transparent.png';

// A primary call-to-action button (dark, centred). href + label.
function emailButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="border-radius:4px;background:#1a1a1a">
    <a href="${href}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#ffffff;text-decoration:none;letter-spacing:.02em">${label}</a>
  </td></tr></table>`;
}

// Wrap body HTML in the approved shell. `body` is the inner HTML (already escaped).
// Footer contact line varies by email type:
//   { noReply: true }  → account/security: "automated, don't reply, contact support@"
//   { support: true }  → order/payment: repliable, questions go to support@
//   (default)          → general: hello@
function renderEmail(body, opts = {}) {
  const contactLine = opts.noReply
    ? `This is an automated message, so please don't reply. If you need help, write to us at <a href="mailto:support@aevia.at" style="color:#8a8a8a">support@aevia.at</a>`
    : opts.support
      ? `Questions? Write to us at <a href="mailto:support@aevia.at" style="color:#8a8a8a">support@aevia.at</a>`
      : `Questions? Write to us at <a href="mailto:hello@aevia.at" style="color:#8a8a8a">hello@aevia.at</a>`;
  return `
  <div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;background:#ffffff;color:#2a2a2a">
    <div style="padding:44px 44px 8px;font-size:16px;line-height:1.7">
      ${body}
    </div>
    <div style="padding:32px 44px 40px;text-align:left">
      <img src="${LOGO_URL}" width="104" alt="Aevia" style="display:block;margin:0 0 16px">
      <p style="font-style:italic;color:#6a6a6a;font-size:14px;line-height:1.6;margin:0 0 18px">A premium photo book studio in Vienna. We design and make your book; it's yours to keep.</p>
      <hr style="border:none;border-top:1px solid #e2e2e2;margin:0 0 16px">
      <p style="font-family:Arial,Helvetica,sans-serif;color:#8a8a8a;font-size:12px;line-height:1.6;margin:0 0 10px">Bloch-Bauer-Promenade 20/18, 1100 Vienna, Austria &nbsp;&middot;&nbsp; GISA 39598240</p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#8a8a8a;font-size:12px;line-height:1.6;margin:0 0 10px">${contactLine}</p>
      <p style="font-family:Arial,Helvetica,sans-serif;color:#8a8a8a;font-size:12px;line-height:1.6;margin:0">&copy; 2026 Aevia. All rights reserved. &middot; Aevia&trade;</p>
    </div>
  </div>`;
}

module.exports = { createTransporter, FROM, renderEmail, emailButton };
