// Read-only Stripe probe for the P1 promo/payment track.
// Loads functions/.env itself (Claude cannot read .env directly; Node does the reading)
// and reports what promo objects actually exist in the Stripe TEST account, so a
// "code rejected" result can be told apart from "code never existed".
//
// Never prints the secret key.
//
// Run: node qa/p1-promo-stripe.mjs [codeToLookUp ...]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve('functions/package.json'));
const Stripe = require('stripe');

const raw = fs.readFileSync(path.resolve('functions/.env'), 'utf8');
const env = {};
for (const line of raw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const key = env.STRIPE_SECRET_KEY;
if (!key) { console.error('No STRIPE_SECRET_KEY in functions/.env'); process.exit(1); }
console.log(`Stripe mode: ${key.startsWith('sk_test') ? 'TEST ✓' : 'LIVE ⚠️'}`);
console.log(`STRIPE_REFERRAL_COUPON_ID: ${env.STRIPE_REFERRAL_COUPON_ID || '(NOT SET)'}`);

const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

const coupons = await stripe.coupons.list({ limit: 50 });
console.log(`\n── Coupons (${coupons.data.length})`);
for (const c of coupons.data) {
  console.log(`  ${c.id}  name="${c.name}"  ${c.percent_off ? c.percent_off + '% off' : ((c.amount_off / 100) + ' ' + (c.currency || '').toUpperCase() + ' off')}  valid=${c.valid}  redeemed=${c.times_redeemed}/${c.max_redemptions ?? '∞'}  applies_to=${JSON.stringify(c.applies_to || null)}`);
}

const promos = await stripe.promotionCodes.list({ limit: 100 });
console.log(`\n── Promotion codes (${promos.data.length})`);
for (const p of promos.data) {
  console.log(`  ${p.code}  id=${p.id}  coupon=${p.coupon.id}  active=${p.active}  used=${p.times_redeemed}/${p.max_redemptions ?? '∞'}  first_time=${!!p.restrictions?.first_time_transaction}  customer=${p.customer || '-'}  kind=${p.metadata?.aevia_kind || '-'}  ref=${p.metadata?.referrerEmail || '-'}`);
}

for (const code of process.argv.slice(2)) {
  const found = await stripe.promotionCodes.list({ code, limit: 5 });
  console.log(`\n── Lookup "${code}": ${found.data.length} match(es)`);
  found.data.forEach(p => console.log('   ' + JSON.stringify({ id: p.id, active: p.active, times_redeemed: p.times_redeemed, restrictions: p.restrictions, coupon: p.coupon.id, customer: p.customer }, null, 2)));
}
