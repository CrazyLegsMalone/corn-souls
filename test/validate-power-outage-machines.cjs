// Run from repository root: node test/validate-power-outage-machines.cjs
// Covers what an outage does to the machinery: the plant model stops dead (conveyors, pumps, mills, RTO), the unit
// readouts say so, and the center-pivot diesel gen-set keeps running on its own fuel until the day tank runs dry.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('test/game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

// ---------------------------------------------------------------- the plant model stops dead with no power
{
  const model = scripts.find(x => x.includes('function stepH(s, dt)'));
  assert.ok(model, 'found the plant model script');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(model, ctx);
  const Sim = ctx.Sim;
  assert.ok(Sim && Sim.create && Sim.step && Sim.status, 'the plant model exports Sim');

  const s = Sim.create();
  const snap = { t: s.t, st1: s.st1.L, st2: s.st2.L, liq: s.liq.L, ferm: s.ferm[0].bu };

  s.power = true;                       // the grid is down
  Sim.step(s, 30);
  assert.equal(s.t, snap.t, 'the plant clock stops');
  assert.equal(s.st1.L, snap.st1, 'slurry tank 1 does not move');
  assert.equal(s.st2.L, snap.st2, 'slurry tank 2 does not move');
  assert.equal(s.liq.L, snap.liq, 'the liq tank does not move');
  assert.equal(s.ferm[0].bu, snap.ferm, 'no fermenter is fed');
  assert.ok(s.mills.every(m => m.rate === 0), 'every mill reads zero');
  assert.equal(s.conveyor, 0, 'the silo conveyor reads zero');
  assert.equal(s.recvRail, 0, 'the train is not unloading');
  assert.equal(s.recvTruck, 0, 'no trucks are dumping');
  assert.equal(s.blend.flow, 0, 'the blender is not fed');
  assert.equal(s.st1.out, 0, 'the slurry pumps are dead');
  assert.equal(s.cook.out, 0, 'cooking is dead');
  assert.equal(s.liq.out, 0, 'the liq pumps are dead');
  assert.equal(s.out.corn, 0, 'nothing is ground');
  const st = Sim.status(s, 'mill0');
  assert.equal(st[0], 'bad', 'the readout turns bad');
  assert.ok(/No power/.test(st[1]), 'the readout says there is no power: ' + st[1]);

  s.power = false;                      // power comes back
  s.sp.mill0.rate = s.sp.mill1.rate = 425;   // pin the setpoints and give the mills corn and room, so the
  s.st1.L = 50; s.day[0].L = s.day[1].L = 100;   // check does not depend on where the settle left the plant
  Sim.step(s, 30);
  assert.ok(s.t > snap.t, 'the plant clock runs again');
  assert.ok(s.mills.some(m => m.rate > 0), 'the mills come back up');
  assert.ok(!/No power/.test(Sim.status(s, 'mill0')[1]), 'and the readout recovers');
}

// ---------------------------------------------------------------- the pivot's own diesel engine
{
  const a = html.indexOf('function updatePivot(dt) {'), b = html.indexOf('// ---------- HAND TOOLS');
  assert.ok(a > 0 && b > a, 'found the pivot code');
  const ctx = {
    O: { pivot: { g: { rotation: { y: 0 } }, sheets: [{ visible: true }, { visible: true }], water: [{ offset: { y: 0 } }] } },
    PIVOT_GEN: { x: 0, z: 0, r: 2.8, fuel: 120, cap: 120, burn: 1.2, running: true, lamp: { material: { color: { setHex() {} } } } },
    CAN: { cap: 20, charge: 20 },
    PIVOT_NOTIFY: null,
    walk: { on: false }
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b), ctx);
  const G = ctx.PIVOT_GEN, C = ctx.CAN, P = ctx.O.pivot;

  ctx.updatePivot(1);                                     // one second: the water picture scrolls
  assert.ok(P.water[0].offset.y > 0, 'the water scrolls while the engine runs');
  ctx.updatePivot(3599);                                  // and an hour of running burns the diesel
  assert.ok(Math.abs(G.fuel - 118.8) < 1e-6, 'it sips 1.2 L an hour, got ' + G.fuel);
  assert.ok(P.g.rotation.y < 0, 'and the arm turns');

  // the plant outage does not touch it: the pivot runs on its own diesel
  G.fuel = 0.5;
  let told = null; ctx.PIVOT_NOTIFY = m => { told = m; };
  ctx.updatePivot(3600);                                  // runs the tank dry
  assert.equal(G.running, false, 'it stops when the tank runs dry');
  assert.ok(told && /diesel/i.test(told), 'and the player is told: ' + told);
  const rot = P.g.rotation.y;                             // from here the arm must not move again
  ctx.updatePivot(60);
  assert.equal(P.g.rotation.y, rot, 'the arm stays where it stopped');
  assert.ok(P.sheets.every(w => w.visible === false), 'the water is off');

  // refuelling with a diesel can brings it back
  C.charge = 20;
  assert.ok(/starts up/.test(ctx.pivotGenAction('pour')), 'pouring diesel restarts the engine');
  assert.equal(G.fuel, 20, 'the can holds 20 L');
  assert.equal(C.charge, 0, 'and is empty afterwards');
  ctx.updatePivot(0.001);                                 // next tick: the spray comes back with the engine
  assert.ok(P.sheets.every(w => w.visible !== false), 'the water comes back');
  assert.equal(ctx.pivotGenAction('pour'), 'The diesel can is empty - fill it at the bulk tank.');
  assert.equal(ctx.pivotGenAction('take'), '⛽ Diesel can (20 L)');
  assert.equal(C.charge, 20, 'a fresh can holds 20 L');
  ctx.pivotGenAction('fill');
  assert.equal(C.charge, 20);
  G.fuel = G.cap;
  assert.equal(ctx.pivotGenAction('pour'), 'The pivot tank is already full.');
  assert.equal(ctx.pivotGenAction('dump'), 'Pivot day tank emptied - the engine has stopped.');
  assert.equal(G.running, false);
}

// ---------------------------------------------------------------- wiring in game.html
{
  // the plant is driven by the outage flag, and every subsystem that does not read a measured rate is gated
  assert.ok(html.includes('function dead(s) {'), 'the dead-plant helper exists');
  assert.ok(html.includes('if (s.power) { dead(s); return; }'), 'the plant clock stops with the grid');
  assert.ok(html.includes('sim.power = P3.powerOutage;'), 'the grid drives the plant model');
  assert.ok(html.includes("'No power - nothing is running.'"), 'the unit readouts say there is no power');
  for (const gate of ['!POWER_OUTAGE.on && train.unloading', '!POWER_OUTAGE.on && pitBusy[i]',
                      '!POWER_OUTAGE.on && anyDrain', '!POWER_OUTAGE.on && fm.bu > 100']) {
    assert.ok(html.includes(gate), 'gated: ' + gate);
  }
  assert.ok(html.includes("(POWER_OUTAGE.on ? 0 : 1) * (s.k === 'mill'"), 'mill rotors, the blender and the agitators stop');
  assert.ok(html.includes('POWER_OUTAGE.on && S.grid ? 0 : S.rate'), 'the RTO and cooling tower stacks stop smoking');
  assert.ok(html.includes('(OUT_F - C.T) * (0.0025 + 0.006 * openSum) * dt'), 'the cooler warms with no compressor');

  // the pivot gen-set: prop, fuel, sound and the interaction
  assert.ok(html.includes('const PIVOT_GEN = { x: 0, z: 0, r: 2.8, fuel: 120, cap: 120, burn: 1.2'), 'tank and burn rate');
  // closure scope or bust: a declaration nested in a building block is invisible to updatePivot()/the P3 getter
  assert.ok(/^const PIVOT_GEN = \{/m.test(html), 'PIVOT_GEN must be declared at closure scope (column 0)');
  assert.ok(/^const CAN = \{/m.test(html), 'CAN must be declared at closure scope (column 0)');
  assert.ok(html.includes('const CAN = { cap: 20, charge: 20 }'), 'the diesel can holds 20 L');
  assert.ok(html.includes('// ---- diesel gen-set on its own pad beside the pivot point'), 'the gen-set is built');
  assert.ok(html.includes('1 - (d - 25) / 55'), 'the diesel is only audible near the corn circle');
  assert.ok(html.includes('pivotGenSound();'), 'the engine sound runs every frame');
  assert.ok(html.includes('pivotGenNear: () => pivotGenNear()'), 'the tank is reachable from the world');
  assert.ok(html.includes('if (P3.pivotGenNear()) { pivotGenMenu(); return; }'), 'E opens the gen-set menu');
  assert.ok(html.includes("P3.pivotGenAction('dump')"), 'a debug row can empty the tank');
  assert.ok(html.includes('set pivotNotify(f) { PIVOT_NOTIFY = f; }'), 'the out-of-diesel notice reaches the HUD');
}


// ---------------------------------------------------------------- the dirt tracks never run through a pond or over the track
{
  assert.ok(html.includes('const PONDS = [[-603, 429, 0x4f9a6a], [-451, 309, 0x3f9f8f]]'), 'pond positions as measured');
  assert.ok(html.includes('PONDS.phi = Math.atan(0.756); PONDS.half = 67.4; PONDS.hole = 70;'), 'pond geometry as measured');
  const phi = Math.atan(0.756), cp = Math.cos(phi), sp = Math.sin(phi), HOLE = 70, PONDS = [[-603, 429], [-451, 309]];
  const clearOfPonds = (x, z, m) => PONDS.every(([px, pz]) => {
    const dx = x - px, dz = z - pz, u = dx * cp - dz * sp, v = dx * sp + dz * cp;
    return Math.abs(u) >= HOLE + m || Math.abs(v) >= HOLE + m;
  });
  // the unit-train loop, from the satellite points the game itself uses
  const raw = html.slice(html.indexOf('const LOOP_PTS = ['), html.indexOf('].map(', html.indexOf('const LOOP_PTS = [')) + 1)
    .replace('const LOOP_PTS = ', '').replace(/(\w+):/g, '"$1":');
  const loop = JSON.parse(raw).map(([px, py]) => [-240 + (px - 1062) * 1.6, (py - 507) * 1.6]);
  const nearTrack = (x, z) => loop.reduce((best, a, i) => {
    const b = loop[(i + 1) % loop.length], vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2)) : 0;
    return Math.min(best, Math.hypot(x - (a[0] + vx * t), z - (a[1] + vz * t)));
  }, 1e9);
  const roadsSrc = html.slice(html.indexOf('const DIRT_ROADS = ['), html.indexOf('];', html.indexOf('const DIRT_ROADS = [')) + 1)
    .replace('const DIRT_ROADS = ', '').replace(/(\w+):/g, '"$1":');
  const roads = JSON.parse(roadsSrc);
  assert.ok(roads.length === 3, 'three tracks: the north run, the south run and the forecourt apron');
  let nodes = 0;
  for (const r of roads) {
    for (const [x, z] of r.pts) {
      nodes++;
      assert.ok(clearOfPonds(x, z, 8), 'road node clears both ponds by 8 m: ' + x + ',' + z);
      assert.ok(nearTrack(x, z) >= 10, 'road node clears the loop track by 10 m: ' + x + ',' + z + ' (' + nearTrack(x, z).toFixed(1) + ' m)');
    }
  }
  assert.ok(nodes >= 18, 'the tracks have enough nodes to curve round the ponds');
  assert.ok(html.includes('for (const r of DIRT_ROADS) dirtRoad(r.pts, r.w)'), 'the tracks are built');
  assert.ok(html.includes("groundMat('dirtroad', true)"), 'dirt texture with UVs in metres');
}

// ---------------------------------------------------------------- the substation is the owner's GLB, used as built
{
  const glb = fs.readFileSync('assets/models/main_power_building.glb');
  assert.equal(glb.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(glb.readUInt32LE(4), 2, 'glTF 2.0');
  let off = 12, doc = null, hasBin = false;
  while (off < glb.length) {
    const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
    if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
    else if (type === 0x004e4942) hasBin = true;
    off = body + len + ((4 - (len % 4)) % 4);
  }
  assert.ok(doc && hasBin, 'JSON + embedded BIN chunk');
  assert.ok(!(doc.images || []).length && (doc.buffers || []).every(b2 => !b2.uri), 'single-file asset: nothing external to fetch');
  const names = new Set((doc.nodes || []).map(n => n.name));
  for (const n of ['Plant_Main_Electrical_Building', 'Electrical_Building_Door', 'Compound_Access_Gate_Hinge', 'MAIN_BREAKER_HANDLE', 'PLANT_POWER_RESET_BUTTON']) {
    assert.ok(names.has(n), 'the model has the node ' + n);
    if (n !== 'Plant_Main_Electrical_Building') assert.ok(html.includes("'" + n + "'"), 'game.html wires the node ' + n);
  }
  assert.ok(html.includes("'/corn-souls/assets/models/main_power_building.glb'") && html.includes('function loadGlbModel('), 'fetched by absolute URL through the shared loader');
  assert.ok(html.includes('function glbBuild(buf)'), 'a self-contained glTF reader builds it (the bundle ships no GLTFLoader)');
  assert.ok(html.includes('loadSubstation();'), 'built at load');
  assert.ok(html.includes('const SUBSTATION = { x: -610, z: 562, yaw: Math.PI'), 'placed and yawed 180 so the compound gate faces north');
  // true scale, so the site and the dirt roads stay valid
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const msh of doc.meshes || []) for (const pr of msh.primitives || []) {
    const ac = doc.accessors[pr.attributes.POSITION];
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], ac.min[k]); mx[k] = Math.max(mx[k], ac.max[k]); }
  }
  const w = mx[0] - mn[0], d = mx[2] - mn[2], h = mx[1] - mn[1];
  assert.ok(Math.abs(w - 16.6) < 0.6 && Math.abs(d - 14.6) < 0.6, 'true scale footprint ' + w.toFixed(1) + ' x ' + d.toFixed(1) + ' m');
  assert.ok(h > 4 && h < 5, 'about 4.5 m tall');
  assert.ok((doc.animations || []).map(x => x.name).includes('Open_Fence_Gate'), 'gate animation exported');
  assert.ok((doc.animations || []).map(x => x.name).includes('Open_Building_Door'), 'door animation exported');
  assert.ok(html.includes('Q_OPEN = new T.Quaternion(0, -Math.SQRT1_2, 0, Math.SQRT1_2)'), 'the game reproduces the exported -90 deg swing pose');
  assert.ok(html.includes('gw = 6.6;'), 'fence colliders leave a gap at the gate');
}

// ---------------------------------------------------------------- tripping the main back in
{
  const a = html.indexOf("// The substation's main breaker"), b = html.indexOf('// ---------- HAND TOOLS');
  assert.ok(a > 0 && b > a, 'found the reset code');
  const q = () => ({ t: null, copy() { return this; }, slerp(x, t) { this.t = t; return this; } });
  const gate = { quaternion: q() }, door = { quaternion: q() }, handle = { rotation: { x: 0 } };
  let tripped = null;
  const ctx = {
    POWER_OUTAGE: { on: false },
    POWER_RESET: { x: -608.6, z: 565.3, r: 3.0, handle, gate, door, gateOpen: 0, doorOpen: 0,
      gateX: -605.3, gateZ: 555.1, doorX: -605.7, doorZ: 560.8 },
    Q_CLOSED: { closed: true }, Q_OPEN: { open: true },
    walk: { on: true, dead: false, x: -608.6, z: 565.3 },
    setPowerOutage: on => { tripped = on; ctx.POWER_OUTAGE.on = !!on; },
    Math
  };
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b), ctx);

  assert.equal(ctx.powerResetAction(), 'The main breaker is already closed - the plant has power.');
  assert.equal(tripped, null, 'a live plant is left alone');
  ctx.POWER_OUTAGE.on = true;
  assert.ok(/power restored/.test(ctx.powerResetAction()), 'tripping it back in restores the plant');
  assert.equal(tripped, false, 'it cleared the outage');

  ctx.POWER_OUTAGE.on = true;                       // the main is tripped again for the visual checks
  ctx.walk.x = -605.3; ctx.walk.z = 555.1;         // walk up to the compound gate
  ctx.updatePowerReset(1);
  assert.ok(handle.rotation.x < -0.3, 'the breaker handle drops while the main is tripped');
  assert.ok(gate.quaternion.t > 0.5, 'the compound gate swings open as you approach');
  ctx.walk.x = -605.7; ctx.walk.z = 560.8;         // and up to the building door
  ctx.updatePowerReset(1);
  assert.ok(door.quaternion.t > 0.5, 'the building door opens too');

  ctx.POWER_OUTAGE.on = false;
  ctx.walk.x = -400; ctx.walk.z = 400;             // walk away
  for (let i = 0; i < 8; i++) ctx.updatePowerReset(1);
  assert.ok(Math.abs(handle.rotation.x) < 0.05, 'the handle comes back up when the main is closed');
  assert.equal(gate.quaternion.t, 0, 'the gate closes behind you');
  assert.equal(door.quaternion.t, 0, 'and so does the door');
  assert.equal(ctx.powerResetNear(), false, 'and the breaker is out of reach from there');
}



// ---------------------------------------------------------------- the cooling tower model
{
  const glb = fs.readFileSync('assets/models/1x4_cooling_tower_raised_sill.glb');
  assert.equal(glb.readUInt32LE(0), 0x46546c67, 'cooling tower GLB magic');
  let off = 12, doc = null, hasBin = false;
  while (off < glb.length) {
    const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
    if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
    else if (type === 0x004e4942) hasBin = true;
    off = body + len + ((4 - (len % 4)) % 4);
  }
  assert.ok(doc && hasBin, 'JSON + embedded BIN chunk');
  assert.ok(!(doc.images || []).length && (doc.buffers || []).every(b2 => !b2.uri), 'single-file asset: nothing external');
  const names = new Set((doc.nodes || []).map(n => n.name));
  assert.ok(names.has('Cooling_Tower_1x4_Assembly'), 'the assembly root node');
  for (let i = 0; i < 4; i++) assert.ok(names.has('Fan_Rotor_' + i), 'fan rotor ' + i + ' exists (the game spins it)');
  const withMatrix = (doc.nodes || []).filter(n => n.matrix).length;
  assert.ok(withMatrix > 100, 'the parts are placed with matrices (' + withMatrix + ' of ' + doc.nodes.length + ' nodes)');
  assert.ok(html.includes('n.matrix') && html.includes('.decompose(o.position, o.quaternion, o.scale)'),
    'the glTF reader honours node matrices (without this the tower would load as a pile at the origin)');

  // assembled bounds, computed exactly the way the reader builds it
  const I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const mul = (a, b) => a.map(r => [0, 1, 2, 3].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j] + r[3] * b[3][j]));
  const nmat = n => {
    if (!n.matrix) return I;
    const m2 = n.matrix;   // glTF stores column-major
    return [[m2[0], m2[4], m2[8], m2[12]], [m2[1], m2[5], m2[9], m2[13]], [m2[2], m2[6], m2[10], m2[14]], [m2[3], m2[7], m2[11], m2[15]]];
  };
  const ap = (mm, p) => [0, 1, 2].map(i => mm[i][0] * p[0] + mm[i][1] * p[1] + mm[i][2] * p[2] + mm[i][3]);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  const walk = (i, parent) => {
    const n = doc.nodes[i], mm = mul(parent, nmat(n));
    if (n.mesh !== undefined) for (const pr of doc.meshes[n.mesh].primitives) {
      const ac = doc.accessors[pr.attributes.POSITION];
      for (const cx of [ac.min[0], ac.max[0]]) for (const cy of [ac.min[1], ac.max[1]]) for (const cz of [ac.min[2], ac.max[2]]) {
        const p = ap(mm, [cx, cy, cz]);
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      }
    }
    for (const c of n.children || []) walk(c, mm);
  };
  for (const i of doc.scenes[doc.scene || 0].nodes) walk(i, I);
  const w = mx[0] - mn[0], h = mx[1] - mn[1], d = mx[2] - mn[2];
  assert.ok(Math.abs(w - 23.6) < 0.6 && Math.abs(h - 6.0) < 0.4 && Math.abs(d - 5.8) < 0.4,
    'assembled size ' + w.toFixed(2) + ' x ' + h.toFixed(2) + ' x ' + d.toFixed(2) + ' m');
  assert.ok(Math.abs(mn[1]) < 0.1, 'the basin sits at y 0, so it needs no vertical offset');

  // wiring in game.html
  assert.ok(html.includes("'/corn-souls/assets/models/1x4_cooling_tower_raised_sill.glb'"), 'the tower model is fetched by absolute URL');
  assert.ok(html.includes('const TOWER = { x: 50, z: 198, yaw: 0'), 'placed where the painted placeholder was (EXR-22, SZR+13)');
  assert.ok(html.includes('loadCoolingTower();') && html.includes('updateCoolingTower(dt);'), 'built at load, updated every frame');
  assert.ok(html.includes('if (!TOWER.fans.length || POWER_OUTAGE.on) return;'), 'the fans stop dead with the plant');
  assert.ok(html.includes('POWER_OUTAGE.on && S.grid ? 0 : S.rate'), 'grid-fed stacks (RTO, cooling tower) go cold with the plant');
  assert.ok(html.includes('rate: 7, grid: true });'), 'the RTO stack is flagged grid-fed');
  assert.ok(html.includes("nameplate('COOLING TOWER|CELLS 1-4'"), 'the hardstand is labelled');
  assert.ok(!html.includes("mark('COOLING"), 'the painted placeholder is gone');
  const roadEdge = 185 + 10.7 / 2, towerNorth = 198 + mn[2];
  assert.ok(towerNorth - roadEdge > 3, 'the tower clears the south road by ' + (towerNorth - roadEdge).toFixed(1) + ' m');
}

console.log('PASS: the outage stops the plant model dead (conveyors, pumps, mills, RTO) and the pivot keeps running on its own diesel until the day tank is dry');
