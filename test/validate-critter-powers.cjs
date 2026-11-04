// Run from the test/ directory: node validate-critter-powers.cjs
// v1.97.113: critter powers and roofs you can stand on. Runs the game's own power, walking, jumping, falling, floor and wall
// code with three.js and small stand-ins: frog legs (twice the jump, landed safely), pigeon wings (6 flaps back on landing,
// hold jump to glide, no fall hurts), lizard grip (push into a wall to climb it, step onto the roof, let go and slide down),
// rat speed (1.5x and a wider view); 45 s, counting on in a vehicle, swapped by another critter, ended by death. The roof map:
// floorAt stands you on a roof 2 m up or more (coming down on it or a small step up, never popping up from below), and a wall
// line stops blocking above the top of its wall.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const roofDecl = cut('const ROOFMAP = {', '\n');
const floorSrc = cut('function floorAt(x0, z0, y) {', '// ---------- WATER RIPPLES');
const pushSrc = cut('function pushOut() {', 'function setWallsSolid(on) {');
const powerSrc = cut('// ---------- CRITTER POWERS (v1.97.113)', '// ---------- ROOF MAP (v1.97.113)');
const roofAtSrc = cut('function roofAt(x, z) {', '\n');
const moveSrc = cut('function walkMove(fwd, strafe, dt, run) {', '// semis and train cars are solid');
const jumpSrc = cut('function walkJump() {', '\n');
const physSrc = cut('function walkPhysics(dt) {', '// interact: whatever piece');
const notes = [];
const ctx = { T, Math, console, Infinity, walk: { on: true, dead: null, drive: false, mow: false, ride: null, x: 0, y: 0, z: 0, yaw: 0, vy: 0 }, WALK_SURF: [], LADDERS: [], DIGS: [], PONDS: { hole: 0 }, inPond: () => false,
  wallSegs: [], colliders: [], O: {}, NET: {}, utv: {}, vehPush() {}, BODY_R: 0.28, MOW: {}, CHUTE: { state: null }, chuteDeploy: () => false, rideOff() {}, onLadder: () => null, layBody() {},
  tsnd: { ctx: null }, DMG_NOTIFY: m => notes.push(m), flutter() {}, camera: { position: new T.Vector3() }, document: undefined, performance: { now: () => 0 } };
vm.createContext(ctx);
vm.runInContext(roofDecl + '\n' + floorSrc + '\n' + pushSrc + '\n' + powerSrc + '\n' + roofAtSrc + '\n' + moveSrc + '\n' + jumpSrc + '\n' + physSrc + `
  this.ROOFMAP = ROOFMAP; this.POWER = POWER; this.floorAt = floorAt; this.pushOut = pushOut; this.walkMove = walkMove; this.walkJump = walkJump; this.walkPhysics = walkPhysics;
  this.powerGive = powerGive; this.powerUpdate = powerUpdate; this.powerKindOf = powerKindOf; this.roofAt = roofAt;`, ctx);
const W = ctx.walk, P = ctx.POWER;
const settle = () => { for (let k = 0; k < 400; k++) ctx.walkPhysics(0.02); };
const peak = () => { let top = W.y; for (let k = 0; k < 600; k++) { ctx.walkPhysics(0.02); top = Math.max(top, W.y); } return top; };

// a building: 10 x 10 m, roof 8 m up, x 0..10, z 0..10; its four walls are wall lines. The roof map is a 0.5 m grid.
const nx = 60, nz = 60, h = new Float32Array(nx * nz).fill(-99);
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = -10 + i * 0.5, z = -10 + j * 0.5; if (x >= 0 && x < 10 && z >= 0 && z < 10) h[j * nx + i] = 8; }
Object.assign(ctx.ROOFMAP, { h, x0: -10, z0: -10, cell: 0.5, nx, nz });
ctx.wallSegs.push([0, 0, 10, 0], [10, 0, 10, 10], [10, 10, 0, 10], [0, 10, 0, 0]);
ctx.ROOFMAP.tops = new Float32Array([8, 8, 8, 8]);

// the roof map in floorAt
assert.equal(ctx.roofAt(5, 5), 8); assert.equal(ctx.roofAt(-5, 5), -99);
assert.equal(ctx.floorAt(5, 5, 0), 0, 'inside the building (on its floor) the roof overhead is not your floor');
assert.equal(ctx.floorAt(5, 5, 7.8), 8, 'a small step up onto it');
assert.equal(ctx.floorAt(5, 5, 9), 8, 'coming down onto it from above');
ctx.ROOFMAP.h[ctx.ROOFMAP.nx * 30 + 5] = 1.4; assert.equal(ctx.floorAt(-7.5, 5, 1.2), 0, 'low clutter (under 2 m) is left to the walls and surfaces it always had'); ctx.ROOFMAP.h[ctx.ROOFMAP.nx * 30 + 5] = -99;
// walls stop at their tops
W.x = -0.1; W.z = 5; W.y = 0; ctx.pushOut(); assert.ok(W.x <= -0.27, 'at the foot of the wall it blocks');
W.x = -0.1; W.z = 5; W.y = 8.0; ctx.pushOut(); assert.equal(W.x, -0.1, 'up at the top of the wall you can step over it onto the roof');
{ const keep = ctx.ROOFMAP.tops; ctx.ROOFMAP.tops = null; W.x = -0.1; W.y = 30; ctx.pushOut(); assert.ok(W.x <= -0.27, 'no roof map: walls block at any height, as before'); ctx.ROOFMAP.tops = keep; }

// no power: a normal jump, and a fall from the roof is fatal as always
W.x = -5; W.z = 5; W.y = 0; W.vy = 0; W.floor = 0; settle(); ctx.walkJump(); const j0 = peak(); assert.ok(j0 > 1.6 && j0 < 2, 'normal jump ~1.8 m (' + j0.toFixed(2) + ')');
// frog legs: twice as high, and you land it
assert.match(ctx.powerGive('frog'), /Frog legs! Jump twice as high \(45 s\)/); assert.equal(P.t, 45);
ctx.walkJump(); const j1 = peak(); assert.ok(j1 > 3.4 && j1 < 3.8 && !W.dead, 'frog jump ~3.6 m, landed safely (' + j1.toFixed(2) + ')');

// rat speed: 1.5x, wider view while sprinting
ctx.powerGive('rat'); W.x = -5; W.z = -5; W.yaw = Math.PI / 2;   // facing -x
ctx.walkMove(1, 0, 0.1, true); assert.ok(Math.abs(W.x - (-5 - 17.01 * 1.5 * 0.1)) < 1e-6, 'sprint 1.5x (' + W.x.toFixed(3) + ')');
for (let k = 0; k < 40; k++) { ctx.walkMove(1, 0, 0.02, true); ctx.powerUpdate(0.02); } assert.ok(P.fov > 6, 'the view widens at rat speed (' + P.fov.toFixed(1) + ')');
for (let k = 0; k < 80; k++) ctx.powerUpdate(0.02); assert.ok(P.fov < 1, 'and settles back when you stop');

// lizard grip: walk into the west wall, climb it, step onto the roof
ctx.powerGive('lizard'); W.x = -1; W.z = 5; W.y = 0; W.vy = 0; W.yaw = -Math.PI / 2;   // facing +x, toward the wall
let k = 0; for (; k < 600 && !(W.floor >= 8 && W.y === 8); k++) { ctx.walkMove(1, 0, 0.03, false); ctx.walkPhysics(0.03); }
assert.ok(W.y === 8 && W.floor === 8 && W.x > 0 && !W.dead, 'up the wall and onto the roof (' + k + ' steps, x ' + W.x.toFixed(2) + ')');
for (let i = 0; i < 12; i++) { ctx.walkMove(1, 0, 0.03, false); ctx.walkPhysics(0.03); } assert.equal(W.y, 8, 'walking across the roof'); assert.ok(W.x > 3 && W.x < 10);
// half way up, let go: you slide down gently, alive
W.x = -1; W.z = 5; W.y = 0; for (let i = 0; i < 70; i++) { ctx.walkMove(1, 0, 0.03, false); ctx.walkPhysics(0.03); }
const mid = W.y; assert.ok(mid > 3 && mid < 7.5, 'half way up (' + mid.toFixed(2) + ')');
for (let i = 0; i < 10; i++) ctx.walkPhysics(0.03); assert.ok(Math.abs(W.y - mid) < 0.01, 'holding on for a moment when you stop pushing');
for (let i = 0; i < 400; i++) ctx.walkPhysics(0.03); assert.ok(W.y === 0 && !W.dead, 'then a gentle slide down to the ground');
// open ground: pushing forward never climbs
W.x = -8; W.z = -8; W.y = 0; W.yaw = Math.PI; for (let i = 0; i < 30; i++) { ctx.walkMove(1, 0, 0.03, false); ctx.walkPhysics(0.03); } assert.equal(W.y, 0, 'nothing to climb, no climbing');

// pigeon wings: flaps in the air (6, back on landing), glide while jump is held, no fall can hurt
ctx.powerGive('pigeon'); W.x = -5; W.z = -5; W.y = 0; W.vy = 0; settle(); assert.equal(P.flaps, 6);
ctx.walkJump(); let top = 0; for (let i = 0; i < 300; i++) { if (i % 25 === 20) ctx.walkJump(); ctx.walkPhysics(0.02); top = Math.max(top, W.y); }
assert.equal(P.flaps, 0, 'six flaps'); assert.ok(top > 5, 'flapping gets you well up (' + top.toFixed(1) + ' m)');
W.y = 20; W.vy = 0; ctx.POWER.jump = true; let n = 0; while (W.y > 0 && n++ < 3000) { ctx.walkPhysics(0.02); assert.ok(W.vy >= -1.61, 'gliding down, never faster than 1.6 m/s'); }
assert.ok(n > 500 && !W.dead, 'a slow glide (' + (n * 0.02).toFixed(1) + ' s) and a safe landing'); ctx.POWER.jump = false;
ctx.powerUpdate(0.02); assert.equal(P.flaps, 6, 'flaps back on landing');
W.y = 20; W.vy = 0; settle(); assert.ok(!W.dead, 'even a plain fall from 20 m is safe with pigeon wings');

// the clock: 45 s, keeps going in a vehicle, another critter swaps it, the same one restarts it, it wears off, death ends it
ctx.powerGive('rat'); W.drive = true; for (let i = 0; i < 100; i++) ctx.powerUpdate(0.2); assert.ok(Math.abs(P.t - 25) < 1e-6 && P.kind === 'rat', 'counts on while driving (' + P.t.toFixed(1) + ' s left)');
W.drive = false; ctx.powerGive('rat'); assert.equal(P.t, 45, 'eating another rat restarts it'); ctx.powerGive('frog'); assert.equal(P.kind, 'frog', 'another critter swaps it');
for (let i = 0; i < 230; i++) ctx.powerUpdate(0.2); assert.equal(P.kind, null, 'worn off after 45 s'); assert.ok(notes.some(m => /Frog legs wore off/.test(m)));
ctx.powerGive('lizard'); W.dead = 'fall'; ctx.powerUpdate(0.02); assert.equal(P.kind, null, 'dying ends it'); W.dead = null;
// which critter gives which power
assert.equal(ctx.powerKindOf({ kind: 'rat' }), 'rat'); assert.equal(ctx.powerKindOf({ kind: 'lizard' }), 'lizard'); assert.equal(ctx.powerKindOf({ group: {} }), 'frog'); assert.equal(ctx.powerKindOf({ wl: {} }), 'pigeon');

// wiring
assert.ok(html.includes("critNetEat(h.o); powerGive(powerKindOf(h.o), 'You ate the ' + h.nm + '. ');"), 'eating a critter gives its power');
assert.ok(html.includes("stepSafe('powerSim', () => powerUpdate(dt));"), 'the power clock runs every frame (driving or not), under its own guard label');
assert.ok(html.includes('P3.jumpHold(!!(pad.held.A || kb.space || jumpBtnHeld));'), 'holding jump (A, Space or the touch button) is passed in for gliding');
assert.ok(html.includes("if (!ROOFMAP.h) { try { roofMapBuild(); } catch (e) { console.warn('roof map', e); } ROOFMAP.again = 12; }"), 'the roof map is built when you start walking, and again once the late models are in');
assert.ok(html.includes('const f = 42 + POWER.fov - 12 * aimK;'), 'the rat view widening reaches the camera');
{ const rm = cut('function roofMapMeshes() {', 'function roofMapBuild() {');
  for (const k of ['vehicles', 'train.cars', 'THRUS', 'birds', 'critters', 'pondFrogs', 'CORN_PROPS_STATE', 'NPCS', 'O.cars', 'CREEP.list', 'utv.g', 'O.shedMower', 'NET.rp', 'SKY.dome', 'VULT.s', 'bodies']) assert.ok(rm.includes(k), 'the roof map leaves out moving things: ' + k);
  assert.ok(rm.includes('m.transparent && m.opacity < 0.95') && rm.includes('!o.isInstancedMesh'), 'and see-through things and the corn'); }
// a roof map that cannot build must say so: roof collision and the lizard climb silently never work without it
assert.ok(html.includes("PERF.err = 'roofmap';"), 'a failed roof-map rebuild is reported on the fps line, not swallowed');

// the roof map is a collision grid, not a picture: 1024 cells an axis and no cell under 1 m keeps it a few MB
assert.ok(html.includes('maxTex = Math.min(1024, renderer.capabilities.maxTextureSize || 1024);'), 'the roof map is capped at 1024 cells an axis');
assert.ok(html.includes('const cell = Math.max(1.0, W / maxTex, D / maxTex)'), 'and no cell is finer than 1 m, so a far-flung roof cannot inflate it');
assert.ok(html.includes('renderer.info.render.calls = iC; renderer.info.render.triangles = iT;'), 'the roof map keeps its own pass out of the fps readout');

console.log('PASS: critter powers (frog jump + safe landing, pigeon flaps / glide / safe falls, lizard climb onto the roof and gentle slide, rat speed + wider view; 45 s, counts on in a vehicle, swap, wear off, death) and roofs you can stand on (roof map in floorAt, walls stop at their tops)');
