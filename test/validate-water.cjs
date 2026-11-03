// Run from the test/ directory: node validate-water.cjs
// v1.97.96: cheap pond ripples and splashes. Runs the game's own water-fx code against stubs:
//  pools are fixed (20 rings, 32 droplets, reused - nothing allocated while you play), rings grow and fade out, droplets fall
//  back into the water; wading, standing, the berm, a vehicle in the water, dropping in off the bank, and a paintball plop.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const a = html.indexOf('// ---------- WATER RIPPLES'), b = html.indexOf('const TOXIC_T = 20;');
assert.ok(a > 0 && b > a, 'the water-fx section is in the game, right before the pond poison');
const src = html.slice(a, b);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(x => x.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const ctx2d = { createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}, fillStyle: '' };
const added = [];
const ctx = { T, Math, console, srgbTex: t => t, scene: { add: o => added.push(o) }, PONDS: { water: -0.35 }, inPond: (x, z) => Math.abs(x) < 50 && Math.abs(z) < 50,
  walk: { on: true, x: 0, z: 0, y: -1.5, drive: false, pass: false, dead: null }, NET: { rp: null, rr: null }, utv: { g: null },
  document: { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) } };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.WFX = WFX; this.wfxRing = wfxRing; this.wfxSplash = wfxSplash; this.wfxUpdate = wfxUpdate;', ctx);
const W = ctx.WFX, step = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) ctx.wfxUpdate(dt); };
const live = () => W.rings.filter(m => m && m.visible).length, drops = () => W.drops.filter(s => s && s.visible).length;

// pools
for (let i = 0; i < 50; i++) ctx.wfxRing(0, 0, 0.3, 2, 1, 0.5);
for (let i = 0; i < 80; i++) ctx.wfxSplash(0, 0, 1, 2, 1);
assert.equal(W.rings.length, 20, '20 ring quads, reused'); assert.equal(W.drops.length, 32, '32 droplet sprites, reused');
assert.equal(added.length, 52, 'nothing else ever added to the scene');
assert.ok(W.rings.every(m => m.userData.noHit) && W.drops.every(s => s.userData.noHit), 'shots and probes pass straight through them');
// a ring grows and fades, then hides
ctx.walk.on = false; W.rings.forEach(m => { m.visible = false; }); W.drops.forEach(s => { s.visible = false; });
ctx.wfxRing(0, 0, 0.3, 2, 1, 0.6); const R = W.rings.find(m => m.visible);
assert.ok(Math.abs(R.position.y - (-0.35 + 0.012)) < 1e-9, 'lies just on the pond surface');
step(30); assert.ok(R.scale.x > 1 && R.material.opacity < 0.6 && R.material.opacity > 0, 'half way: wider and fainter'); step(40); assert.equal(R.visible, false, 'gone after its life');
ctx.wfxSplash(0, 0, 6, 3, 1); assert.equal(drops(), 6, 'a splash throws droplets'); step(120); assert.equal(drops(), 0, 'and they all fall back into the water');
ctx.walk.on = true;

// wading
W.rings.forEach(m => { m.visible = false; });
for (let i = 0; i < 120; i++) { ctx.walk.z -= 0.05; ctx.wfxUpdate(1 / 60); }   // 3 m/s for 2 s
const wadeRings = W.ri; assert.ok(live() >= 2, 'wading leaves a trail of rings (' + live() + ' live)');
W.rings.forEach(m => { m.visible = false; }); W.wadeT = 0; step(180); assert.ok(live() >= 1 && live() <= 3, 'standing still: just a slow ring now and then');
ctx.walk.y = 0.5; W.rings.forEach(m => { m.visible = false; }); W.wadeT = 0; for (let i = 0; i < 120; i++) { ctx.walk.z -= 0.05; ctx.wfxUpdate(1 / 60); } assert.equal(live(), 0, 'up on the berm, out of the water: nothing');
ctx.walk.y = 0.6; ctx.wfxUpdate(1 / 60); ctx.walk.y = -1.5; const d0 = drops(); ctx.wfxUpdate(1 / 60); assert.ok(drops() >= d0 + 8, 'jumping in makes a splash');
// a vehicle in the water
step(200); ctx.walk.drive = true; ctx.utv.g = {}; Object.assign(ctx.utv, { x: 0, z: 0, y: -1.57, a: 0, vx: 0, vz: -12, air: false });
W.rings.forEach(m => { m.visible = false; }); step(30);
assert.ok(live() >= 4, 'driving through: rings off the wheels (' + live() + ')'); assert.ok(drops() > 0, 'and spray at speed');
step(200); ctx.utv.air = true; ctx.utv.y = 0.5; ctx.wfxUpdate(1 / 60); ctx.utv.y = -1.57; ctx.utv.air = false; const d1 = drops(); ctx.wfxUpdate(1 / 60);
assert.ok(drops() >= Math.min(32, d1 + 18) - 2, 'dropping in off the bank: a big splash');
ctx.utv.x = 200; W.rings.forEach(m => { m.visible = false; }); step(60); assert.equal(live(), 0, 'out of the pond: no rings');

// wiring
assert.ok(html.includes('    wfxUpdate(dt);   // pond ripples and splashes\n'), 'runs every frame with the pond poison check');
{ const s = html.indexOf('function splatAt(hit, c, dir) {'), body = html.slice(s, s + 600);
  assert.ok(body.indexOf('inPond(q.x, q.z)) { wfxRing(') > 0 && body.indexOf('inPond(q.x, q.z)) { wfxRing(') < body.indexOf('if (!splatGeos)'), 'a paintball into the pond plops instead of leaving a floating splat'); }
assert.ok(src.includes('srgbTex(new T.CanvasTexture(ring))') && src.includes('srgbTex(new T.CanvasTexture(dot))'), 'both canvas textures are tagged (ground-layers rule)');
console.log('validate-water: OK');
