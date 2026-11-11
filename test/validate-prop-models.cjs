// Run from the test/ directory: node validate-prop-models.cjs
// Guards TEST v1.97.74 (owner: "why are those even still in the code" ... "Yes"): the 3D crowbar (hvarley, CC BY 4.0) and the PSX
// fire extinguisher (zynxeror, CC BY 4.0) are the game's own now. The TEST launcher used to carry a second GLB reader and patch both
// in at load by string match over the old code-drawn crowbar and extinguisher pictures, so game.html on its own still showed those.
// Runs the game's own reader and the new propGlb / crowbarModel / extModelInto on the real files.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), launcher = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE, T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
// ---- the launcher no longer patches them in, and keeps no reader of its own
for (const w of ['crowbarEngine', 'crowbarReadGLB', 'crowbarAccessor', 'crowbarSlot', 'CROWBAR_', 'extModelInsert', 'EXT_GLB', 'extStationOld', 'extHudOld'])
  assert.ok(!launcher.includes(w), 'launcher: ' + w + ' is gone');
assert.ok(launcher.includes('return propGlb(source).then(raw=>{'), 'the launcher\'s corn props read their models through the game\'s propGlb()');
// ---- the old code-drawn pictures are gone; every place uses the models
assert.ok(!html.includes("if (k === 'crowbar') {   // classic red gooseneck"), 'the code-drawn crowbar picture is gone');
assert.ok(html.includes("  if (k === 'shovel') {   // round-point shovel"), 'the other code-drawn tools stay (shovel, pitchfork)');
assert.ok(html.includes("m = k === 'crowbar' ? crowbarModel(new T.Group(), L, 'wall') : new T.Mesh("), 'pegboard: the crowbar model');
assert.ok(html.includes("m = k === 'crowbar' ? crowbarModel(new T.Group(), L, 'third') : new T.Mesh("), 'third person: the crowbar model');
assert.ok(html.includes("if (k === 'crowbar') { q = crowbarModel(new T.Group(), L, 'hud'); q.position.set(0.14, -0.13, -0.67); g.add(q); }"), 'first person: the crowbar model where the launcher put it');
assert.ok(html.includes("fallback.userData.noHit = true; m.add(fallback); extModelInto(m, 0.62, false);   // the PSX model, the picture until it has loaded"), 'the posts: the PSX extinguisher');
assert.ok(html.includes("  extModelInto(m, 0.62, false);\n  EXT.stations.push(m);"), 'the wall mounts: the PSX extinguisher, no longer behind a typeof guard');
assert.ok(html.includes("  extModelInto(q, 0.38, true);"), 'in your hand: the PSX extinguisher');
assert.ok(!html.includes('depthTest: false, side: T.DoubleSide }), 0.22, -0.19, -0.55)'), 'the held picture is not drawn over everything any more');
// ---- run them on the real files
const ctx = { T, console, TextDecoder, performance: { now: () => 0 }, PERF: { glb: {} },
  Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } };
ctx.loadGlbModel = (url, cb) => { const b = fs.readFileSync(path.join('..', url.replace('/corn-souls/', ''))); cb(ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length))); };
vm.createContext(ctx);
vm.runInContext([cut('const GLB_CT = {', 'function loadGlbModel('), cut('// ---------- THE CROWBAR AND THE EXTINGUISHER AS MODELS', 'function toolModelOn(')].join('\n') +
  '\nthis.glbBuild = glbBuild; this.propGlb = propGlb; this.crowbarModel = crowbarModel; this.extModelInto = extModelInto; this.PROP_GLB = PROP_GLB;', ctx);
(async () => {
  const size = o => { o.updateMatrixWorld(true); const b = new T.Box3().setFromObject(o); return { s: b.getSize(new T.Vector3()), c: b.getCenter(new T.Vector3()) }; };
  for (const f of ['horror_game_crowbar', 'psx_fire_extinguisher', 'corn_cube', 'corn_low_poly']) {
    const m = await ctx.propGlb('/corn-souls/assets/models/' + f + '.glb'), { s, c } = size(m);
    assert.ok(Math.abs(s.x - 0.94) < 1e-3 && s.x >= s.y - 1e-6 && s.x >= s.z - 1e-6, f + ': longest side along x, 0.94 long (' + s.toArray().map(v => v.toFixed(3)) + ')');
    assert.ok(c.length() < 1e-3, f + ': centred');
  }
  const a = await ctx.propGlb('/corn-souls/assets/models/horror_game_crowbar.glb'), b2 = await ctx.propGlb('/corn-souls/assets/models/horror_game_crowbar.glb');
  assert.notEqual(a, b2, 'each call gets its own copy'); assert.equal(Object.keys(ctx.PROP_GLB).length, 4, 'each file read once');
  // the crowbar: same sizes and turns the launcher used
  const L = 0.95 * 0.62, hud = ctx.crowbarModel(new T.Group(), L, 'hud'), wall = ctx.crowbarModel(new T.Group(), 0.95, 'wall'), third = ctx.crowbarModel(new T.Group(), 0.95, 'third');
  await new Promise(r => setTimeout(r, 0));
  assert.ok(Math.abs(size(hud).s.x - L * 0.88) < 0.01, 'first person: 0.88 of the tool length');
  assert.ok(Math.abs(hud.children[0].rotation.x - Math.PI) < 1e-9, 'hook rolled away from you');
  let ro = true; hud.traverse(o => { if (o.isMesh && o.renderOrder !== 35) ro = false; }); assert.ok(ro, 'drawn in the HUD order the launcher gave it');
  assert.ok(Math.abs(wall.children[0].rotation.x - Math.PI / 2) < 1e-9 && wall.children[0].position.z === 0.29, 'pegboard: flat to the board, claw clear of it');
  assert.ok(Math.abs(size(third).s.x - 0.95 * 0.74) < 0.01, 'third person: 0.74 of the length');
  let hit = true; for (const g of [hud, wall, third]) g.traverse(o => { if (!o.userData.noHit) hit = false; }); assert.ok(hit, 'never in the way of a shot or a click');
  // the extinguisher: upright, its height, and the stand-in picture goes
  const m = new T.Group(), pic = new T.Mesh(new T.PlaneGeometry(0.3, 0.6), new T.MeshLambertMaterial()); m.add(pic);
  let freed = 0; pic.geometry.addEventListener('dispose', () => freed++); pic.material.addEventListener('dispose', () => freed++);
  ctx.extModelInto(m, 0.62, false); await new Promise(r => setTimeout(r, 0));
  assert.equal(m.children.length, 1); assert.notEqual(m.children[0], pic, 'the picture is replaced by the model'); assert.equal(freed, 2, 'and freed');
  const e = size(m); assert.ok(Math.abs(e.s.y - 0.62) < 0.005 && e.s.y > e.s.x && e.s.y > e.s.z, 'standing up, 0.62 tall (' + e.s.toArray().map(v => v.toFixed(3)) + ')');
  console.log('PASS: crowbar and PSX extinguisher models are the game\'s own (no launcher patch or second reader; pegboard, hand, first person and every extinguisher; same sizes as before)');
})().catch(e => { console.error(e); process.exit(1); });
