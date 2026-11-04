// Run from the test/ directory: node validate-corn-creatures.cjs
// v1.97.108: the north corn field's creatures and the new ferm / beer well pumps. Runs the game's own code with three.js
// against small synthetic models (a body and six Leg_Hip_* legs) and stubs: two cob stalkers roam the field, shadow you
// along the edge when you step out, hunt and bite when you are in it (third bite kills), never leave the field except
// for a corn ear lying on the ground (they eat it, it turns up back in its can, they walk back in), take paintball and
// tool damage, and when both are dead Daddy Cob Legs climbs out; after Daddy the field goes quiet, then two new stalkers.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf("// ---------- THE NORTH CORN FIELD'S CREATURES (v1.97.108)"), b = html.indexOf('\n// pigeon coo, synthesized like the train', a);
assert.ok(a > 0 && b > a, 'the creature section sits with the critters (after their hit code)');
// a synthetic creature: a body plus six legs, two materials, an eye material (bright red)
const mkModel = bodyName => {
  const root = new T.Group(), byName = {}, mA = new T.MeshLambertMaterial({ color: 0xc9a032 }), mL = new T.MeshLambertMaterial({ color: 0x4f6b2a }), eye = new T.MeshLambertMaterial({ color: new T.Color(0.79, 0.02, 0.02) });
  const body = new T.Mesh(new T.BoxGeometry(1.8, 2.4, 1.8), mA); body.name = bodyName; body.position.y = 2.6; root.add(body); byName[bodyName] = body;
  const e = new T.Mesh(new T.SphereGeometry(0.15), eye); e.position.set(0.3, 3, -0.9); root.add(e);
  for (let i = 0; i < 6; i++) { const h = new T.Group(); h.name = 'Leg_Hip_' + i; h.position.set(Math.cos(i) * 0.9, 2, Math.sin(i) * 0.9); root.add(h); byName[h.name] = h;
    const seg = new T.Group(); h.add(seg); for (let k = 0; k < 3; k++) { const s = new T.Mesh(new T.BoxGeometry(0.2, 1, 0.2), mL); s.position.set(Math.cos(i) * (0.5 + k), -k * 0.6, Math.sin(i) * (0.5 + k)); seg.add(s); } }
  return { root, byName };
};
const notes = [], sounds = [], scene = new T.Scene(), walk = { on: true, dead: null, drive: false, x: 0, z: 0, y: 0, yaw: 0 }, cans = [new T.Group()]; cans[0].position.set(60, 0, -60);
const ears = [0, 1].map(i => { const g = new T.Group(); g.position.set(60, 1, -60); return { type: 'ear', g, held: false, inCan: true, sleep: true, v: new T.Vector3() }; });
const ctx = { T, Math, NROAD: -134, scene, walk, camera: new T.PerspectiveCamera(), V3: (x, y, z) => new T.Vector3(x, y, z), tv: new T.Vector3(), tv2: new T.Vector3(),
  floorAt: () => 0, pushOut() {}, puff() {}, layBody(...a) { ctx.died = a; }, DMG_NOTIFY: m => notes.push(m), tsnd: { ctx: null }, kiaNoise() {}, utv: { g: null },
  loadGlbModel: (url, cb) => cb(mkModel(/daddy/.test(url) ? 'Daddy_Cob_Torso' : 'Cob_Body')), CORN_PROPS_STATE: { items: ears, cans } };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + '\nthis.CREEP = CREEP; this.CFIELD = CFIELD; this.CREEP_K = CREEP_K; this.inCField = inCField; this.loadCreeps = loadCreeps; this.updateCreeps = updateCreeps; this.creepPaintHit = creepPaintHit; this.creepToolHit = creepToolHit; this.creepDebug = creepDebug; this.foldModel = foldModel;', ctx);
const C = ctx.CREEP, F = ctx.CFIELD, run = (sec, dt = 0.05, each) => { for (let t = 0; t < sec; t += dt) { ctx.updateCreeps(dt); if (each) each(); } };
const S = () => C.list.filter(c => c.kind === 'stalker' && c.hp > 0);

// the field and the models
assert.deepEqual([F.x0, F.x1, F.z0, F.z1], [-199, 139, -231, -184], 'the 12-row field north of the north road');
{ const m = mkModel('Cob_Body'); let before = 0, after = 0; m.root.traverse(o => { if (o.isMesh) before++; }); assert.equal(ctx.foldModel(m.root, /Leg_Hip/), 6, 'six legs kept as moving parts');
  m.root.traverse(o => { if (o.isMesh) after++; }); assert.ok(after < before && after === 2 + 6, 'folded: body + eye in the root, one mesh per leg (' + before + ' -> ' + after + ' meshes)'); }
ctx.loadCreeps();
assert.equal(C.ready, true); assert.equal(C.phase, 'stalkers'); assert.equal(S().length, 2, 'two cob stalkers');
assert.ok(S().every(c => ctx.inCField(c.x, c.z) && c.hips.length === 6), 'both in the field, six animated legs each');
assert.ok(Math.abs(S()[0].x - S()[1].x) > 60, 'well apart');
assert.ok(C.proto.stalker.root.children.length > 0, 'the model is built');
{ let red = false; C.proto.stalker.root.traverse(o => { if (o.isMesh && o.material.emissive && o.material.emissive.r > 0.5) red = true; }); assert.ok(red, 'the red eyes glow in the dark'); }
assert.ok(S().every(c => c.g.parent === scene && c.s.children.length === 1), 'each creature is in the scene with its model attached');

// you, just outside the field: the nearest one shadows you along the edge and never steps out
const A = S()[0], B = S()[1]; B.x = 120; B.z = -220;
A.x = -50; A.z = F.z1 - 6; walk.x = -50; walk.z = F.z1 + 5;
let left = false; run(20, 0.05, () => { if (!ctx.inCField(A.x, A.z, 0.06)) left = true; });
assert.equal(A.state, 'stalk', 'you stepped out: it shadows you'); assert.equal(left, false, 'it never leaves the field on its own');
assert.ok(Math.abs(A.x - walk.x) < 3 && A.z > F.z1 - 2.5, 'it waits at the edge right by you');
assert.equal(C.bites, 0, 'and cannot reach you');
// in the corn: it hunts and bites; the third bite kills
walk.z = F.z1 - 3; run(1.2);
assert.equal(A.state, 'hunt', 'you are in its corn: it hunts');
run(6); assert.ok(ctx.died && walk.dead === 'cob', 'three bites and you are dead (' + notes.slice(-2).join(' | ') + ')');
assert.ok(notes.some(n => /A cob stalker bit you! \(1\/3\)/.test(n)), 'bites are announced');
walk.dead = null; ctx.died = null; C.bites = 0;
// bites heal
C.bites = 2; walk.x = 300; walk.z = 300; run(26); assert.equal(C.bites, 1, 'one bite heals every 25 s');
C.bites = 0;

// a corn ear thrown out of the field: it goes out for it, eats it, the ear is back in its can, it walks back in
const ear = ears[0]; ear.inCan = false; ear.sleep = true; ear.g.position.set(A.x + 4, 0.23, F.z1 + 22);
let wentOut = false; run(30, 0.05, () => { if (!ctx.inCField(A.x, A.z, 1)) wentOut = true; });
assert.ok(wentOut, 'drawn out of the field by the corn');
assert.equal(ear.inCan, true, 'it ate the ear'); assert.ok(Math.hypot(ear.g.position.x - 60, ear.g.position.z + 60) < 0.5, 'and a fresh one is back in the can');
run(25); assert.ok(ctx.inCField(A.x, A.z, 0.5), 'then it walks back into the corn');
// an ear still in its can, or in your hand, draws nothing
ear.held = true; ear.inCan = false; ear.g.position.set(A.x, 0.2, F.z1 + 10); const st0 = A.state; run(2); assert.notEqual(A.state, 'lure', 'an ear in your hand is no lure'); ear.held = false; ear.inCan = true;
assert.ok(st0 !== undefined);
// an ear still flying draws nothing yet; one lying on the ground counts even if it is still jittering against a wall
ear.inCan = false; ear.sleep = false; ear.g.position.set(A.x, 3, F.z1 + 10); ear.v.set(6, 2, 0); run(0.3); assert.notEqual(A.state, 'lure', 'an ear in the air is no lure yet');
ear.g.position.y = 0.23; ear.v.set(0.05, 0, 0.05); run(0.3); assert.equal(A.state, 'lure', 'one on the ground (even jittering) is');
ear.inCan = true; ear.sleep = true; ear.v.set(0, 0, 0); ear.g.position.set(60, 1, -60); walk.x = 300; walk.z = 300; run(25);

// paintballs and tools hurt them
walk.x = 300; walk.z = 300; run(1);
const shoot = c => { const p = new T.Vector3(c.x - 5, c.g.position.y + c.hitY, c.z), dir = new T.Vector3(1, 0, 0); return ctx.creepPaintHit(p, dir, 10, 0xff0000); };
const hp0 = A.hp; assert.equal(shoot(A), true, 'a paintball through its body hits'); assert.equal(A.hp, hp0 - 1, 'one point a ball');
assert.equal(ctx.creepPaintHit(new T.Vector3(A.x - 5, A.g.position.y + 9, A.z), new T.Vector3(1, 0, 0), 10, 0), false, 'one far over its head misses');
{ const o = new T.Vector3(A.x, A.g.position.y + A.hitY, A.z - 1.8), dir = new T.Vector3(0, 0, 1); assert.equal(ctx.creepToolHit(o, dir, 3), true, 'a crowbar swing in reach hits'); assert.equal(A.hp, hp0 - 4); }
for (let i = 0; i < 20 && A.hp > 0; i++) shoot(A);
assert.equal(A.state, 'dead', 'enough hits and it dies'); assert.equal(C.phase, 'stalkers', 'one down, one to go');
for (let i = 0; i < 20 && B.hp > 0; i++) shoot(B);
assert.equal(B.state, 'dead'); run(1); assert.equal(C.phase, 'boss-wait', 'both stalkers dead...');
walk.x = -40; walk.z = F.z1 - 5;   // you, standing in the corn
run(4.5); const D = C.list.find(c => c.kind === 'daddy');
assert.ok(D, '...and Daddy Cob Legs comes'); assert.equal(C.phase, 'boss'); assert.ok(notes.includes('🌽 The corn is shaking...'));
assert.ok(ctx.inCField(D.x, D.z) && Math.abs(Math.abs(D.x - walk.x) - 30) < 8, 'it climbs out of the corn about 30 m from you along the rows');
assert.ok(D.rise > 0 && D.g.position.y < -1, 'rising out of the ground');
assert.equal(D.hp, 60, 'a lot tougher'); assert.equal(D.K.dmg, 2, 'and its bite counts double');
assert.equal(shoot(D), false, 'cannot be hurt while it climbs out');
run(3.5); assert.equal(D.rise, 0, 'out'); assert.ok(D.g.position.y > -0.01, 'standing on the ground');
// dead stalkers flip over and are cleared away after half a minute
assert.ok(Math.abs(A.s.rotation.z) > 2, 'dead ones lie belly-up');
run(30); assert.ok(!C.list.includes(A) && !A.g.parent, 'and are cleared away');
// Daddy dies -> quiet -> after the quiet spell (not while you are in the field) two new stalkers
walk.x = 300; walk.z = 300; run(0.2);
for (let i = 0; i < 80 && D.hp > 0; i++) shoot(D);
run(0.5); assert.equal(C.phase, 'quiet'); assert.ok(notes.includes('🌽 The corn goes still.'));
C.quiet = 5; walk.x = -40; walk.z = F.z1 - 5; run(6); assert.equal(C.phase, 'quiet', 'not while you are in the field');
walk.x = 300; walk.z = 300; run(1); assert.equal(C.phase, 'stalkers'); assert.equal(S().length, 2, 'two new stalkers move in');
// debug menu helpers
assert.match(ctx.creepDebug('boss'), /Daddy Cob Legs comes/); run(0.2); assert.equal(S().length, 0);
assert.match(ctx.creepDebug('reset'), /two cob stalkers/); assert.equal(S().length, 2); assert.equal(C.list.length, 2);

// ---------------------------------------------------------------- the pumps
{ const p0 = html.indexOf("// ---------- the owner's teal motor-pump models (v1.97.108)"), p1 = html.indexOf('// ---------- conveyor belt between two points', p0);
  assert.ok(p0 > 0 && p1 > p0, 'pump model section');
  const added = [], pick = []; let model = null;
  const pc = { T, Math, V3: (x, y, z) => new T.Vector3(x, y, z), MATS: {}, scene: { add: o => added.push(o) }, add: (geo, m, x, y, z, id) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); if (id) pick.push(o); return o; },
    loadGlbModel: (url, cb) => cb(model()) };
  pc.mat = c => pc.MATS[c] || (pc.MATS[c] = new T.MeshLambertMaterial({ color: c }));
  vm.createContext(pc); vm.runInContext(html.slice(p0, p1) + '\nthis.pumpModel = pumpModel; this.loadPumpModels = loadPumpModels; this.PUMP_MODELS = PUMP_MODELS;', pc);
  model = () => { const root = new T.Group(), teal = new T.MeshLambertMaterial({ color: 0x2a8f86 }), dark = new T.MeshLambertMaterial({ color: 0x222222 });   // 6 m long along x: volute at +2, motor at -1.5
    const vol = new T.Mesh(new T.CylinderGeometry(0.8, 0.8, 0.6), teal); vol.name = 'Centrifugal_Volute_Pump'; vol.position.set(2, 1, 0); root.add(vol);
    const mot = new T.Mesh(new T.BoxGeometry(3, 1.4, 1.4), teal); mot.position.set(-1.5, 1, 0); root.add(mot); const sk = new T.Mesh(new T.BoxGeometry(6, 0.2, 2), dark); sk.position.set(0, 0.1, 0); root.add(sk);
    return { root, byName: { Centrifugal_Volute_Pump: vol } }; };
  pc.pumpModel('small', 10, 20, 'z', 1, 'f0', 0.85); pc.pumpModel('small', 30, 20, 'z', 1, 'f1', 0.85); pc.pumpModel('large', -5, 0, 'z', -1, 'beer', 0.9);
  assert.equal(pick.length, 3, 'each pump stays clickable (its unit id)');
  pc.loadPumpModels();
  const small = added.filter(o => o.userData.pumpModel === 'small'), large = added.filter(o => o.userData.pumpModel === 'large');
  assert.equal(small.length, 3, 'all the small pumps fold into one mesh per material (teal, skid, yellow pad)'); assert.equal(large.length, 3);
  const bbOf = list => { const bb = new T.Box3(); for (const o of list) { o.geometry.computeBoundingBox(); bb.union(o.geometry.boundingBox); } return bb; };
  const tealS = small.find(o => o.material.color.getHex() === 0x2a8f86); tealS.geometry.computeBoundingBox();
  const bb = tealS.geometry.boundingBox; assert.ok(bb.max.z - bb.min.z > 2 && bb.max.z - bb.min.z < 3.2, 'scaled to the plant pump length (' + (bb.max.z - bb.min.z).toFixed(2) + ' m)');
  // the first pump's volute sits on its (x, z) and the motor runs toward +z (dir 1 along z)
  const pos = tealS.geometry.attributes.position.array; let vz = Infinity, mz = -Infinity; for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i] - 10) < 1) { vz = Math.min(vz, pos[i + 2]); mz = Math.max(mz, pos[i + 2]); }
  assert.ok(Math.abs(vz - 20) < 0.6 && mz > 21.5, 'volute at the pump spot, motor along +z (volute edge ' + vz.toFixed(2) + ', motor end ' + mz.toFixed(2) + ')');
  const padS = small.find(o => o.material === pc.mat(0xf2c200)); padS.geometry.computeBoundingBox(); assert.ok(padS.geometry.boundingBox.max.y <= 0.31 && padS.geometry.boundingBox.min.y >= -0.01, 'on a 30 cm yellow pad');
  assert.ok(bbOf(small).min.y >= -0.01, 'nothing below the floor');
}
// wiring
assert.equal((html.match(/pumpModel\('small', PX, PZ, 'z', 1, id, 0\.85\);/g) || []).length, 1, 'the fermenter recirculation pumps use the small teal model');
assert.ok(html.includes("pumpModel('large', BPX, BPZ, 'z', -1, 'beer', 0.9);"), 'the beer well pump uses the large one');
assert.ok(html.includes('  loadPumpModels();') && html.includes('  loadCreeps();'), 'both load at start-up');
assert.ok(html.includes("stepSafe('creeps', () => updateCreeps(dt));"), 'creatures update every frame');
assert.ok(html.includes('if (!done && CREEP.list.length && creepPaintHit(p, dir, len, B.c)) { splatSnd(p); done = true; }'), 'paintballs hit them');
assert.ok(html.includes("creepToolHit(o, dir, held === 'pick' || held === 'crowbar' ? 3 : 2)"), 'so do swung tools');
assert.ok(html.includes("hit === 'cob' ? 'Squeeg got eaten by the cob stalkers.") && html.includes("hit === 'daddy' ? 'Daddy Cob Legs got Squeeg.'"), 'death messages');
assert.ok(html.includes("['🌽 Corn field: kill the stalkers (Daddy comes)', () => toast(P3.creeps('boss'))]"), 'debug menu row');
assert.ok(html.includes('P3.dmgNotify = m => toast(m);'), 'bite (and vehicle / acid / extinguisher) messages reach the screen');
{ const reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8'));
  for (const f of ['cob_stalker.glb', 'daddy_cob_legs.glb', 'small_teal_motor_pump.glb', 'large_teal_motor_pump.glb']) {
    assert.ok(fs.existsSync('../assets/models/' + f), f + ' is in the repo');
    assert.ok(reg.assets.some(x => (x.files || []).includes('assets/models/' + f) && x.status === 'in-use'), f + ' is registered'); } }
console.log('PASS: cob stalkers (field edge, hunt, bites, corn ear lure, damage), Daddy Cob Legs, quiet spell and respawn; teal pumps in the ferm alley and at the beer well');
