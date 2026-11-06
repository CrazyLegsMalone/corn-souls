// Run from the test/ directory: node validate-performance.cjs
// Guards the performance plumbing: the fps readout has to count every render pass, the shadow map is only redrawn
// when it has something new to say, and the quality tier decides antialias / pixel ratio / shadow size per device.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');

// ---------------------------------------------------------------- the tier table is plain data, so run it on its own
const tierSrc = html.slice(html.indexOf('const TIERS = {'), html.indexOf('const TIER = perfTier();'));
assert.ok(tierSrc.includes('function perfTier(env)'), 'the tier picker came out of the game source');
const pick = env => {
  const ctx = { navigator: env.nav || {}, window: env.win || {}, console };
  if (env.storage) ctx.localStorage = env.storage;
  vm.createContext(ctx);
  vm.runInContext(tierSrc + '\nthis.tier = perfTier();', ctx);
  return ctx.tier;
};
const phone = pick({ nav: { maxTouchPoints: 5, deviceMemory: 4, hardwareConcurrency: 8 }, win: { innerWidth: 390 } });
assert.equal(phone.name, 'low', 'a phone with 4 GB picks the low tier');
assert.equal(phone.aa, false, 'and never asks for MSAA');
assert.equal(phone.px, 0.75, 'and renders the 3D canvas below CSS resolution');
assert.equal(phone.shadow, 0, 'and skips dynamic sun shadows');
assert.equal(phone.fps, 60, 'and a 60 fps cap');
const desktop = pick({ nav: { maxTouchPoints: 0, deviceMemory: 8, hardwareConcurrency: 16 }, win: { innerWidth: 1920 } });
assert.equal(desktop.name, 'high', 'a desktop picks the high tier');
assert.equal(desktop.aa, true, 'with MSAA');
assert.equal(desktop.px, 1.5, 'and the old 1.5 pixel-ratio cap');
assert.equal(desktop.shadow, 2048, 'and the old 2048 shadow map');
assert.equal(desktop.shadowType, 'PCFShadowMap', 'and the soft filter');
assert.equal(desktop.shadowEvery, 1, 'and a shadow refresh every frame');
assert.equal(desktop.fps, 144, 'and the old 144 cap');
const tablet = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 1024 } });
assert.equal(tablet.name, 'medium', 'a big touch device with enough memory is not pushed to the floor');
assert.equal(tablet.shadowEvery, 1, 'medium redraws the shadow map every frame too (v1.97.92: alternate heavy/light frames were judder)');
for (const [t, R, st, mc] of [[tablet, 65, 3, 0.35], [desktop, 85, 2, 0]]) {   // the pass is made cheaper instead of rarer
  assert.equal(t.shadowEvery, 1, t.name + ' redraws its shadows every frame (steady cost)');
  assert.equal(t.shadowR, R, t.name + ' shadow box half-size ' + R + ' m');
  assert.equal(t.shadowStep, st, t.name + ' moves the shadow box in ' + st + ' m steps');
  assert.equal(t.minCaster, mc, t.name + ' smallest shadow caster ' + mc + ' m');
}
const smallPhone = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 380 } });
assert.equal(smallPhone.name, 'low', 'a small screen wins over a generous memory figure');
const landscapePhone = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 1000, innerHeight: 420 } });
assert.equal(landscapePhone.name, 'low', 'a wide landscape phone still uses the phone budget');
const overriddenPhone = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 1000, innerHeight: 420 }, storage: { getItem: () => 'medium' } });
assert.equal(overriddenPhone.name, 'medium', 'an explicit quality setting still takes priority on a phone');
const override = pick({ nav: { maxTouchPoints: 0, deviceMemory: 8, hardwareConcurrency: 16 }, win: { innerWidth: 1920 }, storage: { getItem: k => k === 'cs_perf' ? 'low' : null } });
assert.equal(override.name, 'low', 'the manual override beats the heuristic');
const bogus = pick({ nav: { maxTouchPoints: 0, deviceMemory: 8, hardwareConcurrency: 16 }, win: { innerWidth: 1920 }, storage: { getItem: () => 'ultra' } });
assert.equal(bogus.name, 'high', 'an unknown override is ignored, not obeyed');
const throwing = pick({ nav: { maxTouchPoints: 0, deviceMemory: 8, hardwareConcurrency: 16 }, win: { innerWidth: 1920 }, storage: { getItem() { throw new Error('blocked'); } } });
assert.equal(throwing.name, 'high', 'a blocked localStorage does not break startup');
assert.notEqual(phone, desktop, 'each call returns its own copy, so one caller cannot poison the table');


// ---------------------------------------------------------------- the shadow map is redrawn only when it must be
const shStart = html.indexOf('function shadowRefresh() {');
const shSrc = html.slice(shStart, html.indexOf('\n}', shStart) + 2);
assert.ok(shSrc.includes('renderer.shadowMap.needsUpdate = true;'), 'shadowRefresh is what asks for a shadow pass');
const frames = (moved, every, n) => {
  const ctx = { SH: { moved, warm: 0, tick: 0 }, TIER: { shadowEvery: every }, renderer: { shadowMap: { needsUpdate: false } } };
  vm.createContext(ctx);
  vm.runInContext(shSrc + '\nthis.out = []; for (let i = 0; i < ' + n + '; i++) { renderer.shadowMap.needsUpdate = false; shadowRefresh(); this.out.push(renderer.shadowMap.needsUpdate ? 1 : 0); }', ctx);
  return ctx.out;
};
assert.equal(frames(false, 1, 4).join(''), '1111', 'the high tier still draws the shadow map every frame');
assert.equal(frames(false, 2, 14).slice(0, 10).join(''), '1111111111', 'the first ten frames always draw, whatever the tier (the world is still settling)');
assert.equal(frames(false, 2, 14).slice(10).join(''), '0101', 'after that a still sun is drawn every second frame only');
{   // a sun that steps a texel draws on that very frame, even when the tier's rate says otherwise
  const ctx = { SH: { moved: false, warm: 10, tick: 0 }, TIER: { shadowEvery: 7 }, renderer: { shadowMap: { needsUpdate: false } } };
  vm.createContext(ctx);
  vm.runInContext(shSrc + '\nthis.out = []; for (let i = 0; i < 3; i++) { if (i === 1) SH.moved = true; renderer.shadowMap.needsUpdate = false; shadowRefresh(); this.out.push(renderer.shadowMap.needsUpdate ? 1 : 0); }', ctx);
  assert.equal(ctx.out.join(''), '010', 'a sun that stepped a whole texel draws on that very frame, even off-beat');
}
{   // and the request is consumed: the next off-beat frame must not draw again
  const ctx = { SH: { moved: true, warm: 10, tick: 0 }, TIER: { shadowEvery: 3 }, renderer: { shadowMap: { needsUpdate: false } } };
  vm.createContext(ctx);
  vm.runInContext(shSrc + '\nshadowRefresh(); this.a = renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate = false; shadowRefresh(); this.b = renderer.shadowMap.needsUpdate;', ctx);
  assert.equal(ctx.a, true, 'a moved sun asks for a pass');
  assert.equal(ctx.b, false, 'and only one: the flag is cleared, so the map is not redrawn twice for the same picture');
}

// ---------------------------------------------------------------- the source keeps the wiring this depends on
assert.ok(html.includes('renderer.shadowMap.autoUpdate = false;'), 'lazy shadows: the renderer no longer redraws the shadow map on its own');
assert.ok(html.includes('renderer.info.autoReset = false;'), 'the renderer counters are reset by us, once per frame');
assert.ok(html.includes('if (renderer.shadowMap.enabled) { shadowFollow(); shadowRefresh(); }') &&
  html.indexOf('renderer.info.reset();') < html.indexOf('renderer.render(scene, camera);', html.indexOf('shadowFollow(); shadowRefresh()')),
  'and the reset comes before the world render, so the shadow pass and the world are both counted');
assert.ok(html.includes('PERF.dc = renderer.info.render.calls; PERF.tri = renderer.info.render.triangles;'),
  'the counters are captured before the HUD pass overwrites the picture of the frame');
assert.ok(html.includes('renderer.setPixelRatio(Math.min(TIER.px, window.devicePixelRatio || 1));'), 'the pixel ratio comes from the tier (and never exceeds the display)');
assert.ok(html.includes('renderer.shadowMap.type = T[TIER.shadowType] || T.PCFShadowMap;'), 'and so does the shadow filter');
assert.ok(html.includes('renderer.shadowMap.enabled = TIER.shadow > 0;') &&
  html.includes('sun.castShadow = renderer.shadowMap.enabled;') &&
  html.includes('if (sun.castShadow) sun.shadow.mapSize.set(TIER.shadow, TIER.shadow);'),
  'Low neither renders nor allocates a sun shadow map');
assert.ok(html.includes("const pref = TIER.name === 'high' ? { antialias: TIER.aa, powerPreference: 'high-performance' } : { antialias: TIER.aa };"),
  'the context is asked for exactly what the tier wants (and nothing else)');
assert.ok(!html.includes('[{ antialias: true }'), 'no unconditional MSAA request is left anywhere');
assert.ok(html.includes('renderer.compile(scene, camera)'), 'shaders are compiled once at build time, not in the middle of a frame');
assert.ok(html.indexOf('renderer.compile(scene, camera)') > html.indexOf('buildBillboards(); mergeStatic();'),
  'and that happens after the world is merged, so the merged materials are the ones compiled');
assert.ok(html.includes('{ let n = 0; scene.traverse(o => { if (o.isMesh && o.castShadow) n++; }); PERF.casters = n; }'),
  'the shadow-caster count is recorded once, after the merge');
assert.ok(html.includes('const MODEL_PBR = TIER.pbr;'), 'imported models follow the tier too');
assert.ok(html.includes("const pbr = typeof MODEL_PBR !== 'undefined' ? MODEL_PBR : false;") &&
  html.includes('new T.MeshLambertMaterial({ color: c, side: T.DoubleSide })'),
  'and are drawn as Lambert (cheap, and a PBR metal with no environment map is near-black)');
assert.ok(html.includes('get perf() { return PERF; }, get tier() { return TIER; },'), 'the frame budget and the tier are on the Plant3D bridge');
assert.ok(html.includes('P3.perf.frame = performance.now() - now;'), 'the frame loop fills the frame time in (cross-script-block, so via the bridge)');
assert.ok(html.includes('(window.Plant3D && window.Plant3D.tier && window.Plant3D.tier.fps) || 144'), 'the frame cap follows the tier');
assert.ok(html.includes("+ 'k tri  ' + (pf.frame || 0).toFixed(1) + ' ms'"), 'and the fps readout shows the real numbers');


// ---------------------------------------------------------------- one broken update must not freeze the frame
assert.ok(html.includes('function stepSafe(name, fn) {') && html.includes("console.error('[update:' + name + '] failed '"),
  'the frame tail runs through a guard that reports the failure instead of dying silently');
for (const g of ["stepSafe('balls', () => updateBalls(dt));", "stepSafe('gun', () => updateGun(dt));",
                 "stepSafe('birds', () => updateBirds(dt));", "stepSafe('powerApply', () => applyPowerOutage());"]) {
  assert.ok(html.includes(g), 'guarded every frame: ' + g);
}
assert.ok(html.includes('if (!B || !B.m || !B.v) { balls.splice(i, 1); continue; }'),
  'a stray entry in the ball list is dropped instead of throwing on every frame');
assert.ok(html.includes('drawHud: () => drawHudGun(),'), 'the first-person pass is on the Plant3D bridge');
assert.ok(html.includes('try { P3.drawHud(); } catch (e2) {}'),
  'and the frame loop draws it even when the world update threw, so the gun cannot vanish with it');
assert.ok(html.includes('get viewmodel() {') && html.includes("gun: !!(g && g.visible)"),
  'the viewmodel state is readable, so the fps line can say when the gun should be up but is not');
assert.ok(html.includes("(badGun ? ' · noGun' : '')"), 'and the fps line does say it');
assert.ok(html.includes('PAUSED'), 'a modal quietly swallowing the clock is visible on the fps line too');
{   // the guard really does keep going after a throw, and counts it / names it
  const NL = String.fromCharCode(10);
  const i = html.indexOf('function stepSafe(name, fn) {');
  const src = html.slice(i, html.indexOf(NL + '}', i) + 2);
  const ctx = { console: { error() {} }, PERF: { errs: 0, err: '', msg: '' }, FAILS: {}, calls: [] };
  vm.createContext(ctx);
  vm.runInContext(src + NL + "stepSafe('bad', () => { throw new Error('boom'); }); stepSafe('good', () => this.calls.push(1));", ctx);
  assert.equal(ctx.calls.length, 1, 'a throwing update does not stop the ones after it');
  assert.equal(ctx.PERF.errs, 1, 'and the failure is counted');
  assert.equal(ctx.PERF.err, 'bad', 'and named');
  assert.equal(ctx.PERF.msg, 'boom', 'and its message kept');
}


{   // one label per guarded sub-update: with two sharing a name the fps badge cannot say which one is failing
  const labels = [...html.matchAll(/stepSafe\('([a-zA-Z]+)'/g)].map(m => m[1]);
  assert.ok(labels.length > 20, 'the frame tail is guarded (' + labels.length + ' labels)');
  const dup = [...new Set(labels.filter((l, i) => labels.indexOf(l) !== i))];
  assert.equal(dup.length, 0, 'duplicate stepSafe label(s): ' + dup.join(', '));
  assert.ok(labels.includes('powerSim') && labels.includes('powerApply'), 'the power sub-update and the outage pass have their own labels');
}

console.log('PASS: quality tier (low/medium/high + manual override), lazy shadow map at the tier rate, one info reset per frame so the fps readout counts the shadow and world passes, warm shader compile, Lambert imports');

