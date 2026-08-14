/* product.js — shared behaviour for the customer product pages. Each page sets
   a small window.PRODUCT config before this loads:

     window.PRODUCT = {
       base:'../assets/images/mockups/exp2/<template>/',  // image folder
       template:'Scribble', category:'kids', back:'scribble.html',
       fp:{ FP1:{name:'…', inputType:'photo', slug:'fp1'}, … }  // special spreads
     };

   Markup contract (same across every template): #gallery-img hero, #thumbs with
   .thumb-ph[data-src] buttons, .sp-card[data-fp] cards, #price, #lightbox +
   #lightbox-img. Loaded with `defer`, so the DOM is ready when this runs. */
(function () {
  var cfg = window.PRODUCT || {};
  var BASE = cfg.base || '';

  // ── Balanced thumbnail grid ──
  // Thumbs keep a FIXED size (the width one gets in a full 6-across row, matching
  // Scribble) — they never grow to fill the hero width. ≤6 thumbs → one centred
  // row; 7+ → two equal rows (ceil(count/2) each). Both rows are centred, so an
  // odd bottom row (4+3, 5+4, 6+5) sits centred under the top row. Adapts to any
  // template's thumb count automatically.
  var grid = document.getElementById('thumbs');
  if (grid) {
    var thumbs = [].slice.call(grid.querySelectorAll('.thumb-ph'));
    var n = thumbs.length, GAP = 8, BASECOLS = 6;
    var cols = n <= BASECOLS ? n : Math.ceil(n / 2);
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.justifyContent = 'center';
    grid.style.margin = '8px auto 0';
    var layout = function () {
      var avail = grid.parentElement.clientWidth;      // stable gallery width
      var tw = (avail - GAP * (BASECOLS - 1)) / BASECOLS;
      grid.style.maxWidth = (cols * tw + GAP * (cols - 1)) + 'px';
      thumbs.forEach(function (t) { t.style.flex = '0 0 ' + tw + 'px'; });
    };
    layout();
    window.addEventListener('resize', layout);
  }

  // ── Gallery / hero ──
  window.setHero = function (btn) { setHeroFile(btn.dataset.src); };
  window.setHeroFile = function (file) {
    // Read cfg.base live rather than the captured BASE: Heirloom repoints its image
    // folder when the colourway or monogram changes, and a captured copy would keep
    // serving the previous colourway's spreads from the thumbnails.
    document.getElementById('gallery-img').src = (cfg.base || BASE) + file;
    document.querySelectorAll('.thumb-ph').forEach(function (t) {
      t.classList.toggle('on', t.dataset.src === file);
    });
  };
  window.navArrow = function (dir) {
    var list = [].slice.call(document.querySelectorAll('.thumb-ph'));
    var i = list.findIndex(function (t) { return t.classList.contains('on'); });
    if (i < 0) i = 0;
    i = (i + dir + list.length) % list.length;
    setHero(list[i]);
    var lb = document.getElementById('lightbox');
    if (lb.classList.contains('on')) document.getElementById('lightbox-img').src = document.getElementById('gallery-img').src;
  };

  // ── Lightbox ──
  window.openLightbox = function (src) {
    var lb = document.getElementById('lightbox');
    document.getElementById('lightbox-img').src = src;
    lb.classList.add('on');
  };
  window.closeLightbox = function () { document.getElementById('lightbox').classList.remove('on'); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navArrow(-1);
    else if (e.key === 'ArrowRight') navArrow(1);
  });

  // ── Book language selector (germanization Stage 1) ──
  // Injected above the page-count chips on every product page — no per-page markup.
  // Default: DE on the /de/ pages, EN elsewhere; the customer can flip it either way.
  // The choice drives the whole order (artwork, form, captions) via the `lang` param.
  var LANG = window.location.pathname.indexOf('/de/') !== -1 ? 'de' : 'en';
  var toggleHost = document.querySelector('.page-toggle');
  if (toggleHost) {
    var L = cfg.labels || {};
    var wrap = document.createElement('div');
    wrap.className = 'lang-toggle';
    wrap.innerHTML =
      '<div class="section-label">' + (L.bookLang || (LANG === 'de' ? 'Buchsprache' : 'Book language')) + '</div>' +
      '<div class="chips">' +
        '<div class="chip" data-lang="en"><span class="chip-label">English</span></div>' +
        '<div class="chip" data-lang="de"><span class="chip-label">Deutsch</span></div>' +
      '</div>';
    toggleHost.parentNode.insertBefore(wrap, toggleHost);
    var langChips = wrap.querySelectorAll('.chip');
    var syncLang = function () {
      langChips.forEach(function (c) { c.classList.toggle('on', c.dataset.lang === LANG); });
    };
    langChips.forEach(function (c) {
      c.addEventListener('click', function () { LANG = c.dataset.lang; syncLang(); });
    });
    syncLang();
  }

  // ── Page toggle + special-spread cards ──
  window.pick = function (el, p) {
    el.closest('.chips').querySelectorAll('.chip').forEach(function (c) { c.classList.remove('on'); });
    el.classList.add('on');
    document.getElementById('price').textContent = p;
  };
  window.xtra = function (card) {
    card.classList.toggle('on');
    // Labels overridable per page (the /de/ pages set German ones); EN defaults.
    var L = cfg.labels || {};
    card.querySelector('.sp-add').textContent = card.classList.contains('on') ? (L.added || 'Added ✓') : (L.add || 'Add');
  };

  // ── Accordion ──
  window.acc = function (btn) {
    var item = btn.closest('.acc-item');
    var open = item.classList.contains('open');
    document.querySelectorAll('.acc-item').forEach(function (i) { i.classList.remove('open'); });
    if (!open) item.classList.add('open');
  };

  // ── Order handoff ──
  window.goToOrder = function () {
    var price = document.getElementById('price').textContent;
    var selectedChip = document.querySelector('.chip.on');
    // parseInt instead of stripping ' pages' — works for "40 pages" and "40 Seiten" alike.
    var pages = selectedChip ? String(parseInt(selectedChip.querySelector('.chip-label').textContent, 10) || 40) : '40';
    var selected = [];
    document.querySelectorAll('.sp-card.on').forEach(function (a) {
      var meta = (cfg.fp || {})[a.dataset.fp];
      if (meta) selected.push(meta);
    });
    var params = new URLSearchParams({ template: cfg.template, category: cfg.category, pages: pages, price: price, back: cfg.back, lang: LANG });
    if (selected.length) {
      params.set('addons', selected.map(function (m) { return m.name; }).join(','));
      params.set('addon_inputs', selected.map(function (m) { return m.inputType; }).join(','));
      params.set('addon_slugs', selected.map(function (m) { return m.slug; }).join(','));
    }
    // Extra params a page chooses at runtime (Heirloom sends the family monogram, which
    // the order form preselects from). Set last so a page can override nothing by accident.
    Object.keys(cfg.extra || {}).forEach(function (k) { params.set(k, cfg.extra[k]); });
    // The /de/ pages sit one level deeper and set orderUrl:'../order.html'.
    window.location.href = (cfg.orderUrl || 'order.html') + '?' + params.toString();
  };

  // ── Nav background on scroll ──
  var nav = document.querySelector('.nav');
  if (nav) window.addEventListener('scroll', function () {
    nav.style.background = window.scrollY > 80 ? 'rgba(250,250,248,0.97)' : 'rgba(250,250,248,0.92)';
  });
})();
