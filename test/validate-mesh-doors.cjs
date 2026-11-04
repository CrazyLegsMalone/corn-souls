// Run from the test/ directory: node validate-mesh-doors.cjs
// v1.97.137, owner: "Can we add a mesh door to all rolling doors. The mesh door should be on the interior. With an interactive
// switch next to the door with the option to open both close both or only close mesh". Runs the game's own rollUpDoor,
// meshDoorsBuild, rollDoorStep and rollSwitchSet: a mesh on the inside face of every roll-up, a switch beside it, and the
// three choices driving both doors (and their collision lines); no power, no hoist; door states travel in the world sync.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const src = cut('function rollUpDoor(cx, cz, alongX, w, h, opt) {', '// a plain man door that vanishes');
const ENCL = [{ x0: 0, x1: 20, z0: 0, z1: 20, top: 8, area: 400 }];   // one building: x 0..20, z 0..20
const sent = [];
const ctx = { T, Math, document: undefined, scene: new T.Scene(), wallSegs: [], O: { swingDoors: [] }, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), mat: c => new T.MeshLambertMaterial({ color: c }), srgbTex: t => t,
  enclAt: (x, y, z) => ENCL.find(e => x >= e.x0 && x <= e.x1 && z >= e.z0 && z <= e.z1 && y <= e.top) || null,
  POWER_OUTAGE: { on: false }, walk: { on: true, x: 0, y: 0, z: 0 }, NET: { conn: null }, netSend: m => sent.push(m), wsLock() {} };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.rollUpDoor = rollUpDoor; this.meshDoorsBuild = meshDoorsBuild; this.rollDoorStep = rollDoorStep; this.rollSwitchNear = rollSwitchNear; this.rollSwitchSet = rollSwitchSet; this.rollStates = rollStates; this.rollApply = rollApply;', ctx);
// two doors in the building's walls: east wall (x 20, wall along z; hood outside), north wall (z 0, wall along x; hood inside)
const A = ctx.rollUpDoor(20, 10, false, 3, 3.5, { side: 1 }), B = ctx.rollUpDoor(10, 0, true, 4, 4, { side: -1 });
ctx.scene.updateMatrixWorld(true);
assert.equal(ctx.meshDoorsBuild(), 2, 'a mesh door for every roll-up');
assert.equal(ctx.meshDoorsBuild(), 0, 'built once');
const wp = o => o.getWorldPosition(new T.Vector3());
{ const m = wp(A.mesh); assert.ok(m.x < 20 && m.x > 19.5, 'east door: the mesh is on the inside (west) face, just inside the steel door (x ' + m.x.toFixed(2) + ')'); }
{ const m = wp(B.mesh); assert.ok(m.z > 0.8, 'north door: the mesh is on the inside (south) face, clear of the coil hood on that face (z ' + m.z.toFixed(2) + ')'); }
for (const d of [A, B]) {
  assert.ok(d.sw && Math.hypot(d.sw.x - d.x, d.sw.z - d.z) > d.w / 2 + 0.3, 'a switch beside the door, not in the opening');
  assert.ok(ctx.enclAt(d.sw.x, 1.4, d.sw.z), 'the switch is on the inside');
  assert.ok(Math.abs(d.sw.y - 1.35) < 1e-6, 'at hand height');
  assert.ok(ctx.wallSegs.includes(d.seg) && ctx.wallSegs.includes(d.mseg), 'both the steel door and the mesh are collision lines');
}
const run = s => { for (let i = 0; i < s * 60; i++) for (const d of [A, B]) ctx.rollDoorStep(d, 1 / 60); };
const blocked = seg => seg[0] < 1e4;
// both start shut, and nothing opens just by walking up any more
ctx.walk.x = 19; ctx.walk.z = 10; run(3);
assert.ok(A.open === 0 && A.mo === 0 && blocked(A.seg) && blocked(A.mseg), 'shut until the switch says otherwise (no walk-up opening)');
// at the switch
ctx.walk.x = A.sw.x - 0.6; ctx.walk.z = A.sw.z; assert.equal(ctx.rollSwitchNear(), 0, 'standing at the east door switch');
ctx.walk.x = 50; assert.equal(ctx.rollSwitchNear(), -1, 'out of reach'); ctx.walk.x = A.sw.x - 0.6;
assert.match(ctx.rollSwitchSet(0, 'open'), /going up/); run(3);
assert.ok(A.open === 1 && A.mo === 1 && !blocked(A.seg) && !blocked(A.mseg), 'open both: door and mesh up, the way is clear');
assert.equal(B.open, 0, 'the other door does not move');
assert.match(ctx.rollSwitchSet(0, 'mesh'), /Mesh coming down/); run(2);
assert.ok(A.open === 1 && A.mo === 0 && !blocked(A.seg) && blocked(A.mseg), 'close the mesh only: the door stays up, the mesh shuts and blocks');
assert.ok(A.mesh.visible && A.mesh.scale.y === 1, 'the mesh hangs full height');
assert.match(ctx.rollSwitchSet(0, 'close'), /coming down/); run(3);
assert.ok(A.open === 0 && A.mo === 0 && blocked(A.seg) && blocked(A.mseg), 'close both');
// no power, no hoist
ctx.POWER_OUTAGE.on = true; assert.match(ctx.rollSwitchSet(0, 'open'), /no power/); run(2); assert.equal(A.open, 0, 'dead plant: the switch does nothing');
ctx.rollSwitchSet(0, 'open', true); ctx.POWER_OUTAGE.on = false; run(3); assert.equal(A.open, 1, 'power back: it finishes what it was told');
// 2 player: a press is sent, and the states round-trip through the world sync
ctx.NET.conn = {}; ctx.rollSwitchSet(1, 'open'); assert.equal(JSON.stringify(sent.pop()), JSON.stringify({ t: 'rd', i: 1, s: 1, m: 1 }), 'a press goes to the other player at once');
ctx.rollSwitchSet(1, 'mesh'); const st = ctx.rollStates(); assert.equal(st, '31', 'door 0 open with its mesh, door 1 open with its mesh shut');
ctx.rollApply('00'); assert.ok(A.ws === 0 && A.wm === 0 && B.ws === 0, 'the host\'s states apply'); ctx.rollApply(st); assert.equal(ctx.rollStates(), st, 'round trip');
// a building with no envelope and no wall beside its door (the storage shed): it says which side is inside and where the switch goes
{ const S = ctx.rollUpDoor(60, 5, false, 3, 2.2, { y0: 0.25, side: 1, inside: -1, swAt: [58.4, 6.7, 0, -1] }); ctx.scene.updateMatrixWorld(true); ctx.meshDoorsBuild();
  assert.ok(wp(S.mesh).x < 60, 'shed: the mesh is on the inside (west) face though the hood is outside');
  assert.ok(Math.abs(S.sw.x - 58.4) < 1e-6 && Math.abs(S.sw.z - 6.7) < 1e-6 && Math.abs(S.sw.y - 1.6) < 1e-6, 'shed: its switch where the building put it, at hand height off its raised floor');
  assert.ok(html.includes('inside: -1, swAt: [X1 - 1.6, Z1 - 0.12, 0, -1]'), 'the storage shed uses that'); }
// wiring in the game
assert.ok(html.includes('exitSignsForEgress(); meshDoorsBuild(); lightBuild();'), 'built with the world, once the building envelopes are known');
assert.ok(html.includes('for (const d of O.rollDoors || []) rollDoorStep(d, dt);'), 'every frame the doors follow their switch');
assert.ok(html.includes("if (P3.rollSwitchNear() >= 0) { rollSwitchMenu(); return; }"), 'X / E / the hand button at a switch opens its menu');
assert.ok(/\['⬆ Open both \(door \+ mesh\)', go\('open'\)\], \['⬇ Close both', go\('close'\)\], \['▦ Close the mesh only', go\('mesh'\)\]/.test(html), 'the three choices the owner asked for');
assert.ok(html.includes("return { t: 'ws', rd: rollStates(),") && html.includes('if (L.rd <= 0 && m.rd) rollApply(m.rd);') && html.includes("} else if (m.t === 'rd') {"), 'synced in 2 player');
console.log('PASS: every roll-up gets a mesh door on its inside face and a switch beside it: open both / close both / close the mesh only, collision follows, no power no hoist, synced in 2 player');
