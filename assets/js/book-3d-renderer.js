// book-3d-renderer.js — the reusable 3D book renderer (ADR 0005).
//
// Durable, framework-light: takes a THREE instance + a book spec (from
// book-3d-spec.js) + a cover-wrap texture, builds a posed 3D book in a scene.
// Used now to EXPORT static website imagery; reusable later inside the live
// customer-preview "see your book" moment WITHOUT a rewrite (same entry point).
//
// It does NOT import Three.js itself — the caller passes it in (so the website
// export harness and a future customer-preview can each wire Three.js their own
// way). Pure geometry/texture math lives in book-3d-spec.js (unit-tested); this
// file is the WebGL scene (screenshot-verified).

// Fixed physical features of the case-bound hardcover, UNIVERSAL across templates
// (printhouse spec: 2.5mm greyboard cover, casing-in, ~3mm cover overhang/"square").
const BOARD_MM  = 2.5; // greyboard thickness
const SQUARE_MM = 3;   // cover overhang past the page block on the 3 open edges

// Build a textured 3D book group as a case-bound HARDCOVER. Returns { book, fit }.
// Construction (mirrors the real product, not a flat box → reads hardcover, not paperback):
//   • front + back boards (2.5mm), slightly LARGER than the page block,
//   • an inset PAGE BLOCK between them — recessed by the "square" on the fore-edge
//     (+x) and top/bottom (±y), flush at the spine (-x),
//   • a flat (straight-back) spine strip on -x.
export function createBook(THREE, scene, renderer, spec, wrapTexture) {
  const { aspect, depthRatio } = spec.proportions;
  const W = 2 * aspect, H = 2, D = Math.max(2 * depthRatio, 0.12); // floor so it reads as a book

  // mm → scene units (W spans the front cover width in mm).
  const u = W / spec.mm.frontWmm;
  const BOARD  = BOARD_MM  * u;
  const SQUARE = SQUARE_MM * u;

  wrapTexture.colorSpace = THREE.SRGBColorSpace;
  wrapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // A cloned slice of the wrap for one face, via UV offset+repeat.
  const slice = (region, flip) => {
    const t = wrapTexture.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    t.offset.x = region.offsetX;
    t.repeat.x = region.repeatX * (flip ? -1 : 1);
    if (flip) t.offset.x = region.offsetX + region.repeatX; // keep the same slice when mirrored
    return t;
  };
  const matte = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.62, metalness: 0 });

  const frontMat = matte(slice(spec.regions.front, false));
  const backMat  = matte(slice(spec.regions.back, false));
  const spineMat = matte(slice(spec.regions.spine, false));
  // Cream lining for inner board faces (the turn-in seen under the overhang lip).
  const linerMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.9 });
  // Board RIM colour: the printed wrap turns in over the board edge, so the lip is
  // the cover's edge colour — derived from the wrap itself (generic, any template),
  // NOT the photo mapped onto the thin face (that smears into streaks).
  const edgeMat = new THREE.MeshStandardMaterial({ color: averageBorderColor(THREE, wrapTexture), roughness: 0.62 });
  // Trimmed page block — warm off-white with subtle striations on the cut edges.
  const edgeTex = pageEdgeTexture(THREE);
  const pageFaceMat = new THREE.MeshStandardMaterial({ map: edgeTex, color: 0xf6f1e7, roughness: 0.95 });
  const pagePlainMat = new THREE.MeshStandardMaterial({ color: 0xf6f1e7, roughness: 0.95 });

  const book = new THREE.Group();
  // BoxGeometry material order: [+x, -x, +y, -y, +z, -z].
  // x layout (no coplanar overlaps → no z-fighting): spine occupies the -x end,
  // boards + page block start just inside it.
  const SP = BOARD;            // spine panel depth along x
  const boardLeft = -W / 2 + SP;

  // ── Front board: overhangs the page block (full height, fore-edge to spine zone).
  const bw = W - SP;
  const frontBoard = new THREE.Mesh(
    new THREE.BoxGeometry(bw, H, BOARD),
    [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, linerMat] // +z outer = front; rims = edge
  );
  frontBoard.position.set(SP / 2, 0, D / 2 - BOARD / 2);
  frontBoard.castShadow = true; frontBoard.receiveShadow = true;
  book.add(frontBoard);

  // ── Back board.
  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(bw, H, BOARD),
    [edgeMat, edgeMat, edgeMat, edgeMat, linerMat, backMat] // -z outer = back; rims = edge
  );
  backBoard.position.set(SP / 2, 0, -D / 2 + BOARD / 2);
  backBoard.castShadow = true; backBoard.receiveShadow = true;
  book.add(backBoard);

  // ── Page block: between the boards, inset by the square at the fore-edge (+x) and
  // top/bottom (±y), flush against the spine zone at -x.
  const pw = W - SQUARE - SP;
  const ph = H - 2 * SQUARE;
  const pd = D - 2 * BOARD;
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(pw, ph, pd),
    [pageFaceMat, pagePlainMat, pageFaceMat, pageFaceMat, pagePlainMat, pagePlainMat]
  );
  pages.position.set(boardLeft + pw / 2, 0, 0);
  pages.castShadow = true; pages.receiveShadow = true;
  book.add(pages);

  // ── Spine: flat strip filling the spine zone (-W/2 → boardLeft), abutting the
  // boards EXACTLY (no overlap → no coplanar external faces → no z-fighting). The
  // only coincident faces are the internal abutting ones (back-to-back, never seen).
  // -x = spine; the front/back/top/bottom strips take the cover-EDGE colour so the
  // spine→cover junction reads as the wrap continuing, not a cream sliver.
  const spineBox = new THREE.Mesh(
    new THREE.BoxGeometry(SP, H, D),
    [edgeMat, spineMat, edgeMat, edgeMat, edgeMat, edgeMat]
  );
  spineBox.position.set(-W / 2 + SP / 2, 0, 0);
  spineBox.castShadow = true; spineBox.receiveShadow = true;
  book.add(spineBox);

  scene.add(book);

  // Hero pose: three-quarter view — front cover + spine + top edge visible.
  book.rotation.y = -0.5;
  book.rotation.x = -0.18;

  function fit(camera) {
    camera.position.set(1.6 * Math.max(aspect, 1), 1.5, 3.4);
    camera.lookAt(0, 0, 0);
  }
  return { book, fit, dims: { W, H, D } };
}

// Average colour of the wrap's outer border → the cover-edge colour for the board
// rims (the printed wrap turns in over the board edge). Generic: read from whatever
// texture is supplied, so it's right for any template without per-template config.
function averageBorderColor(THREE, texture) {
  const img = texture.image;
  const cw = 64, ch = 64;
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const cx = cv.getContext('2d');
  cx.drawImage(img, 0, 0, cw, ch);
  const d = cx.getImageData(0, 0, cw, ch).data;
  let r = 0, g = 0, b = 0, n = 0;
  const add = (x, y) => { const i = (y * cw + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; };
  for (let x = 0; x < cw; x++) { add(x, 0); add(x, ch - 1); }
  for (let y = 0; y < ch; y++) { add(0, y); add(cw - 1, y); }
  return new THREE.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
}

// A small procedural texture of fine horizontal lines → reads as stacked page
// edges on the trimmed block. Cheap + generic (no per-template data).
function pageEdgeTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f6f1e7'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(150,140,120,0.35)'; ctx.lineWidth = 1;
  for (let y = 1.5; y < c.height; y += 3) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 60); // many fine lines across the edge
  return t;
}

// Studio lighting + a soft ground shadow — premium, neutral.
//
// Colour fidelity vs shape: the cover art (esp. the dark navy) must read close to
// the flat engine colour on EVERY face, including the back (which faces away from
// the key light). So a strong, direction-independent AMBIENT sets the true-colour
// floor; the directional key only adds a gentle highlight + the ground shadow on
// top. Without the ambient floor, lit faces darken navy and unlit faces go near-black.
export function studioLighting(THREE, scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Even base illumination — renders each face near its true texture colour.
  // GENERIC by design: this level is tuned to be ~90% faithful across ALL templates
  // (dark navy AND light/off-white covers) — NOT maxed out to colour-match any one
  // template exactly. Don't fine-tune per template; a small universal offset beats
  // re-tuning each cover. Re-validate against a light cover when generalising.
  scene.add(new THREE.AmbientLight(0xffffff, 1.85));
  // Subtle sky/ground tint for warmth, not a primary light.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xeae3d2, 0.3));
  // Key: gentle highlight + the soft ground shadow only (low intensity so it shapes
  // without darkening the rest).
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  // More overhead (less to the side) → a short shadow that stays UNDER the book as a
  // soft contact shadow, instead of a long hard slab thrown out behind it.
  key.position.set(1.2, 6, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 9;        // blur the edge → soft, premium contact shadow
  scene.add(key);
  // Back fill: the back cover (-z) faces away from the key and lagged ~10% darker
  // than the front. A soft light from behind brings it to colour parity. No shadow.
  const backFill = new THREE.DirectionalLight(0xffffff, 0.7);
  backFill.position.set(-2, 2, -5);
  scene.add(backFill);
}

// A shadow-catcher plane just under the book.
export function groundShadow(THREE, scene, y) {
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.13 })
  );
  g.rotation.x = -Math.PI / 2;
  g.position.y = y;
  g.receiveShadow = true;
  scene.add(g);
  return g;
}
