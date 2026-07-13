// testmail.app helper for pre-launch QA email testing.
// Reads credentials from qa/.env at runtime (Claude cannot read .env directly;
// Node does the reading). Dependency-free — uses Node 18+ global fetch.
//
// Usage as a module:
//   import { address, waitForEmail, extractLinks } from './testmail.mjs';
//   const to = address('order01');            // kidkd.order01@inbox.testmail.app
//   const mail = await waitForEmail({ tag: 'order01', subjectIncludes: 'Verify' });
//   const link = extractLinks(mail, /verify|oobCode/i)[0];
//
// Usage as a CLI (quick manual peek at an inbox):
//   node qa/testmail.mjs order01
//   node qa/testmail.mjs order01 "View your book"

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(HERE, '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const ENV = loadEnv();
const API_KEY = ENV.TESTMAIL_API_KEY;
const NAMESPACE = ENV.TESTMAIL_NAMESPACE;

if (!API_KEY || !NAMESPACE) {
  throw new Error('TESTMAIL_API_KEY / TESTMAIL_NAMESPACE missing from qa/.env');
}

/** Full inbox address for a tag, e.g. address('order01') -> kidkd.order01@inbox.testmail.app */
export function address(tag) {
  return `${NAMESPACE}.${tag}@inbox.testmail.app`;
}

/**
 * Fetch emails for a tag. Returns the raw testmail `emails` array (newest first).
 * @param {object} o
 * @param {string} [o.tag]        restrict to one sub-address tag
 * @param {number} [o.sinceTs]    only emails with timestamp >= this (ms epoch)
 * @param {boolean} [o.live]      long-poll for a new email (server holds up to ~10s)
 */
export async function getEmails({ tag, sinceTs, live = false } = {}) {
  const u = new URL('https://api.testmail.app/api/json');
  u.searchParams.set('apikey', API_KEY);
  u.searchParams.set('namespace', NAMESPACE);
  if (tag) u.searchParams.set('tag', tag);
  if (sinceTs) u.searchParams.set('timestamp_from', String(sinceTs));
  if (live) u.searchParams.set('livequery', 'true');
  const res = await fetch(u);
  if (!res.ok) throw new Error(`testmail HTTP ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error(`testmail error: ${JSON.stringify(data)}`);
  return data.emails || [];
}

/**
 * Poll until an email arrives (or timeout). Match on subject substring and/or a predicate.
 * Returns the matching email object. Throws on timeout.
 * @param {object} o
 * @param {string}  o.tag
 * @param {string}  [o.subjectIncludes]   case-insensitive subject substring
 * @param {(m:any)=>boolean} [o.predicate]
 * @param {number}  [o.sinceTs]           ignore emails older than this (default: now)
 * @param {number}  [o.timeoutMs]         default 120000
 * @param {number}  [o.pollMs]            default 3000
 */
export async function waitForEmail({
  tag,
  subjectIncludes,
  predicate,
  sinceTs = Date.now(),
  timeoutMs = 120000,
  pollMs = 3000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  const subjNeedle = subjectIncludes ? subjectIncludes.toLowerCase() : null;
  while (Date.now() < deadline) {
    const emails = await getEmails({ tag, sinceTs, live: true });
    for (const m of emails) {
      if (subjNeedle && !(m.subject || '').toLowerCase().includes(subjNeedle)) continue;
      if (predicate && !predicate(m)) continue;
      return m;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(
    `Timed out after ${timeoutMs}ms waiting for email` +
      (tag ? ` [tag=${tag}]` : '') +
      (subjectIncludes ? ` [subject~="${subjectIncludes}"]` : '')
  );
}

/** Pull hrefs out of an email (html preferred, text fallback), optionally filtered by regex. */
export function extractLinks(email, filter) {
  const links = new Set();
  const html = email.html || '';
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) links.add(m[1]);
  const text = email.text || '';
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/gi)) links.add(m[0]);
  let out = [...links];
  if (filter) out = out.filter((l) => filter.test(l));
  return out;
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [tag, subjectIncludes] = process.argv.slice(2);
  if (!tag) {
    console.log('Usage: node qa/testmail.mjs <tag> [subjectSubstring]');
    console.log(`Namespace: ${NAMESPACE}  (address example: ${address('order01')})`);
    process.exit(0);
  }
  const emails = await getEmails({ tag });
  console.log(`Inbox ${address(tag)} — ${emails.length} message(s):`);
  for (const m of emails.slice(0, 10)) {
    const when = new Date(m.timestamp).toISOString();
    console.log(`  [${when}] from=${m.from}  subject="${m.subject}"`);
    if (subjectIncludes && (m.subject || '').toLowerCase().includes(subjectIncludes.toLowerCase())) {
      const links = extractLinks(m);
      links.forEach((l) => console.log(`      link: ${l}`));
    }
  }
}
