// TO-DOS #99 — a small in-memory Firestore fake, shared between the jest
// scenario suite (tests/review-lock-scenarios.test.js) and the Playwright
// harness (qa/review-lock-server.mjs). It implements ONLY the surface
// functions/index.js's #99 handlers actually use — this is not a general
// Firestore emulator, and it deliberately has no persistence, no real
// transaction isolation/retry, and no query engine beyond what's needed here.
//
// Supported: collection(name).doc(id) with get/update/collection(sub).doc(id);
// collection(name).where(field,'==',val).limit(n).get(); runTransaction(fn)
// with tx.get/update/create (create throws if the doc already exists);
// FieldValue.serverTimestamp()/arrayUnion(...); Timestamp.now(). All three
// sentinels resolve to a plain {seconds} object when a patch is actually
// applied, mirroring what a real read would show afterwards.

function isSentinel(v) {
  return v && typeof v === 'object' && typeof v.__fv === 'string';
}

function deepResolve(val) {
  if (val === null || val === undefined || typeof val !== 'object') return val;
  if (isSentinel(val)) {
    if (val.__fv === 'serverTimestamp' || val.__fv === 'timestampNow') {
      return { seconds: Math.floor(Date.now() / 1000) };
    }
    return val;
  }
  if (Array.isArray(val)) return val.map(deepResolve);
  const out = {};
  for (const [k, v] of Object.entries(val)) out[k] = deepResolve(v);
  return out;
}

function clone(val) {
  return val === undefined ? val : JSON.parse(JSON.stringify(val));
}

/**
 * @param {object} seed - { orders: { [orderNumber]: {...fields} } }
 */
function createFakeFirestore(seed = {}) {
  const orders = new Map(Object.entries(seed.orders || {}).map(([k, v]) => [k, clone(v)]));
  // subcollections keyed "orderNumber/subName" -> Map(docId -> data)
  const subcollections = new Map();

  function applyPatchToOrder(orderNumber, patch) {
    const cur = orders.get(orderNumber) || {};
    const next = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      if (isSentinel(v) && v.__fv === 'arrayUnion') {
        const existing = Array.isArray(cur[k]) ? cur[k] : [];
        next[k] = [...existing, ...v.args.map(deepResolve)];
      } else {
        next[k] = deepResolve(v);
      }
    }
    orders.set(orderNumber, next);
  }

  function subMap(orderNumber, subName) {
    const key = `${orderNumber}/${subName}`;
    if (!subcollections.has(key)) subcollections.set(key, new Map());
    return subcollections.get(key);
  }

  function orderRef(orderNumber) {
    return {
      __kind: 'orderRef',
      __orderNumber: orderNumber,
      get: async () => {
        const data = orders.get(orderNumber);
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined), id: orderNumber, ref: orderRef(orderNumber) };
      },
      update: async (patch) => { applyPatchToOrder(orderNumber, patch); },
      collection: (subName) => subCollectionRef(orderNumber, subName),
    };
  }

  function subCollectionRef(orderNumber, subName) {
    return {
      doc: (id) => ({
        __kind: 'subDocRef',
        __orderNumber: orderNumber,
        __subName: subName,
        __id: String(id),
        get: async () => {
          const m = subMap(orderNumber, subName);
          const data = m.get(String(id));
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
      }),
    };
  }

  const db = {
    collection: (name) => {
      if (name !== 'orders') {
        // Not used by #99's handlers directly (customers/, referralCodes/, etc.
        // are touched by OTHER exports in index.js that we don't call in these
        // scenarios) — fail loudly rather than silently no-op if that changes.
        throw new Error(`fake-firestore: collection('${name}') is not implemented — only 'orders' is`);
      }
      return {
        doc: (id) => orderRef(id),
        where: (field, op, value) => {
          if (op !== '==') throw new Error(`fake-firestore: only '==' where() is implemented`);
          return {
            limit: (n) => ({
              get: async () => {
                const matches = [...orders.entries()].filter(([, data]) => data && data[field] === value).slice(0, n);
                return {
                  empty: matches.length === 0,
                  docs: matches.map(([id, data]) => ({ id, data: () => ({ ...data }), ref: orderRef(id) })),
                };
              },
            }),
          };
        },
      };
    },
    runTransaction: async (fn) => {
      // No real optimistic-lock semantics — the scenarios exercise the
      // application-level revision check (revisionMatches), not Firestore's
      // own contention handling. Calls run sequentially in test order, which
      // is enough to model "who got there first".
      const tx = {
        get: (ref) => ref.get(),
        update: (ref, patch) => applyPatchToOrder(ref.__orderNumber, patch),
        create: (ref, data) => {
          const m = subMap(ref.__orderNumber, ref.__subName);
          if (m.has(ref.__id)) {
            const err = new Error(`fake-firestore: document already exists at ${ref.__orderNumber}/${ref.__subName}/${ref.__id}`);
            err.code = 6; // ALREADY_EXISTS, mirrors the real SDK's tx.create() behaviour
            throw err;
          }
          m.set(ref.__id, deepResolve(data));
        },
      };
      return fn(tx);
    },
    // Test-only inspection helpers (not part of the real Firestore API).
    _dump: (orderNumber) => clone(orders.get(orderNumber)),
    _dumpSentVersions: (orderNumber) => {
      const m = subMap(orderNumber, 'sentVersions');
      return clone(Object.fromEntries(m.entries()));
    },
    _setOrder: (orderNumber, data) => orders.set(orderNumber, clone(data)),
  };

  return db;
}

function fakeAdminModule(seed) {
  const db = createFakeFirestore(seed);
  const firestoreFn = () => db;
  firestoreFn.FieldValue = {
    serverTimestamp: () => ({ __fv: 'serverTimestamp' }),
    arrayUnion: (...args) => ({ __fv: 'arrayUnion', args }),
  };
  firestoreFn.Timestamp = {
    now: () => ({ __fv: 'timestampNow' }),
  };
  return {
    __db: db, // exposed for test assertions/seeding beyond what admin normally offers
    initializeApp: () => {},
    firestore: firestoreFn,
    auth: () => ({
      // Every scenario authenticates staff via the legacy x-staff-key header
      // (isStaff's fallback), so a bearer token is never presented — this
      // always throws, which is exactly what a real invalid/absent token does.
      verifyIdToken: async () => { throw new Error('no token in fake admin'); },
    }),
  };
}

module.exports = { createFakeFirestore, fakeAdminModule, deepResolve };
