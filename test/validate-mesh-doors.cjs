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
  POWER_OUTAGE: { on: false }, walk: { on: true, x: 0, y: 0, z: 0 }, NET: { conn: null }, netSend: m => sent.push(m), wsLock() {}, camera: new T.PerspectiveCamera(70, 1, 0.1, 100), clicks: 0 };
ctx.gunClick = () => { ctx.clicks++; };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.rollUpDoor = rollUpDoor; this.meshDoorsBuild = meshDoorsBuild; this.rollDoorStep = rollDoorStep; this.rollSwitchNear = rollSwitchNear; this.rollSwitchSet = rollSwitchSet; this.rollStates = rollStates; this.rollApply = rollApply; this.rollButtonAim = rollButtonAim; this.rollButtonPress = rollButtonPress; this.ROLLBTN = ROLLBTN;', ctx);
// two doors in the building's walls: east wall (x 20, wall along z; hood outside), north wall (z 0, wall along x; hood inside)
const A = ctx.rollUpDoor(20, 10, false, 3, 3.5, { side: 1 }), B = ctx.rollUpDoor(10, 0, true, 4, 4, { side: -1 });
ctx.scene.updateMatrixWorld(true);
assert.equal(ctx.meshDoorsBuild(), 2, 'a mesh door for every roll-up');
assert.equal(ctx.meshDoorsBuild(), 0, 'built once');
const wp = o => o.getWorldPosition(new T.Vector3());
{ const m = wp(A.mesh); assert.ok(m.x < 20 && m.x > 19.5, 'east door: the mesh is on the inside (west) face, just inside the steel door (x ' + m.x.toFixed(2) + ')'); }
{ const m = wp(B.mesh); assert.ok(m.z > 0.3 && m.z < 0.45, 'north door: the mesh is on the inside (south) face, flush at the wall (z ' + m.z.toFixed(2) + ')'); }
// v1.97.139, owner: "original rolling door with mesh both are flush. new ones it has a huge gap" - every mesh sits at the wall; a coil
// hood on the same face goes up over the mesh's head box (like the original, whose coil sat above it)
for (const d of [A, B]) assert.ok(Math.abs(Math.abs(d.mesh.parent.position.x) - 0.36) < 1e-9, 'flush: 0.36 m in from the wall line');
assert.ok(B.hood.position.y - 0.34 > B.h + 0.48, 'north door: its inside coil hood clears the mesh head box (hood bottom ' + (B.hood.position.y - 0.34).toFixed(2) + ' > ' + (B.h + 0.48).toFixed(2) + ')');
assert.ok(B.hood.position.y + 0.34 < 8 - 0.3, 'and stays under the building\'s roof');
assert.equal(A.hood.position.y, A.h + 0.42, 'a hood outside stays where it was');
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
assert.match(ctx.rollSwitchSet(0, 'mesh'), /Door up, mesh down/); run(2);
assert.ok(A.open === 1 && A.mo === 0 && !blocked(A.seg) && blocked(A.mseg), 'yellow: the door stays up, the mesh shuts and blocks');
assert.ok(A.mesh.visible && A.mesh.scale.y === 1, 'the mesh hangs full height');
assert.match(ctx.rollSwitchSet(0, 'close'), /coming down/); run(3);
assert.ok(A.open === 0 && A.mo === 0 && blocked(A.seg) && blocked(A.mseg), 'close both');
// v1.97.141, owner: "pressing the yellow should open the door if the door is closed ... mesh closed rolling door open"
ctx.rollSwitchSet(0, 'mesh'); run(3);
assert.ok(A.open === 1 && A.mo === 0 && !blocked(A.seg) && blocked(A.mseg), 'yellow from both shut: the rolling door goes up, the mesh stays shut');
ctx.rollSwitchSet(0, 'close'); run(3);
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
// v1.97.138, owner: "make the three buttons a little bigger ... green button on top (opens door and mesh), middle yellow button (mesh
// closed only), red button on bottom (both closed). dont pull up a toast to select simply do the action when the button is activated"
{ const bt = ctx.ROLLBTN.filter(b => b.i === 0), y = m => bt.find(b => b.mode === m).m.getWorldPosition(new T.Vector3()).y;
  assert.deepEqual(bt.map(b => b.mode).join(), 'open,mesh,close', 'three buttons on each switch');
  assert.ok(y('open') > y('mesh') && y('mesh') > y('close'), 'green (open both) on top, yellow (mesh only) in the middle, red (close both) at the bottom');
  assert.ok(bt.every(b => b.m.geometry.parameters.radiusTop >= 0.045), 'bigger buttons (was 3 cm, now 4.8 cm)');
  assert.equal(bt.find(b => b.mode === 'open').m.material.color.getHex(), 0x2e9e4a, 'green'); assert.equal(bt.find(b => b.mode === 'mesh').m.material.color.getHex(), 0xe0b020, 'yellow'); assert.equal(bt.find(b => b.mode === 'close').m.material.color.getHex(), 0xc8312a, 'red');
  // stand 0.9 m inside the east door's switch and look at each button: interact does exactly that button, at once
  const cam = ctx.camera; ctx.walk.x = A.sw.x - 0.9; ctx.walk.z = A.sw.z; ctx.POWER_OUTAGE.on = false; ctx.rollApply('00'); ctx.NET.conn = null;
  const look = m => { const w = bt.find(b => b.mode === m).m.getWorldPosition(new T.Vector3()); cam.position.set(ctx.walk.x, 1.6, ctx.walk.z); cam.lookAt(w); cam.updateMatrixWorld(true); };
  for (const [m, want] of [['open', [1, 1]], ['mesh', [1, 0]], ['close', [0, 0]], ['mesh', [1, 0]], ['close', [0, 0]], ['open', [1, 1]]]) {
    look(m); const a = ctx.rollButtonAim(); assert.ok(a && a.i === 0 && a.mode === m, 'aiming at ' + m + ' picks it');
    assert.equal(ctx.rollButtonPress(), '', m + ': done at once, nothing to read'); assert.deepEqual([A.ws, A.wm], want, m + ': door / mesh targets'); }
  assert.ok(ctx.clicks >= 4, 'each press clicks');
  cam.lookAt(ctx.walk.x - 5, 1.6, ctx.walk.z); cam.updateMatrixWorld(true); assert.equal(ctx.rollButtonAim(), null, 'looking away: no button'); assert.equal(ctx.rollButtonPress(), null, 'and interact falls through to other things');
  ctx.walk.x = A.sw.x - 4; look('open'); assert.equal(ctx.rollButtonAim(), null, 'out of arm\'s reach: no button');
  ctx.walk.x = A.sw.x - 0.9; look('close'); ctx.POWER_OUTAGE.on = true; assert.match(ctx.rollButtonPress(), /no power/, 'dead plant: it says why'); ctx.POWER_OUTAGE.on = false; }
// wiring in the game
assert.ok(html.includes('exitSignsForEgress(); meshDoorsBuild(); lightBuild();'), 'built with the world, once the building envelopes are known');
assert.ok(html.includes('for (const d of O.rollDoors || []) rollDoorStep(d, dt);'), 'every frame the doors follow their switch');
assert.ok(html.includes("{ const r = P3.rollButtonPress(); if (r !== null) { if (r) toast(r); return; } }"), 'X / E / the hand button on a switch button does it at once');
assert.ok(!html.includes('function rollSwitchMenu'), 'no menu to pick from any more');
assert.ok(html.includes('<div id="iprompt">') && html.includes('<circle cx="4.5" cy="12" r="3.6" fill="#fff"/>') && html.includes('P3.rollButtonAim()'), 'an Interact prompt with the west face button (filled) shows while a button is under the crosshair');
assert.ok(html.includes('<span>Interact</span></div>') && !html.includes("querySelector('small').textContent"), 'just "Interact" - no action text (v1.97.140, owner: the colours are enough)');
assert.ok(html.includes("return { t: 'ws', rd: rollStates(),") && html.includes('if (L.rd <= 0 && m.rd) rollApply(m.rd);') && html.includes("} else if (m.t === 'rd') {"), 'synced in 2 player');
console.log('PASS: every roll-up gets a mesh door on its inside face and a switch beside it: open both / close both / door open with the mesh closed, collision follows, no power no hoist, synced in 2 player');
