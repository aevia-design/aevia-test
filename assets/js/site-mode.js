/* site-mode.js — host-aware pre-launch behaviour. Inert on localhost.
 *
 *   pages.dev (test rig)  → inject <meta robots noindex> (belt-and-suspenders;
 *                           canonical tags are the primary dedup — Phase 4).
 *   aevia.at  (live)      → show "opening this autumn" banner on marketing pages,
 *                           and act as the BELT behind the Cloudflare order gate:
 *                           if an order page somehow renders here, send it to the
 *                           waitlist. (The Cloudflare Redirect Rule is primary and
 *                           fails closed; this only catches a rule misfire.)
 *
 * The live-site noindex-until-launch is handled server-side by a Cloudflare
 * header rule, NOT here — see docs/briefs/domain-migration.md, Phase 3 step 6.
 */
(function () {
  var host = location.hostname;
  var isTestRig = host.endsWith('pages.dev');
  var isLive    = host.endsWith('aevia.at');
  if (!isTestRig && !isLive) return; // localhost / anything else: do nothing

  if (isTestRig) {
    var m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex';
    document.head.appendChild(m);
  }

  if (isLive) {
    var path = location.pathname;

    // Belt behind the Cloudflare order gate.
    if (path.indexOf('/pages/order') === 0 || /\/order(\.html)?$/.test(path)) {
      location.replace('/pages/waitlist');
      return;
    }

    // "Opening this autumn" banner on every other (marketing) page.
    var bar = document.createElement('a');
    bar.href = '/pages/waitlist';
    bar.textContent = 'Opening this autumn. Join the waitlist →';
    bar.style.cssText =
      'display:block;text-align:center;padding:10px 16px;background:#1a1a1a;' +
      'color:#fafaf8;font:500 13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
      'letter-spacing:0.04em;text-decoration:none;position:relative;z-index:2000;';
    document.body.insertAdjacentElement('afterbegin', bar);
  }
})();
