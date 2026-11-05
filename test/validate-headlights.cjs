// Run from the test/ directory: node validate-headlights.cjs
// v1.97.169, owner: "vehicles should have headlights when driving them especially after dark". Runs the game's own
// vehLightSource / vehLights with three.js: whatever you drive (the Ranger, a car, the mower) puts a beam at its nose, along its
// heading and a little down, into the lighting pass's second spot (csHl*); it fades in when you get in and out when you get out,
// and stutters with a flicker event. Checks the shader block too.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const camera = new T.PerspectiveCamera(); camera.position.set(0, 2, 5); camera.updateMatrixWorld();   // behind, looking along -z
const U = { csHl0: { value: new T.Vector4(0, 0, 0, 75) }, csHl1: { value: new T.Vector4(0, 0, -1, Math.cos(0.42)) }, csHl2: { value: new T.Vector4(0, 0, 0, Math.cos(0.22)) },
  csHl3: { value: new T.Vector4(0, 0, 0, 75) }, csHl4: { value: new T.Vector4(0, 0, -1, Math.cos(0.42)) }, csHl5: { value: new T.Vector4(0, 0, 0, Math.cos(0.22)) } };
const ctx = { T, Math, camera, walk: { on: true, dead: null, drive: false, mow: false }, utv: { g: null, x: 0, y: 0, z: 0, a: 0 }, CAR_ON: null, O: {}, MOW: { h: 0 }, LIGHT: { flK: 1 }, NET: { rp: null, rr: null } };
vm.createContext(ctx);
vm.runInContext(cut('// ---------- VEHICLE HEADLIGHTS (v1.97.169', 'function lightUpdate(dt) {') + '\nthis.vehLights = vehLights; this.vehLightSource = vehLightSource; this.VEHL = VEHL; this.vehLightsRemote = vehLightsRemote; this.vehLightSourceRemote = vehLightSourceRemote;', ctx);
const run = (sec, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) ctx.vehLights(U, dt); };
const world = () => { const inv = camera.matrixWorld; const p = new T.Vector3(U.csHl0.value.x, U.csHl0.value.y, U.csHl0.value.z).applyMatrix4(inv), d = new T.Vector3(U.csHl1.value.x, U.csHl1.value.y, U.csHl1.value.z).transformDirection(inv); return { p, d, I: U.csHl2.value.x }; };
// on foot: no beam
run(0.5); assert.equal(U.csHl2.value.x, 0, 'walking: no headlights');
// the Ranger, heading a = 0 (forward is -z), parked at (10, 0, -20)
ctx.walk.drive = true; ctx.utv.g = {}; Object.assign(ctx.utv, { x: 10, y: 0, z: -20, a: 0 });
run(0.05); const early = U.csHl2.value.x; run(1);
{ const w = world(); assert.ok(early > 0 && early < w.I, 'they come up as you get in');
  assert.ok(w.p.distanceTo(new T.Vector3(10, 0.9, -21.6)) < 1e-4, 'at the Ranger\'s nose, 0.9 m up (' + w.p.toArray().map(v => v.toFixed(2)) + ')');
  assert.ok(w.d.z < -0.99 && w.d.y < 0 && w.d.y > -0.1 && Math.abs(w.d.x) < 1e-6, 'along its heading, a little down onto the road');
  assert.ok(Math.abs(w.I - ctx.VEHL.I * ctx.VEHL.col.r) < 1, 'full strength (' + w.I.toFixed(0) + ')'); }
// turned: the beam turns with it
ctx.utv.a = Math.PI / 2; run(0.1); { const w = world(); assert.ok(w.d.x < -0.99 && w.p.x < 10 - 1.5, 'turned left 90 degrees: the beam swings to -x with it'); }
// a car: further to its nose, lower lamps
ctx.CAR_ON = {}; ctx.utv.a = 0; run(0.1); { const w = world(); assert.ok(w.p.distanceTo(new T.Vector3(10, 0.75, -22.5)) < 1e-4, 'in a car: at the car\'s nose'); } ctx.CAR_ON = null;
// a flicker event close by makes them stutter
ctx.LIGHT.flK = 0.15; run(0.05); assert.ok(world().I < 0.2 * ctx.VEHL.I, 'a flicker nearby: they stutter'); ctx.LIGHT.flK = 1;
// out of the vehicle: they fade out
ctx.walk.drive = false; run(1); assert.equal(U.csHl2.value.x, 0, 'out: off');
// the mower: its own heading (forward = -cos h, sin h)
ctx.walk.mow = true; ctx.O.shedMower = { g: { position: new T.Vector3(5, 0.1, 5) } }; ctx.MOW.h = 0; run(1);
{ const w = world(); assert.ok(w.p.distanceTo(new T.Vector3(4, 0.7, 5)) < 1e-4 && w.d.x < -0.99, 'the mower too, from its front'); } ctx.walk.mow = false; run(1);
// dead: off
ctx.walk.drive = true; ctx.walk.dead = 'x'; run(1); assert.equal(U.csHl2.value.x, 0, 'not for a dead driver'); ctx.walk.dead = null; ctx.walk.drive = false;
// the shader and the frame
assert.ok(html.includes('csHl0: { value: new T.Vector4(0, 0, 0, 75) }') && html.includes('uniform vec4 csHl0; uniform vec4 csHl1; uniform vec4 csHl2;'), 'a second spot in the lighting pass');
const sh = cut('if (csHl2.r + csHl2.g > 0.0) {', 'return k;');
assert.ok(sh.includes('smoothstep(csHl1.w, csHl2.w, dot(-l, csHl1.xyz))') && sh.includes('w = nl > -0.05 ? 0.3 + 0.7 * max(nl, 0.0) : 0.0') && sh.includes('/ (d * d + 25.0) * w'), 'a cone, a soft start at the bumper, and the road ahead still lit at a grazing angle (nothing on faces turned away)');
assert.ok(html.includes('  vehLights(U, dt);   // v1.97.169'), 'updated every frame with the lighting');
// v1.97.178, owner: "sync headlights and pigeon coos" - the OTHER player's beam, from the pose they already send
{ const runR = (sec, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) ctx.vehLightsRemote(U, dt); };
  const worldR = () => { const inv = camera.matrixWorld; const p = new T.Vector3(U.csHl3.value.x, U.csHl3.value.y, U.csHl3.value.z).applyMatrix4(inv), d = new T.Vector3(U.csHl4.value.x, U.csHl4.value.y, U.csHl4.value.z).transformDirection(inv); return { p, d, I: U.csHl5.value.x }; };
  assert.equal(ctx.vehLightSourceRemote(), null, 'solo: the other player does not exist, so no beam');
  runR(0.5); assert.equal(U.csHl5.value.x, 0, 'and nothing is sent to the shader');
  // they are driving their Ranger at (10, 0, -20), heading -z
  ctx.NET.rp = { drive: true, car: null }; ctx.NET.rr = { g: {}, x: 10, y: 0, z: -20, a: 0 };
  runR(0.05); const earlyR = U.csHl5.value.x; runR(1);
  { const w = worldR(); assert.ok(earlyR > 0 && earlyR < w.I, 'their beam comes up as they drive off');
    assert.ok(w.p.distanceTo(new T.Vector3(10, 0.9, -21.6)) < 1e-4, 'from their their Ranger nose (' + w.p.toArray().map(v => v.toFixed(2)) + ')');
    assert.ok(w.d.z < -0.99 && w.d.y < 0 && w.d.y > -0.1, 'along their heading, a little down onto the road');
    assert.ok(Math.abs(w.I - ctx.VEHL.I * ctx.VEHL.col.r) < 1, 'at full strength (' + w.I.toFixed(0) + ')');
    assert.ok(U.csHl2.value.x === 0, 'and it is a beam of its own: mine is still off while I am on foot'); }
  // in one of the drivable cars: further forward, lower lamps - read from the car's own group
  const car = { g: new T.Group() }; car.g.position.set(-40, 0, 12); car.g.rotation.y = Math.PI / 2; ctx.O.cars = [car];
  ctx.NET.rp = { drive: true, car: [0, -40, 12, Math.PI / 2, 0] }; runR(0.1); { const w = worldR(); assert.ok(w.p.distanceTo(new T.Vector3(-42.5, 0.75, 12)) < 1e-4, 'their car: at its nose (' + w.p.toArray().map(v => v.toFixed(2)) + ')'); }
  // turning the car turns the beam
  car.g.rotation.y = Math.PI; runR(0.1); { const w = worldR(); assert.ok(w.d.z > 0.99 && w.p.z > 12 + 2, 'turned round: the beam swings with it'); }
  // a flicker nearby stutters it too, and both beams can be on at once
  ctx.LIGHT.flK = 0.15; runR(0.05); assert.ok(worldR().I < 0.2 * ctx.VEHL.I, 'a flicker nearby: it stutters'); ctx.LIGHT.flK = 1;
  ctx.walk.drive = true; ctx.utv.g = {}; Object.assign(ctx.utv, { x: 10, y: 0, z: -20, a: 0 }); run(1); runR(1);
  assert.ok(U.csHl2.value.x > 0 && U.csHl5.value.x > 0, 'both beams light the same road when you both drive');
  ctx.walk.drive = false;
  // out of sight: past 120 m the far side of the plant is not lit for nothing
  car.g.position.set(-20, 0, 600); car.g.rotation.y = 0; ctx.NET.rp = { drive: true, car: [0, -20, 600, 0, 0] }; runR(0.1);
  assert.equal(U.csHl5.value.x, 0, 'their beam 590 m away is dropped');
  // they get out: off
  ctx.NET.rp = null; runR(1); assert.equal(U.csHl5.value.x, 0, 'they get out: their beam goes out');
  assert.equal(ctx.vehLightSourceRemote(), null, 'and there is no source to read');
  // the shader: its own three vectors, declared and used
  assert.ok(html.includes('csHl3: { value: new T.Vector4(0, 0, 0, 75) }') && html.includes('uniform vec4 csHl3; uniform vec4 csHl4; uniform vec4 csHl5;'), 'declared next to the first beam');
  const shR = cut('if (csHl5.r + csHl5.g > 0.0) {', 'return k;');
  assert.ok(shR.includes('smoothstep(csHl4.w, csHl5.w, dot(-l, csHl4.xyz))') && shR.includes('csHl5.rgb * (s * q * q / (d * d + 25.0) * w)'), 'and the same cone maths, on its own vectors');
  assert.ok(html.includes('  vehLightsRemote(U, dt);   // v1.97.178'), 'updated every frame beside your own'); }
console.log("PASS: vehicle headlights (Ranger, cars, mower: a beam from the nose along the heading, a little down; fades in and out with getting in and out; stutters with a flicker; a second spot in the lighting shader) and the other player's beam (their Ranger or their car, from the pose they already send, faded, culled past 120 m, its own spot in the shader)");
