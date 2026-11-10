// Run from the test/ directory: node validate-ranger.cjs
// v1.97.93 / v1.97.94: the Ranger is the owner's ps1_utv_ranger.glb (made with Gemini), with visual per-wheel suspension.
//  1. the file itself: low-poly, every named part the game drives, registered as a first-party asset
//  2. the model swap, run for real on the game's own glTF reader: box parts out, driver/passenger/radio kept, wheels on hub
//     pivots, Body tinted per player (never shared), Lights unlit, a missing part leaves the box Ranger in place
//  3. the suspension, run for real against stub ground: flat, ramp, side slope, a curb under one wheel, a step (bounce),
//     parked (no re-sampling), a vehicle without wheels
//  4. the wiring: the driven vehicle, the other player's Ranger, burnt-out paint, ride-along seat still there
//  5. air (v1.97.94): take off at a lip, fly, land with a thump, no launch off a curb, damage only on a big drop; the dirt hills
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const ROOT = path.join(__dirname, '..'), GLB = path.join(ROOT, 'assets/models/ps1_utv_ranger.glb');
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);

// 1 ---------------------------------------------------------------- the file
assert.ok(fs.existsSync(GLB), 'assets/models/ps1_utv_ranger.glb is in the repo');
const buf = fs.readFileSync(GLB), jlen = buf.readUInt32LE(12), J = JSON.parse(buf.slice(20, 20 + jlen).toString('utf8'));
let tris = 0; for (const m of J.meshes) for (const p of m.primitives) tris += J.accessors[p.indices !== undefined ? p.indices : p.attributes.POSITION].count / 3;
assert.ok(tris <= 900, 'PS1 budget: ' + tris + ' triangles (<= 900)');
const names = new Set(J.nodes.map(n => n.name));
for (const n of ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR', 'steering_wheel', 'dump_bed', 'body', 'shock_FL', 'shock_FR', 'shock_RL', 'shock_RR', 'seat_driver', 'seat_passenger', 'headlight_L', 'headlight_R'])
  assert.ok(names.has(n), 'the model has ' + n);
const mats = J.materials.map(m => m.name);
assert.ok(mats.includes('Body') && mats.includes('Lights'), 'Body (tinted per player) and Lights (unlit) materials are there: ' + mats);
const wfl = J.nodes.find(n => n.name === 'wheel_FL'), wrr = J.nodes.find(n => n.name === 'wheel_RR');
assert.deepEqual(wfl.translation, [-0.78, 0.33, -1.0], 'front-left wheel where the box Ranger had it (driving and collisions carry over)');
assert.deepEqual(wrr.translation, [0.78, 0.33, 1.0], 'rear-right too');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/registry.json'), 'utf8')).assets.find(a => a.id === 'first-party-ps1-utv-ranger');
assert.ok(reg && reg.status === 'in-use' && reg.files.includes('assets/models/ps1_utv_ranger.glb') && /Gemini/.test(reg.creator), 'registered as a first-party (Gemini) asset');
assert.ok(fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8').includes('ps1_utv_ranger.glb'), 'and credited');
assert.ok(html.includes("url: '/corn-souls/assets/models/ps1_utv_ranger.glb'"), 'the game loads that file');

// 2 ---------------------------------------------------------------- the model swap
const reader = html.slice(html.indexOf('const GLB_CT = {'), html.indexOf('function loadGlbModel('));
assert.ok(reader.includes("mat.name = m.name || '';"), 'the reader keeps glTF material names (the swap finds Body / Lights by name)');
const secA = html.indexOf('// ---------- RANGER MODEL'), secB = html.indexOf('function buildUTV(color, vest) {');
assert.ok(secA > 0 && secB > secA, 'the Ranger model + suspension section sits right before buildUTV');
let section = html.slice(secA, secB);
assert.ok(html.includes('for (const c of g.children) c.userData.rangerPart = true;') && html.includes('rangerSkinQueue(g, o, color);\n  return g;'), 'makeRangerMesh marks its box parts and queues the swap');
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(x => x.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE;
const T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });   // no DOM images in node
const warns = [];
const ctx = { console: { warn: (...a) => warns.push(a.join(' ')), log() {} }, TextDecoder, Blob: class {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, T,
  RANGER_COL: [0xc0221c, 0x1f63c8], batteryLight: m => { m.userData.batteryLight = true; return m; },
  utv: { g: null, sw: null }, NET: { rr: null }, RANGER_SAVE: null, SR: { g: null }, SR_BED: new T0.Vector3(0, 1.02, 0.95), VBOXES: [],
  dmgG: () => null, dmgOf: () => ({}), dmgChar() {}, floorAt: () => 0 };
const glbBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
ctx.loadGlbModel = (url, cb) => { ctx.loads = (ctx.loads || 0) + 1; cb(ctx.glbBuild(glbBuf)); };
vm.createContext(ctx);
vm.runInContext(reader + '\n' + section + '\nthis.rangerSkinQueue = rangerSkinQueue; this.RANGER_GLB = RANGER_GLB; this.suspStep = suspStep; this.SUSP = SUSP;', ctx);
const boxRanger = () => {   // what makeRangerMesh hands over: box parts marked, plus things added afterwards that must survive
  const g = new T0.Group(), o = { wheels: [{ pv: new T0.Group(), w: new T0.Mesh(), front: true }] };
  const part = new T0.Mesh(new T0.BoxGeometry(1, 1, 1), new T0.MeshLambertMaterial()); part.userData.rangerPart = true; g.add(part);
  const driver = new T0.Group(); driver.name = 'driver'; g.add(driver);
  return { g, o, part, driver };
};
const A = boxRanger(), B = boxRanger();
ctx.utv.g = A.g; ctx.VBOXES.push({ g: A.g, b: new T0.Box3(new T0.Vector3(-9, -9, -9), new T0.Vector3(9, 9, 9)) });
ctx.rangerSkinQueue(A.g, A.o, 0xc0221c); ctx.rangerSkinQueue(B.g, B.o, 0x1f63c8);
assert.equal(ctx.loads, 1, 'one fetch, cloned per Ranger');
assert.deepEqual(warns, [], 'no warnings from the swap');
for (const R of [A, B]) {
  assert.equal(R.g.userData.skinned, true, 'the Ranger wears the model');
  assert.equal(R.part.parent, null, 'the box body is gone');
  assert.equal(R.driver.parent, R.g, 'the seated driver (and anything else added after the box body) stays');
  assert.equal(R.o.wheels.length, 4, 'four wheels, in the same array the driving code holds');
  for (const w of R.o.wheels) {
    assert.ok(w.pv.isGroup && w.w.parent === w.pv && w.w.position.length() === 0, 'each wheel spins inside a hub pivot');
    assert.ok(w.shock && w.L0 > 0.2, 'and knows its shock');
  }
  assert.deepEqual(R.o.wheels.map(w => w.front), [true, true, false, false], 'front pair steers');
  let lit = 0, normals = true; R.g.traverse(c => { if (!c.isMesh) return; if (!c.geometry.attributes.normal) normals = false; if (c.material.userData.batteryLight) { lit++; assert.ok(c.material.isMeshBasicMaterial, 'lights draw unlit'); } });
  assert.ok(normals, 'every mesh has normals (without them the reader draws it black)');
  assert.equal(lit, 4, 'head and taillights are battery lights');
}
const bodyMat = R => { let m = null; R.g.traverse(c => { if (c.isMesh && c.material.name === 'Body') m = c.material; }); return m; };
const mA = bodyMat(A), mB = bodyMat(B);
assert.ok(mA && mB && mA !== mB, 'each Ranger has its own Body material (a shared one would repaint both)');
assert.equal(mA.color.getHex(), new T0.Color(0xc0221c).getHex(), 'Player 1 red');
assert.equal(mB.color.getHex(), new T0.Color(0x1f63c8).getHex(), 'Player 2 blue');
assert.ok(ctx.utv.sw && ctx.utv.sw.name === 'steering_wheel', 'the driven Ranger gets the model steering wheel');
assert.ok(ctx.VBOXES[0].b.max.y > 1.8 && ctx.VBOXES[0].b.max.y < 2.4 && ctx.VBOXES[0].b.max.x < 1, 'the walk-into / stand-on box is re-measured from the model (' + ctx.VBOXES[0].b.max.y.toFixed(2) + ' m tall)');
assert.equal(ctx.SR_BED.y, 0.79, 'the radio sits on the model bed floor');
{ // a model missing a part never costs you the vehicle
  const good = ctx.RANGER_GLB.root; ctx.RANGER_GLB.root = new T0.Group();
  const C = boxRanger(); ctx.rangerSkinQueue(C.g, C.o, 0xc0221c);
  assert.equal(C.part.parent, C.g, 'a broken model leaves the box Ranger in place');
  assert.ok(warns.some(w => w.includes('box Ranger stays')), 'and says so in the console');
  ctx.RANGER_GLB.root = good;
}

// 3 ---------------------------------------------------------------- the suspension
assert.ok(section.includes('const suspRipple = (x, z) =>'), 'a faint ripple keeps it alive on flat ground');
section = section.replace(/const suspRipple = \(x, z\) =>[^;]*;/, 'const suspRipple = () => 0;');   // exact numbers below: no ripple
const sctx = { T, floorAt: () => 0, Math };
vm.createContext(sctx);
vm.runInContext(section.slice(section.indexOf('// ---------- SUSPENSION')) + '\nthis.suspStep = suspStep; this.SUSP = SUSP;', sctx);
const veh = () => ({ g: {}, x: 0, z: 0, a: 0, y: 0, wheels: [[-0.78, -1], [0.78, -1], [-0.78, 1], [0.78, 1]].map(([x, z]) => ({ pv: { position: { x, y: 0.33, z } }, shock: { scale: { y: 1 } }, L0: 0.3138 })) });
const run = (o, n, lp = 0, lr = 0) => { for (let i = 0; i < n; i++) sctx.suspStep(o, 1 / 60, lp, lr); };
{ const o = veh(); run(o, 120); assert.ok(Math.abs(o.sY) < 1e-6 && Math.abs(o.sP) < 1e-6 && Math.abs(o.sR) < 1e-6, 'flat ground: level and still'); }
{ sctx.floorAt = (x, z) => Math.max(0, -z * 0.1);   // a ramp rising toward -z, the way the Ranger faces
  const o = veh(); run(o, 400); assert.ok(Math.abs(o.sP - Math.atan2(0.1, 2)) < 0.003, 'nose up on a ramp: ' + o.sP.toFixed(3)); assert.ok(Math.abs(o.sR) < 1e-3, 'no roll'); }
{ sctx.floorAt = (x) => x * 0.1;   // right side higher
  const o = veh(); run(o, 400); assert.ok(Math.abs(o.sR - Math.atan2(0.156, 1.56)) < 0.003, 'right side up on a side slope: ' + o.sR.toFixed(3)); }
{ sctx.floorAt = (x, z) => (x < 0 && z < 0 ? 0.25 : 0);   // a curb under the front-left wheel only
  const o = veh(); run(o, 400); const fl = o.wheels[0], rr = o.wheels[3];
  assert.ok(fl.pv.position.y - 0.33 > 0.05 && fl.pv.position.y - 0.33 <= sctx.SUSP.TRAVEL + 1e-9, 'the front-left wheel rides up, within its travel');
  assert.ok(fl.shock.scale.y < 0.9, 'its shock squashes'); assert.ok(o.sP > 0 && o.sR < 0, 'and the body tips toward the raised corner');
  assert.ok(Math.abs(rr.pv.position.y - 0.33) <= sctx.SUSP.TRAVEL + 1e-9, 'every wheel stays within +-' + sctx.SUSP.TRAVEL + ' m'); }
{ sctx.floorAt = () => 0; const o = veh(); run(o, 60);   // driving up a step: the body lags, bounces once, settles
  o.y = 0.15; sctx.floorAt = () => 0.15; const tr = []; for (let i = 0; i < 180; i++) { sctx.suspStep(o, 1 / 60, 0, 0); tr.push(o.sY); }
  assert.ok(Math.min(...tr) < -0.03, 'a step kicks the chassis down: ' + Math.min(...tr).toFixed(3));
  assert.ok(Math.max(...tr.slice(10)) > 0.002, 'it springs back past level (a bounce, not a slow drift): ' + Math.max(...tr.slice(10)).toFixed(4));
  assert.ok(Math.abs(tr[tr.length - 1]) < 0.005, 'and settles'); }
{ let calls = 0; sctx.floorAt = () => { calls++; return 0; }; const o = veh(); run(o, 1); const c1 = calls; run(o, 30);
  assert.equal(calls, c1, 'parked: the ground is not re-sampled'); o.x += 0.5; run(o, 1); assert.equal(calls, c1 + 4, 'moved: four samples, one per wheel'); }
{ sctx.floorAt = () => 0; const o = { g: {}, x: 0, z: 0, a: 0, y: 0, wheels: [] }; run(o, 10); assert.ok(Number.isFinite(o.sY), 'a vehicle without wheels still gets a body pose'); }
{ sctx.floorAt = () => 0; const o = veh(); run(o, 60, 0, 0.12);   // leaning hard into a turn on flat ground
  const l = o.wheels[0].pv.position.y - 0.33, r = o.wheels[1].pv.position.y - 0.33;
  assert.ok(l > 0.05 && r < -0.05, 'body roll (right side up): the low side compresses, the high side droops, the wheels stay on the ground while the body leans over them'); }

// 4 ---------------------------------------------------------------- wiring
assert.ok(html.includes("suspStep(u, dt, u.pitch, u.roll);") && html.includes("u.g.position.set(u.x, u.y + bounce + u.sY, u.z); u.g.rotation.set(u.pitch + u.sP, u.a, u.roll + u.sR, 'YXZ');"), 'the driven vehicle (Ranger or car) rides the springs, lean on top');
assert.ok(html.includes("walk.y = u.y + 0.2 + u.sY * 0.8;"), 'the seat (and first-person camera) rides with the body');
assert.ok(html.includes("suspStep(Q, dt, 0, 0); Q.g.position.set(Q.x, Q.y + 0.13 + Q.sY, Q.z); Q.g.rotation.set(Q.sP, Q.a, Q.sR, 'YXZ');"), "the other player's Ranger bounces on this screen too");
assert.ok(html.includes('(o.material.map && !o.userData.charOK)'), 'a burnt-out Ranger chars even though its paint is a texture');
assert.ok(html.includes('function seatPassenger(g, vest)') && html.includes('function passSeat(g, out)') && html.includes("netSend({ t: 'ps', on: true });"), 'ride-along in the passenger seat is still wired');

// 5 ---------------------------------------------------------------- air + dirt hills (v1.97.94)
const airSrc = html.slice(html.indexOf('const AIR = {'), html.indexOf('function buildUTV(color, vest) {'));
const hillSrc = html.slice(html.indexOf('const DIRT_HILLS = ['), html.indexOf('// ---------- AIR'));
assert.ok(airSrc.includes('function vehVertical(u, dt)') && hillSrc.includes('function buildDirtHills()'), 'air physics and the dirt hills are in the game');
{ const actx = { Math, walk: { drive: true }, bumps: [], hurt: [], floorAt: () => 0 };
  actx.utvBump = v => actx.bumps.push(v); actx.dmgDrivingKey = () => 'r'; actx.dmgHit = (k, a) => actx.hurt.push(a);
  vm.createContext(actx); vm.runInContext(airSrc + '\nthis.vehVertical = vehVertical; this.AIR = AIR;', actx);
  const drive = (u, n, dt = 1 / 60) => { const out = []; for (let i = 0; i < n; i++) { u.x += u.vx * dt; u.z += u.vz * dt; actx.vehVertical(u, dt); out.push({ z: u.z, y: u.y, air: !!u.air }); } return out; };
  // a 12 m ramp up to 1.6 m (rising toward -z, the way you drive), then a sheer drop: the kicker
  actx.floorAt = (x, z) => (z <= 44 && z > 32 ? (44 - z) / 12 * 1.6 : 0);
  let u = { x: 0, z: 60, y: 0, vx: 0, vz: -18, vy: 0 }, tr = drive(u, 200);
  const up = tr.filter(t => t.z < 44 && t.z > 33); assert.ok(up.every(t => !t.air), 'climbing the ramp stays on the ground');
  const off = tr.findIndex(t => t.air); assert.ok(off > 0 && Math.abs(tr[off].z - 32) < 0.8, 'it takes off at the lip (z ' + (off > 0 ? tr[off].z.toFixed(1) : '-') + ')');
  const peak = Math.max(...tr.map(t => t.y)); assert.ok(peak > 1.7, 'carrying the ramp speed up past the lip: peak ' + peak.toFixed(2) + ' m');
  const land = tr.findIndex((t, i) => i > off && !t.air); assert.ok(land > off && 32 - tr[land].z > 8, 'and lands well past it: ' + (32 - tr[land].z).toFixed(1) + ' m of air');
  assert.ok(actx.bumps.length === 1 && actx.bumps[0] <= 4, 'one thump on landing, below the bump code damage line'); assert.equal(actx.hurt.length, 0, 'a normal jump does no damage');
  // slow over the same ramp: barely leaves the ground at the lip, no flight
  u = { x: 0, z: 60, y: 0, vx: 0, vz: -3, vy: 0 }; tr = drive(u, 600); const slowAir = tr.filter(t => t.air).length;
  assert.ok(slowAir < 40, 'crawling off the lip just drops off it (' + slowAir + ' airborne frames)');
  // a curb: a 0.15 m step up never launches you
  actx.floorAt = (x, z) => (z < 50 ? 0.15 : 0); u = { x: 0, z: 60, y: 0, vx: 0, vz: -15, vy: 0 }; tr = drive(u, 120);
  assert.ok(Math.max(...tr.map(t => t.y)) < 0.16, 'a curb is a step, not a ramp: no launch');
  // going down a long slope stays planted
  actx.floorAt = (x, z) => Math.max(0, Math.min(3, (z - 20) * 0.2)); u = { x: 0, z: 40, y: 3, vx: 0, vz: -15, vy: 0 }; tr = drive(u, 70);
  assert.ok(tr.filter(t => t.z > 21 && t.z < 25).every(t => !t.air), 'off a crest at 15 m/s it flies, then lands and stays planted down the slope (the landing takes the slope speed)');
  // a big drop hurts
  actx.hurt.length = 0; actx.floorAt = () => 0; u = { x: 0, z: 0, y: 6, vx: 0, vz: 0, vy: 0, air: true }; drive(u, 120);
  assert.ok(actx.hurt.length === 1 && actx.hurt[0] > 0, 'a ~6 m fall damages the vehicle');
  actx.hurt.length = 0; u = { x: 0, z: 0, y: 2.5, vx: 0, vz: 0, vy: 0, air: true }; drive(u, 120); assert.equal(actx.hurt.length, 0, 'a 2.5 m drop (the tabletop) does not'); }
{ const WALK_SURF = [], wallSegs = [], meshes = [];
  const hctx = { T: T0, WALK_SURF, wallSegs, groundTex: () => new T0.Texture(), scene: { add: o => meshes.push(o) } };
  vm.createContext(hctx); vm.runInContext(hillSrc + '\nthis.buildDirtHills = buildDirtHills; this.DIRT_HILLS = DIRT_HILLS;', hctx);
  hctx.buildDirtHills();
  const H = hctx.DIRT_HILLS; assert.equal(meshes.length, H.length, 'one mesh per hill');
  for (const h of H) for (let i = 0; i < h.p.length - 1; i++) { const [za, ya] = h.p[i], [zb, yb] = h.p[i + 1];
    assert.ok(za >= zb, 'profiles run north (z falling)'); if (za !== zb) assert.ok(Math.abs(ya - yb) / (za - zb) <= 0.45, 'every slope is a ramp the ground code treats as a slope (<= 0.45)'); }
  const at = (x, z) => { let f = 0; for (const s of WALK_SURF) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) f = Math.max(f, s.y0 + (s.y1 - s.y0) * (z - s.z0) / (s.z1 - s.z0)); return f; };
  assert.ok(Math.abs(at(123, 32.01) - 1.6) < 0.01 && Math.abs(at(123, 38) - 0.8) < 0.01, 'the kicker is a 1.6 m ramp');
  assert.ok(Math.abs(at(142, 34) - 2.0) < 1e-9, 'the tabletop is flat on top at 2.0 m'); assert.ok(Math.abs(at(177, 24) - 3.6) < 1e-9, 'the big hill crests at 3.6 m');
  assert.ok(wallSegs.some(w => w[1] === 32 && w[3] === 32 && w[5] >= 1.6), "the kicker's sheer face blocks you from the far side");
  assert.ok(wallSegs.filter(w => w[0] === w[2]).length > 0 && wallSegs.every(w => w[4] < 0 && w[5] > 0.6), "tall sides block you below the top only (so you can still drive off an edge)");
  for (const h of H) { assert.ok(h.x0 >= 110 && h.x1 <= 190 && Math.min(...h.p.map(q => q[0])) >= 0 && Math.max(...h.p.map(q => q[0])) <= 52, 'the hills stay in the open grass east of the plant'); } }
assert.ok(html.includes('buildBillboards(); buildDirtHills(); buildGrainPiles(); exitSignsForEgress(); meshDoorsBuild(); lightBuild(); ribAll(); psxUVAll(); mergeStatic();'), 'the hills are built with the world (and merged like the rest of the static scenery)');
assert.ok(html.includes('vehVertical(u, dt);   // ride the ground, or fly') && !html.includes('u.y += (fl - u.y) * Math.min(1, 8 * dt);'), 'the driven vehicle uses the air physics');
assert.ok(html.includes('const ga = u.air ? 0.12 : 1;') && html.includes('* thr * dt * ga;') && html.includes('ls *= Math.exp(-(u.air ? 0.3'), 'in the air: little gas, brake, steering or grip');
assert.ok(html.includes('if (fN < u.y - 0.8 && fN <= -5)') && !html.includes('fN < -0.5)'), 'only a drop into no ground at all (a dug hole) is refused: the pond banks and bottom are ground, so you can drive into the ponds again (v1.97.95)');
assert.ok(html.includes('utv.vy = 0; utv.air = false;') && html.includes('bailing out mid-jump'), 'getting in resets the jump state; bailing out mid-air drops the vehicle to the ground');
assert.ok(html.includes('if (o.air) { tP = o.sP - 0.02;') && html.includes('if (o.land) {'), 'the springs let the wheels hang in the air and take the landing');
assert.ok(html.includes('if (Q.air && !air) Q.land = 4; Q.air = air;'), "the other player's jumps show their wheels hanging and the landing too");
// v1.97.116: a real tyre and rim on every wheel (the model's 10-sided wheel had its tread texture on the sides too)
assert.ok(html.includes('rangerTireOn(w);   // v1.97.116') && html.includes("new T.CylinderGeometry(0.33, 0.33, 0.22, 24, 1, true).rotateZ(Math.PI / 2)"), 'each wheel node gets a 24-sided tyre the same size as the model\'s (r 0.33, 0.22 wide), axle along x');
assert.ok(html.includes('return RANGER_TIRE = { geo, tread, sideG, side, rim, hub, rimG, hubG, nutG };'), 'tread round the outside, plain sidewalls, a rim, hub and lug nuts');
assert.ok(html.indexOf('rangerTireOn(w);') < html.indexOf("w.traverse(c => { if (c.isMesh) c.userData.wheel = true; });   // a burnt-out Ranger keeps its tyres"), 'added before the wheels are marked, so a burnt-out Ranger keeps these tyres too');
console.log('validate-ranger: OK (' + tris + ' triangles, air + ' + 4 + ' dirt hills)');
