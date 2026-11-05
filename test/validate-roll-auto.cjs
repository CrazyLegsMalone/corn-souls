// Run from the test/ directory: node validate-roll-auto.cjs
// v1.97.175, owner (HANDOFF_CLINE.md section 7, "roll-up doors open automatically for vehicles?" - answered yes). Runs the game's own
// rollUpDoor, meshDoorsBuild, rollDoorStep, rollSwitchSet and the new rollAutoStep: driving at a roll-up from its outside face within
// 12 m sends it up through the same switch the green button uses (so the other player gets the same 'rd' message), and nothing else
// does - not walking, not the inside face, not driving away or past it, not out of range, not in a power outage. It never closes it.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const src = cut('function rollUpDoor(cx, cz, alongX, w, h, opt) {', '// a plain man door that vanishes');
assert.ok(src.includes('function rollAutoStep() {'), 'rollAutoStep exists next to the door switch code');

const ENCL = [{ x0: 0, x1: 20, z0: 0, z1: 20, top: 8, area: 400 }];   // one building: x 0..20, z 0..20
const sent = [];
const ctx = { T, Math, document: undefined, scene: new T.Scene(), wallSegs: [], O: { swingDoors: [] }, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), mat: c => new T.MeshLambertMaterial({ color: c }), srgbTex: t => t,
  enclAt: (x, y, z) => ENCL.find(e => x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1 && y <= e.top) || null,
  POWER_OUTAGE: { on: false }, walk: { on: true, dead: null, drive: false, x: 0, y: 0, z: 0 }, utv: { x: 0, y: 0, z: 0, vx: 0, vz: 0 },
  NET: { conn: { open: true } }, netSend: m => sent.push(m), locks: 0, camera: new T.PerspectiveCamera(70, 1, 0.1, 100), gunClick() {} };
ctx.wsLock = () => { ctx.locks++; };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.rollUpDoor = rollUpDoor; this.meshDoorsBuild = meshDoorsBuild; this.rollDoorStep = rollDoorStep; this.rollSwitchSet = rollSwitchSet; this.rollAutoStep = rollAutoStep;', ctx);

// east wall door (x 20, wall along z, outside is +x) and north wall door (z 0, wall along x, outside is -z)
const A = ctx.rollUpDoor(20, 10, false, 3, 3.5, { side: 1 }), B = ctx.rollUpDoor(10, 0, true, 4, 4, { side: -1 });
ctx.scene.updateMatrixWorld(true);
assert.equal(ctx.meshDoorsBuild(), 2, 'both doors have their mesh');
const run = s => { for (let i = 0; i < s * 60; i++) { ctx.rollAutoStep(); for (const d of [A, B]) ctx.rollDoorStep(d, 1 / 60); } };
const shut = () => { ctx.utv.vx = ctx.utv.vz = 0; for (const [i] of [A, B].entries()) ctx.rollSwitchSet(i, 'close'); run(6); assert.ok(A.open === 0 && B.open === 0, 'both shut again'); sent.length = 0; ctx.locks = 0; };
const drive = (x, z, vx, vz) => { Object.assign(ctx.utv, { x, z, vx, vz }); Object.assign(ctx.walk, { x, z }); };
const isOpen = d => d.ws === 1 && d.wm === 1;

// on foot, standing right outside: nothing (doors still only open from the switch on foot)
ctx.walk.drive = false; drive(24, 10, -5, 0); run(1);
assert.ok(!isOpen(A) && A.open === 0, 'walking up to a roll-up does not open it');

// driving at the east door from outside, 10 m out: it goes up - door and mesh, like the green button
ctx.walk.drive = true; drive(30, 10, -6, 0);
assert.equal(ctx.rollAutoStep(), 0, 'the east door is the one it opens');
assert.ok(isOpen(A), 'both targets set, the same as the green button');
assert.equal(sent.length, 1, 'one message to the other player, not one per frame');
assert.equal(JSON.stringify(sent[0]), JSON.stringify({ t: 'rd', i: 0, s: 1, m: 1 }), 'the same rd message the switch sends');
assert.equal(ctx.locks, 1, 'and the same world-sync lock');
assert.ok(!isOpen(B), 'the other door is left alone');
run(1); assert.equal(sent.length, 1, 'an open door is not asked again');
run(2); assert.ok(A.open === 1 && A.mo === 1 && A.seg[0] > 1e4 && A.mseg[0] > 1e4, 'it really rolls up and stops blocking');

// never auto-closes: drive away, wait
drive(40, 10, 8, 0); run(5);
assert.ok(isOpen(A) && A.open === 1, 'it never closes on its own');
shut();

// the north door, approached from outside (-z) at an angle: opens
drive(6, -9, 2, 6); run(0.1);
assert.ok(isOpen(B), 'north door opens for a vehicle coming in at an angle from outside');
shut();

// from the inside face: no
drive(14, 10, 6, 0); run(1);
assert.ok(!isOpen(A), 'driving at it from inside the building does not open it');
// driving away from it outside: no
drive(26, 10, 6, 0); run(1);
assert.ok(!isOpen(A), 'driving away from it does not open it');
// driving along the wall past it: no
drive(23, 4, 0, 8); run(0.3);
assert.ok(!isOpen(A), 'driving past along the wall does not open it');
// out of range: no
drive(33, 10, -6, 0); run(0.1);
assert.ok(!isOpen(A), 'more than 12 m out it stays shut');
// rolling slower than 1 m/s: no
drive(28, 10, -0.5, 0); run(1);
assert.ok(!isOpen(A), 'a vehicle barely creeping does not open it');
// a different level (a door up on a dock, say): no
drive(28, 10, -6, 0); ctx.utv.y = 5; run(0.1); ctx.utv.y = 0;
assert.ok(!isOpen(A), 'a vehicle far above or below it does not open it');
assert.equal(sent.length, 0, 'none of that sent anything');

// power outage: blocked like the switch
ctx.POWER_OUTAGE.on = true; drive(28, 10, -6, 0); run(1);
assert.ok(!isOpen(A) && A.open === 0, 'no power, no door');
ctx.POWER_OUTAGE.on = false; run(0.1);
assert.ok(isOpen(A), 'power back, still driving at it: it opens');
shut();

// door up but mesh down (yellow): driving at it raises the mesh too, so you can drive through
ctx.rollSwitchSet(0, 'mesh'); run(3); sent.length = 0;
drive(28, 10, -6, 0); run(0.1);
assert.ok(isOpen(A), 'a door left on yellow (mesh down) gets its mesh raised too');
shut();

// dead driver: no
ctx.walk.dead = 'x'; drive(28, 10, -6, 0); run(0.5); ctx.walk.dead = null;
assert.ok(!isOpen(A), 'nothing while dead');

// wiring: the frame loop runs it every frame, before the doors follow their switch, inside stepSafe
const loopLine = '  stepSafe(\'rollAuto\', rollAutoStep);\n  for (const d of O.rollDoors || []) rollDoorStep(d, dt);';
assert.ok(html.includes(loopLine), 'rollAutoStep runs every frame right before the doors step');
const engine = scripts.find(s => s.includes('function rollAutoStep() {'));
assert.ok(engine && engine.includes(loopLine), 'and from the engine block that declares it (no cross-block reference)');

console.log('roll-up doors open automatically for vehicles: ok');
