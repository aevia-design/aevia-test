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

// Build a textured 3D book group. Returns { book, fit } where fit() frames it.
export function createBook(THREE, scene, renderer, spec, wrapTexture) {
  const { aspect, depthRatio } = spec.proportions;
  // Cover is `aspect` wide × 1 tall; thickness scales off width.
  const W = 2 * aspect, H = 2, D = Math.max(2 * depthRatio, 0.12); // floor so it reads as a book, not paper

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

  const pages = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.95 });
  const spineMat = new THREE.MeshStandardMaterial({ color: 0x142a4f, roughness: 0.5 });

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z.
  //  +z = front cover, -z = back cover, -x = spine, +x/+y/-y = page edges.
  const front = matte(slice(spec.regions.front, false));
  const back = matte(slice(spec.regions.back, true)); // -z face is mirrored; flip to read correctly
  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, D),
    [pages, spineMat, pages, pages, front, back]
  );
  cover.castShadow = true;
  cover.receiveShadow = true;

  const book = new THREE.Group();
  book.add(cover);
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

// Studio lighting + a soft ground shadow — premium, neutral.
export function studioLighting(THREE, scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xddd5c4, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -4; key.shadow.camera.right = 4;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0003;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55);
  fill.position.set(-4, 2, 2);
  scene.add(fill);
}

// A shadow-catcher plane just under the book.
export function groundShadow(THREE, scene, y) {
  const g = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.2 })
  );
  g.rotation.x = -Math.PI / 2;
  g.position.y = y;
  g.receiveShadow = true;
  scene.add(g);
  return g;
}
