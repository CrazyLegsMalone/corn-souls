// Run from the test/ directory: node validate-corn-brush.cjs
// v1.97.165, owner: "When running through the corn there should be an effect especially in first person". Runs the game's own
// cornField / cornBrushUpdate with three.js and stubs: stalks near you lean away and spring back to exactly how they stood, only the
// bent clumps' slots are re-sent, mown ones stay mown, the other player and a vehicle push through too; in first person on foot,
// leaves sweep past and the rows close in round the view, only while you are moving in the corn; a rustle follows your speed.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const src = cut('CORN.fields = [];\nfunction cornField(mesh) {', 'function mowBlocked(x, z) {');

// a little field: a row of clumps along x at z = 0, one every 1 m from x = 0 to 9
const geo = new T.BoxGeometry(0.2, 2.4, 0.2).translate(0, 1.2, 0), mesh = new T.InstancedMesh(geo, new T.MeshBasicMaterial(), 10), d0 = new T.Object3D();
for (let i = 0; i < 10; i++) { d0.position.set(i, 0.15, 0); d0.rotation.set(0, 0.3 * i, 0); d0.scale.set(1, 1.1, 1); d0.updateMatrix(); mesh.setMatrixAt(i, d0.matrix); }
const base = Array.from({ length: 10 }, (_, i) => { const m = new T.Matrix4(); mesh.getMatrixAt(i, m); return m.elements.slice(); });
const puffs = [], sounds = [], vig = { style: { opacity: '' } }, camera = new T.Group();
const walk = { on: true, dead: null, drive: false, mow: false, ride: null, x: -20, z: 0.4, y: 0 }, utv = { g: null, x: 0, z: 0 };
const ctx = { T, Math, CORN: {}, camera, walk, utv, NET: { conn: null, rp: null }, VIEW: { third: false }, SKY: { k: 1 }, tsnd: { ctx: null }, V3: (x, y, z) => new T.Vector3(x, y, z),
  puff: (p) => puffs.push(p), gunClick() {}, noiseBuf() {}, document: { getElementById: id => id === 'cornVig' ? vig : null, createElement: () => ({ getContext: () => null }) } };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.cornField = cornField; this.cornBrushUpdate = cornBrushUpdate; this.cornCut = cornCut; this.CBRUSH = CBRUSH; this.cornRustle = cornRustle;', ctx);
ctx.cornRustle = v => sounds.push(v);   // (heard, not played: no audio here)
vm.runInContext('cornRustle = this.cornRustle;', ctx);
ctx.cornField(mesh); const B = ctx.CBRUSH, F = ctx.CORN.fields[0];
const step = (sec, f, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) { if (f) f(dt); mesh.instanceMatrix.clearUpdateRanges(); ctx.cornBrushUpdate(dt); } };
const top = i => { const m = new T.Matrix4(); mesh.getMatrixAt(i, m); return new T.Vector3(0, 2.4, 0).applyMatrix4(m); }, same = i => { const m = new T.Matrix4(); mesh.getMatrixAt(i, m); return m.elements.every((v, k) => Math.abs(v - base[i][k]) < 1e-6); };

// out of the corn: nothing happens
step(0.5); assert.equal(B.bent.size, 0); assert.ok(+vig.style.opacity === 0 || vig.style.opacity === '', 'no closing-in out of the field');
// walk along the row, 0.4 m off it (z = 0.4), at 5 m/s
walk.x = 2; walk.z = 0.4; step(0.05);
let maxBent = 0, ranges = 0, leafSeen = false, vigMax = 0;
step(0.6, dt => { walk.x += 5 * dt; maxBent = Math.max(maxBent, [...B.bent.values()].filter(e => e.tgt > 0).length); ranges = Math.max(ranges, mesh.instanceMatrix.updateRanges.length);
  leafSeen = leafSeen || B.leaves.some(l => l.m.visible); vigMax = Math.max(vigMax, +vig.style.opacity || 0); });
assert.ok(maxBent >= 2 && maxBent <= 3, 'only the clumps right round you are pushed over (' + maxBent + '; the ones behind you swing back)');
{ const i = Math.round(walk.x); const t = top(i), e = B.bent.get(i); assert.ok(e && e.lean > 0.1, 'the clump beside you is leaning'); assert.ok(t.z < -0.3, 'away from you (you are at +z, its top went to ' + t.z.toFixed(2) + ')'); }
{ const wx = walk.x; step(2, dt => { walk.x = wx; }); mesh.instanceMatrix.clearUpdateRanges(); ctx.cornBrushUpdate(1 / 60); const R = mesh.instanceMatrix.updateRanges;
  assert.ok(R.length === B.bent.size && R.length < mesh.count && R.every(r => r.count === 16 && r.start % 16 === 0), 'only the bent clumps\' slots are re-sent (' + R.length + ' of ' + mesh.count + ')'); }
assert.ok(leafSeen, 'first person, moving in the corn: leaves sweep past'); assert.ok(vigMax > 0.4, 'and the rows close in round the view (' + vigMax + ')');
assert.ok(sounds.length >= 2 && sounds.every(v => v > 0 && v <= 0.22), 'a rustle as you go');
// stop, then step out: everything springs back to exactly how it stood
walk.x = 30; step(4); assert.equal(B.bent.size, 0, 'all upright again once you are past');
for (let i = 0; i < 10; i++) assert.ok(same(i), 'clump ' + i + ' exactly as it stood');
step(1); assert.ok(+vig.style.opacity < 0.05 && B.leaves.every(l => !l.m.visible), 'out of the corn: the view clears');
// standing still in the corn: it closes in, but no leaves or rustle
walk.x = 5; walk.z = 0.4; step(0.3); sounds.length = 0; const leavesBefore = B.leaves.filter(l => l.t < l.life).length; step(1);
assert.equal(sounds.length, 0, 'still: no rustle'); assert.ok(B.leaves.filter(l => l.t < l.life).length <= leavesBefore, 'still: no new leaves'); assert.ok(+vig.style.opacity > 0.4, 'but you are among the rows');
// third person: the stalks still bend, no leaves on the camera, no closing-in
ctx.VIEW.third = true; walk.x = 2; step(0.05); let leaf3 = false; step(0.6, dt => { walk.x += 5 * dt; leaf3 = leaf3 || B.leaves.some(l => l.m.visible); });
assert.ok(B.bent.size >= 1, 'third person: the corn still bends round you'); assert.ok(!leaf3 && +vig.style.opacity < 0.05, 'but no leaves or closing-in on the camera'); ctx.VIEW.third = false;
walk.x = 30; step(4);
// a clump mown while it leans stays mown
walk.x = 4; walk.z = 0.4; step(0.3); assert.ok(B.bent.has(4)); ctx.cornCut(4, 0, 0.3); step(4, null); assert.ok(!B.bent.has(4)); { const m = new T.Matrix4(); mesh.getMatrixAt(4, m); const s = new T.Vector3(); m.decompose(new T.Vector3(), new T.Quaternion(), s); assert.ok(s.y < 0.2, 'a clump mown while it leaned stays mown (not stood back up)'); }
walk.x = 30; step(4);
// the other player and a vehicle push through too (your screen)
ctx.NET.conn = { open: true }; ctx.NET.rp = { walk: true, drive: false, x: 7, z: 0.3 }; walk.x = 50; step(0.3); assert.ok(B.bent.has(7), 'the other player bends the corn on your screen'); ctx.NET.rp = null; step(4);
walk.drive = true; utv.g = {}; utv.x = 8; utv.z = 1.5; step(0.3); assert.ok(B.bent.has(8), 'so does a vehicle (wider)'); assert.ok(!B.leaves.some(l => l.m.visible), 'no leaves in your face while driving'); walk.drive = false; utv.g = null; step(4);
// wiring
assert.ok(html.includes("stepSafe('cornBrush', () => cornBrushUpdate(dt));"), 'runs every frame under its own guard');
assert.ok(html.includes('<div id="cornVig" aria-hidden="true"></div>') && /#cornVig\{position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;background:radial-gradient/.test(html), 'the closing-in overlay, under the HUD');
assert.ok(html.includes("CORN.leafMat = new T.MeshBasicMaterial({ map, color: 0xffffff, alphaTest: 0.4, side: T.DoubleSide, depthTest: false, depthWrite: false, fog: false });"), 'leaves drawn over the world, under the held item');
console.log('PASS: corn brush (stalks round you lean away and spring back exactly, only their slots re-sent; leaves past your face and the rows closing in - first person, moving, in the corn; rustle with speed; third person, the other player and vehicles bend it too; mown stays mown)');
