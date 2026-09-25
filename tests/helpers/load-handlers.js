// TO-DOS #99 — loads the REAL functions/index.js exports with firebase-admin
// and functions/email replaced by the in-memory fake, for use OUTSIDE jest
// (the QA Playwright script, qa/review-lock-browser.mjs). jest.doMock only
// works inside jest; plain Node gets the same effect by pre-seeding
// require.cache with the fake exports at the resolved path firebase-admin/
// functions/email would otherwise load from — Node's CommonJS loader checks
// the cache by resolved filename before ever reading a module's real source.
//
// Returns a FRESH set of handlers + db each call (via a child process's own
// require cache is NOT reused here — this only isolates within one process,
// so call it once per script run, not once per scenario, if you need
// independent state; the QA script uses one seed per script run).
const path = require('path');
const Module = require('module');
const { fakeAdminModule } = require('./fake-firestore');

function loadHandlers(seedOrders) {
  const admin = fakeAdminModule({ orders: seedOrders });

  const functionsDir = path.join(__dirname, '..', '..', 'functions');
  const adminPath = require.resolve('firebase-admin', { paths: [functionsDir] });
  require.cache[adminPath] = {
    id: adminPath, filename: adminPath, loaded: true, exports: admin,
  };

  const emailPath = require.resolve(path.join(functionsDir, 'email.js'));
  require.cache[emailPath] = {
    id: emailPath, filename: emailPath, loaded: true,
    exports: {
      createTransporter: () => ({ sendMail: () => Promise.resolve({}) }),
      FROM: { customer: { from: 'customer@aevia.at' }, orders: { from: 'orders@aevia.at' } },
      renderEmail: (html) => html,
      emailButton: () => '',
    },
  };

  // functions/index.js itself must be a fresh load too, or a previous call in
  // the same process would hand back handlers bound to a STALE admin/db.
  const indexPath = require.resolve(path.join(functionsDir, 'index.js'));
  delete require.cache[indexPath];
  const idx = require(indexPath);

  return { idx, db: admin.__db };
}

module.exports = { loadHandlers };
