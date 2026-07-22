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

    // Belt behind the Cloudflare order gate. Anchored to a whole path segment so
    // it cannot swallow a future sibling route such as /pages/orders; the trailing
    // match also covers a DE order page if one is ever added.
    if (/\/order(\.html)?$/.test(path)) {
      location.replace('/pages/waitlist');
      return;
    }

    // Pre-launch banner on every other (marketing) page. Deliberately slim: it
    // sits above a fixed nav, so every pixel here costs a pixel of the page.
    // DE pages live under /de/ and get the German string; there is no DE
    // waitlist page yet, so both languages link to the same one.
    var isDE = path.indexOf('/de/') !== -1;

    var bar = document.createElement('a');
    bar.href = '/pages/waitlist';
    bar.textContent = isDE
      ? 'Unsere Website ist noch im Aufbau. Aevia eröffnet im Herbst 2026. Zur Warteliste →'
      : 'Our site is still being built. Aevia opens autumn 2026. Join the waitlist →';
    bar.style.cssText =
      'display:block;text-align:center;padding:6px 16px;background:#9a3b26;' +
      'color:#fdf6f0;font:500 12px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;' +
      'letter-spacing:0.04em;text-decoration:none;position:relative;z-index:2000;';
    document.body.insertAdjacentElement('afterbegin', bar);

    // The site nav is position:fixed;top:0. Left alone it renders UNDER this
    // banner and loses its top strip — that's what was clipping the logo.
    // Push it down by exactly the banner's height. Page content needs no
    // adjustment: the banner is in normal flow, so everything below it already
    // shifts down by the same amount and the existing offsets still line up.
    // Re-measured on resize because the text rewraps to two lines on narrow
    // phones, which changes the height.
    function offsetFixedNav() {
      var h = bar.offsetHeight;
      var navs = document.querySelectorAll('.nav');
      for (var i = 0; i < navs.length; i++) navs[i].style.top = h + 'px';
    }
    offsetFixedNav();
    if (window.ResizeObserver) {
      new ResizeObserver(offsetFixedNav).observe(bar);
    } else {
      window.addEventListener('resize', offsetFixedNav);
    }
  }
})();
