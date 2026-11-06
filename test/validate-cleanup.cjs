// Run from the test/ directory: node validate-cleanup.cjs
// Guards Batch 5 (TEST v1.97.198): the TEST service worker serves its cached shell offline, the dead-critter corn carry
// and other dead launcher code are gone, the orphaned squeeg-model.js is deleted, and the anchor checker covers the
// launcher's patch tables. The service worker runs for real in a sandbox.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const launcher = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('sw.js', 'utf8');

// ---------------------------------------------------------------- the TEST service worker, offline
async function fetchWith({ online, cached, mode, url }) {
  const handlers = {}, store = new Map(cached || []);
  const ctx = {
    self: { location: { origin: 'https://x.github.io', href: 'https://x.github.io/corn-souls/test/sw.js' }, addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: {
      open: async () => ({ put: async (k, r) => store.set(k, r) }), keys: async () => [], delete: async () => true,
      match: async (k) => { const key = typeof k === 'string' ? (k.startsWith('./') ? '/corn-souls/test/' + k.slice(2) : k) : new URL(k.url).pathname; return store.get(key); },
    },
    fetch: async () => { if (!online) throw new TypeError('offline'); return { ok: true, clone() { return this; }, body: 'network' }; },
    Response: class { constructor(body, init) { this.body = body; this.status = (init && init.status) || 200; } },
    URL, Date, Promise, console,
  };
  ctx.addEventListener = ctx.self.addEventListener;
  vm.createContext(ctx); vm.runInContext(worker, ctx);
  let out; const req = { method: 'GET', mode, url: 'https://x.github.io' + url };
  handlers.fetch({ request: req, respondWith: p => { out = p; } });
  return out ? await out : 'not handled';
}
(async () => {
  const shell = { body: 'cached shell' }, game = { body: 'cached game' };
  let r = await fetchWith({ online: false, cached: [['/corn-souls/test/', shell]], mode: 'navigate', url: '/corn-souls/test/' });
  assert.equal(r, shell, 'offline, opening TEST shows the cached shell (it used to show the "needs a connection" page first)');
  r = await fetchWith({ online: false, cached: [['/corn-souls/test/index.html', shell]], mode: 'navigate', url: '/corn-souls/test/?from=homescreen' });
  assert.equal(r, shell, 'a page that was never cached under its own path falls back to the precached index.html');
  r = await fetchWith({ online: false, cached: [['/corn-souls/test/game.html', game]], mode: 'no-cors', url: '/corn-souls/test/game.html?test_version=1' });
  assert.equal(r, game, 'other files still come from the cache offline');
  r = await fetchWith({ online: false, cached: [], mode: 'navigate', url: '/corn-souls/test/' });
  assert.equal(r.status, 503, 'with nothing cached at all, the "needs a connection" page is the last resort');
  r = await fetchWith({ online: true, cached: [['/corn-souls/test/', shell]], mode: 'navigate', url: '/corn-souls/test/' });
  assert.equal(r.body, 'network', 'online it is still network-first, so a new build is never hidden behind the cache');
  r = await fetchWith({ online: false, cached: [['/corn-souls/', shell]], mode: 'navigate', url: '/corn-souls/' });
  assert.equal(r, 'not handled', 'and it never answers for the LIVE app');
  assert.ok(worker.includes("const APP_PATH = '/corn-souls/test/';") && /const CACHE = 'corn-souls-test-shell-v\d+';/.test(worker), 'scope and cache name are unchanged');

  // ---------------------------------------------------------------- dead code that is gone
  assert.ok(!fs.existsSync(path.join(__dirname, 'squeeg-model.js')), 'the orphaned squeeg-model.js is deleted (nothing loads it)');
  for (const f of ['cornSyncDeadCritters', 'cornCritterWrap', 'cornCritterDead', 'isCritter:true', "'Picked up '+best.label"]) assert.ok(!launcher.includes(f), 'no dead-critter corn carry: ' + f);
  assert.ok(launcher.includes("if(t.held||t.net==='them'||t.isCritter||"), 'the carry still skips critters (validate-traffic and validate-critter-eat check this)');
  const helps = launcher.slice(launcher.indexOf('const pauseHelpPatterns=['), launcher.indexOf('];', launcher.indexOf('const pauseHelpPatterns=[')));
  assert.equal((helps.match(/"\['/g) || []).length, 1, 'one Help form to look for, the one the game has');
  assert.ok(helps.includes(`"['Help', help]"`) && fs.readFileSync('game.html', 'utf8').includes("['Help', help]"), 'and the game still has it, so the pause menu still gets its Controls entry');

  // ---------------------------------------------------------------- the anchor checker covers the patch tables
  const checker = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'check_launcher_anchors.py'), 'utf8');
  assert.ok(checker.includes('def table_anchors(loader):') && checker.includes('failures += table_bad'), 'check_launcher_anchors.py checks every [from, to] patch table too');
  console.log('PASS: cleanup (v1.97.198: TEST service worker serves the cached shell offline and is still network-first and TEST-only; squeeg-model.js and the dead-critter corn carry removed; one Help pattern; the anchor checker covers the patch tables)');
})().catch(e => { console.error(e); process.exitCode = 1; });
