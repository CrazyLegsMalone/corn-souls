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
  // (the beer-drain gate went with the outside drain pipes: there is no drain flow to gate any more - the drain itself is
  // the plant model's, and it is stopped by dead() like every other unit)
  for (const gate of ['!POWER_OUTAGE.on && train.unloading', '!POWER_OUTAGE.on && pitBusy[i]', '!POWER_OUTAGE.on && fm.bu > 100']) {
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
  assert.ok(html.includes("stepSafe('pivotGen', () => pivotGenSound());"), 'the engine sound runs every frame (guarded, so one bad frame cannot silence it for good)');
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
  assert.ok(roads.length === 4, 'v1.97.44 (re-laid where the owner drew it): the loop\'s north side, its east / south / west side, the run out to the north-west, the substation spur');
  let nodes = 0;
  for (const r of roads) {
    for (const [x, z] of r.pts) {
      nodes++;
      assert.ok(clearOfPonds(x, z, 8), 'road node clears both ponds by 8 m: ' + x + ',' + z);
      assert.ok(nearTrack(x, z) >= 10, 'road node clears the loop track by 10 m (v1.97.44: the north-west run follows the rail 12 m off): ' + x + ',' + z + ' (' + nearTrack(x, z).toFixed(1) + ' m)');
    }
  }
  assert.ok(nodes >= 18, 'the tracks have enough nodes to curve round the ponds');
  assert.ok(html.includes('DIRT_ROADS.forEach((r, i) => dirtRoad(r.pts, r.w, 1 - i * 0.5));') && html.includes('fm.polygonOffsetUnits -= 1;'), 'the tracks are built, each overlapping surface with its own depth pull (v1.97.47: they flickered where they overlap)');
  assert.ok(html.includes("fingerpost(-295, 207, [{ text: 'MAIN POWER STATION', to: [-311, 313]") && html.includes("{ text: '?', to: [-442, 193]"), 'v1.97.45: the owner\'s signpost in the fork: left to the main power station, right "?"');
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
    NET: { conn: null }, netSend: () => {},   // powerSet tells the other player, and this sandbox is offline
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
  assert.ok(html.includes('const TOWER = { x: 50, z: 202, yaw: 0, scale: 2'), 'doubled, and pushed south to clear the road');
  assert.ok(html.includes('g.scale.setScalar(TOWER.scale)'), 'the scale is applied when the model loads');
  assert.ok(html.includes("groundMat('asphalt', false, w + 3, d + 3)"), 'the hardstand is sized from the placed model');
  assert.ok(html.includes('loadCoolingTower();') && html.includes("stepSafe('coolingTower', () => updateCoolingTower(dt));"), 'built at load, updated every frame');
  assert.ok(html.includes('if (!TOWER.fans.length || POWER_OUTAGE.on) return;'), 'the fans stop dead with the plant');
  assert.ok(html.includes('POWER_OUTAGE.on && S.grid ? 0 : S.rate'), 'grid-fed stacks (RTO, cooling tower) go cold with the plant');
  assert.ok(html.includes('rate: 7, grid: true });'), 'the RTO stack is flagged grid-fed');
  // v1.97.155, owner: "cooling tower clouds should come from each cooling fan that is running not just a single point". One
  // drift per fan rotor, at that fan's own place on the deck, the same 8 puffs a second split between them, and a fan that
  // is not turning makes none (TOWER.stacks carry `spinning`, and the plume loop reads it).
  assert.ok(html.includes('fans: [], stacks: [], ready: false }'), 'the tower keeps its own list of plumes');
  assert.ok(html.includes('const p = f.getWorldPosition(V3()), S = { x: p.x, y: Math.max(FY, p.y + 0.2), z: p.z, r: FR, rate: 8 / TOWER.fans.length, grid: true, fan: f, spinning: true };'),
    'one drift per fan rotor, at that fan, with the rate split between them');
  assert.ok(html.includes('for (const S of TOWER.stacks) S.spinning = spinning;'), 'the fans tell their plumes whether they are turning');
  assert.ok(html.includes('S.spinning === false ? 0 : POWER_OUTAGE.on && S.grid ? 0 : S.rate'), 'and the plume loop makes no puffs for a fan that is not');
  assert.ok(html.includes("else { const S = { x: TOWER.x, y: FY, z: TOWER.z, r: Math.max(2.6, w * 0.12), rate: 8, grid: true, spinning: true };"),
    'a model with no named rotors still gets one drift off the deck, as before');
  assert.ok(html.includes('const FY = bb.max.y - 0.6, FR = Math.max(1.2, w * 0.045);'), 'each fan gets a smaller cloud than the one deck-wide plume did');
  assert.ok(html.includes("nameplate('COOLING TOWER|CELLS 1-4'"), 'the hardstand is labelled');
  assert.ok(!html.includes("mark('COOLING"), 'the painted placeholder is gone');
  const SC = 2, roadEdge = 185 + 10.7 / 2, towerNorth = 202 + mn[2] * SC, towerSouth = 202 + mx[2] * SC;
  // v1.97.155: four fans, four plumes. Each rotor's place in the *placed* tower (scale 2 at x 50, z 202) is where its drift
  // starts, so they have to be four different places along the deck - not one point in the middle, which is what it was.
  { const fans = [];
    const find = (i, parent) => {
      const n = doc.nodes[i], mm = mul(parent, nmat(n));
      if (/^Fan_Rotor_\d$/.test(n.name || '')) fans.push([mm[0][3] * SC + 50, mm[1][3] * SC, mm[2][3] * SC + 202]);
      for (const c of n.children || []) find(c, mm);
    };
    for (const i of doc.scenes[doc.scene || 0].nodes) find(i, I);
    assert.equal(fans.length, 4, 'four rotors in the model, so four plumes');
    const xs = fans.map(f2 => f2[0]).sort((a, b) => a - b), gap = Math.min(...xs.slice(1).map((x, i) => x - xs[i]));
    console.log('  cooling tower fans at x ' + xs.map(x => x.toFixed(1)).join(', ') + ', closest pair ' + gap.toFixed(1) + ' m apart');
    assert.ok(gap > 8, 'the fans stand metres apart along the deck (' + gap.toFixed(1) + ' m), so four plumes read as four');
    assert.ok(xs[0] > 50 - 26 && xs[3] < 50 + 26 && fans.every(f2 => f2[1] > 4), 'and all four are up on the deck, spread across it');
  }
  assert.ok(Math.abs((mx[0] - mn[0]) * SC - 47.3) < 1.2, 'the footprint really is doubled: ' + ((mx[0] - mn[0]) * SC).toFixed(1) + ' x ' + ((mx[2] - mn[2]) * SC).toFixed(1) + ' m');
  assert.ok(towerNorth - roadEdge > 3, 'the doubled tower clears the south road by ' + (towerNorth - roadEdge).toFixed(1) + ' m');
  assert.ok(towerNorth > roadEdge, 'and never crosses it (north face at z ' + towerNorth.toFixed(1) + ', road edge ' + roadEdge.toFixed(1) + ')');
  assert.ok(towerSouth < 260, 'the south face stays on the open ground: z ' + towerSouth.toFixed(1));
}


// ---------------------------------------------------------------- the vending machine model
{
  const glb = fs.readFileSync('assets/models/milorade_machine.glb');
  assert.equal(glb.readUInt32LE(0), 0x46546c67, 'vending machine GLB magic');
  let off = 12, doc = null, hasBin = false;
  while (off < glb.length) {
    const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
    if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
    else if (type === 0x004e4942) hasBin = true;
    off = body + len + ((4 - (len % 4)) % 4);
  }
  assert.ok(doc && hasBin, 'JSON + embedded BIN');
  assert.equal(doc.nodes[doc.scenes[doc.scene || 0].nodes[0]].name, 'Milo_Rade_Vending_Machine', 'the model root');
  // the advert panel is an embedded PNG, so the reader has to carry textures, UVs and material maps
  assert.equal((doc.images || []).length, 1, 'one embedded advert image');
  assert.equal(doc.images[0].mimeType, 'image/png');
  assert.ok((doc.materials || []).some(m2 => (m2.pbrMetallicRoughness || {}).baseColorTexture), 'a material uses the advert texture');
  assert.ok(html.includes('T.TextureLoader()') && html.includes("at('uv', pr.attributes.TEXCOORD_0, 2)") && html.includes('baseColorTexture'),
    'the reader builds embedded textures, UVs and material maps');
  assert.equal(doc.animations[0].name, 'Dispense_Milo_Rade', 'the dispense animation is in the file');
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const msh of doc.meshes) for (const pr of msh.primitives) {
    const ac = doc.accessors[pr.attributes.POSITION];
    for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], ac.min[k]); mx[k] = Math.max(mx[k], ac.max[k]); }
  }
  assert.ok(Math.abs((mx[0] - mn[0]) - 1.14) < 0.2 && Math.abs((mx[1] - mn[1]) - 2.23) < 0.3,
    'about 1.14 x 2.23 m, got ' + (mx[0] - mn[0]).toFixed(2) + ' x ' + (mx[1] - mn[1]).toFixed(2));
  assert.ok(Math.abs(mn[1] + 0.16) < 0.05, 'it hangs 0.16 m below its origin, so placement lifts it');
  // wiring: one model, two machines, both old soda boxes gone
  assert.ok(html.includes("'/corn-souls/assets/models/milorade_machine.glb'"), 'the machine model is fetched');
  assert.equal((html.match(/DRINK_SPOTS\.push\(/g) || []).length, 2, 'two vending machines');
  assert.ok(html.includes('DRINK_SPOTS.push({ x: -61.35, y: 0, z: OZN + 0.46'), 'replaces the process break-room soda machine');
  assert.ok(html.includes('DRINK_SPOTS.push({ x: 59, y: FY, z: ZN + 0.46'), 'replaces the scale-house soda machine');
  assert.ok(html.includes('g.position.y += s.y - bb.min.y;'), 'the machine base is measured onto the floor instead of floating');
  // the scale house is laid out at x 56..90 and shifted east by SH_DX; the machine has to ride that shift or it
  // stands 26 m west of the building (the bug the owner spotted: a machine outside the entrance)
  assert.ok(html.includes('DRINK_SPOTS[i].x += DX'), 'the scale-house machine moves east with the building');
  const shDX = +html.match(/const SH_DX = (\d+)/)[1];
  assert.ok(59 + shDX > 56 + shDX && 59 + shDX < 90 + shDX, 'and ends up inside it (x ' + (59 + shDX) + ', building ' + (56 + shDX) + '..' + (90 + shDX) + ')');
  assert.ok(!html.includes('box(0.95, 1.85, 0.85, red'), 'the old break-room soda box is gone');
  assert.ok(!html.includes('mat(0xc8312f), 59'), 'the old scale-house soda box is gone');
  assert.ok(html.includes('loadDrinkMachines();') && html.includes('root.clone(true)'), 'built at load, one upload shared by both machines');
}


// ---------------------------------------------------------------- the NPC character models
{
  const chars = [
    ['operator_vern_rig.glb', 'vern', 'Hand_Glove', 1.64],
    ['boardop_rick_rig.glb', 'op', 'Hand_Bare', 1.64],
    ['brenda_scalehouse_rig.glb', 'brenda', 'Hand_Bare', 1.57],
    ['tammy_scalehouse_rig.glb', 'tammy', 'Hand_Bare', 1.57]
  ];
  // the joints the rig builder reparents: if a re-export renames one, this fails instead of dropping a limb
  const JOINTS = s2 => ['Shoulder_Cap_' + s2, 'Arm_Upper_' + s2, 'Arm_Lower_' + s2, 'Jacket_Wrist_Cuff_' + s2,
    'Leg_Upper_' + s2, 'Cargo_Pocket_' + s2, 'Knee_Guard_' + s2, 'Leg_Lower_' + s2, 'Boot_Lug_' + s2];
  const npcTable = html.slice(html.indexOf('const NPC_MODELS'), html.indexOf('};', html.indexOf('const NPC_MODELS')));
  for (const [file, id, hands, h] of chars) {
    const path = 'assets/models/' + file;
    assert.ok(fs.existsSync(path), 'model present: ' + path);
    const glb = fs.readFileSync(path);
    assert.equal(glb.readUInt32LE(0), 0x46546c67, file + ': GLB magic');
    let off = 12, doc = null;
    while (off < glb.length) {
      const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
      if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
      off = body + len + ((4 - (len % 4)) % 4);
    }
    const names = new Set(doc.nodes.map(n => n.name));
    assert.equal(doc.nodes[doc.scenes[doc.scene || 0].nodes[0]].name, 'Operator_Rig_Root', file + ': rig root');
    assert.equal((doc.skins || []).length, 0, file + ': rigid parts, no skin');
    for (const s2 of ['L', 'R']) for (const j of JOINTS(s2)) assert.ok(names.has(j), file + ' has the joint ' + j);
    assert.ok(names.has(hands + '_L') && names.has(hands + '_R'), file + ' uses ' + hands + '_*');
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const m of doc.meshes) for (const pr of m.primitives) {
      const ac = doc.accessors[pr.attributes.POSITION];
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], ac.min[k]); mx[k] = Math.max(mx[k], ac.max[k]); }
    }
    assert.ok(Math.abs((mx[1] - mn[1]) - h) < 0.12, file + ' is ' + (mx[1] - mn[1]).toFixed(2) + ' m tall');
    assert.ok(Math.abs(mn[1] + 0.19) < 0.05, file + ' hangs 0.19 m below its origin, so placement lifts it');
  }
  // v1.97.177: the NPCs moved to the Loves_Art skinned models (validate-skinned-npcs.cjs); these rigid rigs stay in the repo - the
  // players still wear operator_vern_rig.glb - and nothing in NPC_MODELS points at them any more
  for (const [file] of chars) assert.ok(!npcTable.includes(file), 'NPC_MODELS no longer wires ' + file);
  assert.ok(npcTable.includes('url: NPC_VERN') && npcTable.includes('url: NPC_RICK') && npcTable.includes('url: NPC_BRENDA') && npcTable.includes('url: NPC_TAMMY'), 'NPC_MODELS wires the skinned models (v1.97.184: all four wear their own wardrobe builds)');
  assert.ok(html.includes('function characterRig(') && html.includes('function rigPivot('), 'one shared rig builder');
  assert.ok(html.includes("rig['leg' + s].rotation.x = -1.15"), 'seated pose swings the thighs forward and slightly down');
  assert.ok(html.includes("rig['knee' + s].rotation.x = 1.15"), 'and the shins back down to the floor');
  assert.ok(html.includes('const seatY = 0.49;'), 'seated models are anchored at the seat, not at their feet');
  assert.ok(html.includes('base = seatY - hipY;'), 'the PELVIS lands on the seat: the root sits at the feet, 0.62 m lower');
  assert.ok(html.includes('let base = -bb.min.y;'), 'standing models still put their feet on the floor');
  assert.ok(html.includes('if (cfg.x !== undefined) npc.g.position.x = cfg.x;'), 'a per-NPC world nudge exists');
  assert.ok(html.includes('root.rotation.y = cfg.face === undefined ? Math.PI : cfg.face'), 'models are flipped to face like the box avatars');
  assert.ok(html.includes('if (seated.length) for (const c of seated) c.visible = false;'), 'only the box body is hidden - the chair stays');
  assert.ok(html.includes('function loadNpcModels()') && html.includes('loadNpcModels();'), 'loaded at init');
}


// ---------------------------------------------------------------- the package boiler model
{
  const glb = fs.readFileSync('assets/models/ethanol_plant_steam_boiler_narrow_long.glb');
  assert.equal(glb.readUInt32LE(0), 0x46546c67, 'boiler GLB magic');
  let off = 12, doc = null, hasBin = false;
  while (off < glb.length) {
    const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
    if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
    else if (type === 0x004e4942) hasBin = true;
    off = body + len + ((4 - (len % 4)) % 4);
  }
  assert.ok(doc && hasBin, 'JSON + embedded BIN');
  assert.equal(doc.nodes[doc.scenes[doc.scene || 0].nodes[0]].name, 'Ethanol_Plant_Steam_Boiler', 'the boiler root');
  assert.equal((doc.images || []).length, 0, 'flat materials only');
  assert.ok(doc.nodes.filter(n => n.matrix).length > 200, 'the parts are placed with matrices');
  const names = new Set(doc.nodes.map(n => n.name));
  for (const part of ['Exhaust_Stack', 'Burner_Housing', 'Forced_Draft_Blower', 'Upper_Steam_Drum', 'Insulated_Boiler_Casing', 'Boiler_Nameplate']) {
    assert.ok(names.has(part), 'the model carries its own ' + part);
  }
  // assembled bounds through the matrices, exactly as the reader builds it
  const I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  const mul = (a, b2) => a.map(r => [0, 1, 2, 3].map(j => r[0] * b2[0][j] + r[1] * b2[1][j] + r[2] * b2[2][j] + r[3] * b2[3][j]));
  const nmat = n => {
    if (!n.matrix) return I;
    const m2 = n.matrix;
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
  const bw = mx[0] - mn[0], bh = mx[1] - mn[1], bd = mx[2] - mn[2];
  assert.ok(Math.abs(bw - 6.34) < 0.6 && Math.abs(bh - 8.14) < 0.6 && Math.abs(bd - 9.96) < 0.6,
    'assembled ' + bw.toFixed(2) + ' x ' + bh.toFixed(2) + ' x ' + bd.toFixed(2) + ' m');
  assert.ok(Math.abs(mn[1]) < 0.1, 'the base already sits at y 0');
  // wiring: two bays, north is Boiler 1
  assert.ok(html.includes("[[19.4, 25.4, 'BOILER 1'], [32.0, 38.6, 'BOILER 2']]"), 'north is Boiler 1, south is Boiler 2');
  assert.ok(html.includes('BOILER_SPOTS.push({ x: cx, y: 0, z: cz, yaw: Math.PI / 2'), 'turned 180: casing east-west, burner and blower on the EAST end, stack on the west');
  assert.ok(html.includes('loadBoilers();') && html.includes('root.clone(true)'), 'one upload shared by both boilers');
  assert.ok(html.includes('ecBox(cx - 5.2, cx + 5.2, cz - 3.2, cz + 3.2)'), 'each boiler keeps its collision box, widened for the sleeve');
  // the casing sleeve: the casing is 3.34 m across, so r 1.67, and it runs 2.03 m back from the casing's west face to the
  // dryer train's burner-can line at x = E0 + 7.35 (the model's casing ends at local z -3.22, so the sleeve centres on -4.235)
  assert.ok(html.includes("const sleeve = new T.Mesh(new T.CylinderGeometry(1.67, 1.67, 2.03, 20), casing.material)"), 'the sleeve uses the casing section and material');
  assert.ok(html.includes('sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 2.35, -4.235);'), 'in model space, behind the rear flue box, so it turns with the boiler');
  assert.ok(html.includes("const casing = root.getObjectByName('Insulated_Boiler_Casing')"), 'and it takes the casing material from the model');
  { const E0 = -55, cx = E0 + 12.6, westFace = cx - 4.235 - 2.03 / 2, drum = E0 + 7.35;
    assert.ok(Math.abs(westFace - drum) < 0.02, 'the sleeved casing lands on the dryer train line (' + westFace + ' vs ' + drum + ')'); }
  // ---------------------------------------------------------------- the fermenter drain pipes
  // Two pipe runs used to lie on the concrete along the outside of the fermenter columns and climb the office wall into
  // the beer well. That is not how the fermenters connect to each other or to the beer well, so the whole assembly - the
  // runs, the stub off every tank, the riser, its support post and the two flow animations riding them - is gone.
  assert.ok(!html.includes('const drW = [[DXW, 0.7, ZN]'), 'no drain run along the west column');
  assert.ok(!html.includes('const drE = [[DXE, 0.7, ZN]'), 'no drain run along the east column');
  assert.ok(!html.includes("[DXE, 0.7, ZN], [DXE, 0.7, -38.0], [DXE, XY, -38.0]"), 'and nothing climbing the office wall');
  assert.ok(!html.includes('tpost(DXE, -38.0, XY)'), 'its support post is gone too');
  assert.ok(!html.includes('pipe([[x + d * (FR - 0.2), 0.7, z]'), 'no 0.7 m stub off every fermenter');
  assert.ok(!html.includes('O.fBeerW') && !html.includes('O.fBeerE'), 'and no flow animation is left driving anything');
  assert.ok(html.includes('const DXW = FXW - FR - 1.3, DXE = FXE + FR + 1.3;'), 'the pad still knows how wide the fermentation area is');
  assert.ok(html.includes('pad(AC, (ZN - FR - 3 + -33) / 2, DXE - DXW + 4,'), 'and the pad is still built from it');

  // ---------------------------------------------------------------- standing on vehicles
  assert.ok(html.includes('function updateVehTops()'), 'vehicles carry a walk surface that follows them');
  assert.ok(html.includes('s.x0 = x0; s.x1 = x1; s.z0 = z0; s.z1 = z1; s.y0 = s.y1 = top;'), 'the surface is the world AABB at roof height');
  assert.ok(html.includes('if (!s) { s = V.top = { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 0 }; WALK_SURF.push(s); }'), 'one surface per vehicle, created once and moved');
  assert.ok(html.includes("stepSafe('vehTops', () => updateVehTops());") &&
    html.indexOf("stepSafe('vehTops'") < html.indexOf("stepSafe('deadDrop'"), 'updated every frame, before the player moves');
  assert.ok(html.includes('if (ly > b.max.y - 0.3 || ly + 1.7 < b.min.y) continue;'), 'and vehPush already ignores a vehicle you are standing on');
  assert.ok(html.includes('regVehBox(g);   // solid to walk into, and a roof you can stand on'), 'the Ranger is registered too');
  assert.ok(html.includes('walk.y < 1.2) for (const off of [-0.9, 0, 0.9])'), 'its old three-circle push-out does not shove you off the roof');
  assert.ok(html.includes('for (let i = VBOXES.length - 1; i >= 0; i--) if (VBOXES[i].g === utv.g)'), 'and rebuilding it drops the old solid and roof');
  // ---------------------------------------------------------------- killing a critter, carrying it and eating it
  assert.ok(html.includes('function critterPick()'), 'X can pick a corpse up');
  assert.ok(html.includes("if (critters) for (const c of critters) if (c.state === 'hit' && !c.held) cand.push(c);"), 'dead critters count');
  assert.ok(html.includes("for (const b of birds) if ((b.state === 'fall' || b.state === 'down') && !b.held && b.g.visible) cand.push(b);"), 'so do fallen birds (falling or on the ground, v1.97.112)');
  assert.ok(html.includes("for (const f of pondFrogs) if (f.state !== 'live' && !f.held) cand.push(f);"), 'and dead frogs');
  assert.ok(html.includes('camera.attach(o.g); o.g.position.set(0.3, -0.3, -0.6);'), 'a picked-up corpse is carried in front of the camera');
  // X carries and puts down, B eats, fire throws - three verbs, three buttons, as the owner asked
  assert.ok(html.includes('- X to put it down, B to eat it, fire to throw it.'), 'the prompt names all three buttons');
  assert.ok(html.includes("if (heldDead) { if (heldDead.eating) return 'Chewing...'; const nm = deadDrop(); return nm ? 'You put the ' + nm + ' down.' : null; }"), 'X on a held corpse puts it down');
  assert.ok(html.includes('function critterEat()'), 'B eats');
  assert.ok(html.includes("if (o.group) { o.state = 'hit'; o.eaten = true; o.t = 20 + Math.random() * 20; } else { o.state = 'gone'; o.t = 10 + Math.random() * 20; }") && html.includes('eatGone(h.o); if (heldDead === h) heldDead = null;'), 'eating takes it out of the world (after the bites, v1.97.112)');
  assert.ok(html.includes('const m = P3.critterEat(); if (m) toast(m);'), 'the B press is wired to eating, and still closes a panel first');
  assert.ok(html.includes("m: 'START', h: 'SELECT', y: 'Y', b: 'B' }"), 'the keyboard has a B key');
  assert.ok(html.includes('function critterThrow()'), 'fire throws');
  assert.ok(html.includes('const th = P3.critterThrow(); if (th) toast(th); else if (!P3.radioFire()) P3.fire();'), 'the fire button throws a held corpse instead of firing the tool');
  assert.ok(html.includes('const THROWN = [];') && html.includes('function updateThrown(dt) {'), 'thrown bodies fly');
  assert.ok(html.includes('b.t += dt; b.v.y -= 9.8 * dt;'), 'on a real arc');
  assert.ok(html.includes('b.o.thrown = false; b.o.t = 45; THROWN.splice(i, 1);'), 'and come to rest as ordinary corpses, back on the clean-up timer');
  assert.ok(html.includes('critterEat: () => critterEat(), critterThrow: () => critterThrow(),'), 'both are on the Plant3D bridge');
  assert.ok(html.includes("stepSafe('birds', () => updateBirds(dt)); stepSafe('critters', () => updateCritters(dt)); stepSafe('thrown', () => updateThrown(dt));"), 'and they are stepped every frame (guarded, so a throw in one cannot stop the others)');
  assert.ok(html.includes('if (!c.held && !c.thrown && (c.t -= dt) <= 0)'), 'a held corpse is already exempt from the clean-up timer');
  assert.ok(html.includes('if (heldDead && (walk.dead || walk.drive)) deadDrop();'), 'and it is put down if you die or get in something');
  assert.ok(html.includes('{ const m = P3.critterPick(); if (m) { toast(m); return; } }'), 'the X press is wired to it');
  // ---------------------------------------------------------------- and a thrown body really falls and settles
  {   // run the game's own ballistic step over a stand-in corpse on a flat floor
    const src = html.slice(html.indexOf('const THROWN = [];'), html.indexOf('function hitCritter('));
    assert.ok(src.includes('function updateThrown(dt)'), 'found the throw step');
    const lib3d = { window: {}, console };
    vm.runInNewContext(scripts.find(x => x.includes('window.THREE=eu')), lib3d);
    const T3 = lib3d.window.THREE;
    const ctx = { T: T3, Math, console, floorAt: () => 0 };
    vm.createContext(ctx);
    vm.runInContext(src, ctx);
    vm.runInContext('this.THROWN = THROWN; this.step = updateThrown;', ctx);
    const g = new T3.Object3D(); g.position.set(0, 2, 0);
    const o = { thrown: true, t: 0 };
    ctx.THROWN.push({ g, o, v: new T3.Vector3(1.5, 0.5, 0), spin: new T3.Vector3(1, 1, 1), t: 0 });
    const y0 = g.position.y;
    ctx.step(1 / 60);
    assert.ok(g.position.y > y0, 'it starts upward');
    for (let i = 0; i < 400 && ctx.THROWN.length; i++) ctx.step(1 / 60);
    assert.equal(ctx.THROWN.length, 0, 'the throw ends');
    assert.ok(g.position.x > 0.5, 'it travelled forward');
    assert.ok(Math.abs(g.position.y - 0.06) < 1e-9, 'and it is lying on the floor');
    assert.equal(o.thrown, false, 'no longer exempt from the clean-up timer');
    assert.equal(o.t, 45, 'with a full timer again');
  }

  // ---------------------------------------------------------------- the dirt pond loop keeps out of the corn circle
  {   // the tracks are drawn from the same numbers the game builds from, so this cannot drift
    const blk = html.slice(html.indexOf('const DIRT_ROADS = ['), html.indexOf('];', html.indexOf('const DIRT_ROADS = [')));
    const legs = [...blk.matchAll(/pts: \[\[(.*?)\]\]/g)].map(m => [...m[1].matchAll(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/g)].map(p => [+p[1], +p[2]]));
    assert.ok(legs.length >= 4 && legs[0].length >= 5, 'the pond loop legs are where they are expected');
    assert.deepEqual(legs[0][0], [-225, 185], 'the loop starts on the paved south road, not short of it');
    const PC = [-675, -99], PR = 344;                                    // centre-pivot corn circle
    const phi = Math.atan(0.756), c = Math.cos(phi), s2 = Math.sin(phi), PONDS = [[-603, 429], [-451, 309]], HALF = 67.4;
    let circle = 1e9, pond = 1e9;
    for (const leg of legs) for (let i = 0; i < leg.length - 1; i++) {
      const [x0, z0] = leg[i], [x1, z1] = leg[i + 1], n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2));
      for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
        circle = Math.min(circle, Math.hypot(x - PC[0], z - PC[1]) - PR);
        for (const [px, pz] of PONDS) pond = Math.min(pond, Math.max(Math.abs((x - px) * c + (z - pz) * s2) - HALF, Math.abs(-(x - px) * s2 + (z - pz) * c) - HALF)); } }
    assert.ok(circle > 15, 'the dirt loop keeps clear of the corn circle (' + circle.toFixed(1) + ' m)');
    assert.ok(pond > 2, 'and of the ponds (' + pond.toFixed(1) + ' m)');
  }
  // ---------------------------------------------------------------- flat walkable tank tops
  assert.ok(html.includes('function tankDeck(g, opt)'), 'tankDeck() exists');
  assert.ok(html.includes('add(new T.CylinderGeometry(R * 0.99, R * 0.99, 0.3, 32), mat(O.deck || 0xa6abae), x, rim - 0.15, z, null);'), 'a steel deck flush with the rim');
  assert.ok(html.includes('if (Math.abs(Math.atan2(Math.sin(mid - ang), Math.cos(mid - ang))) < half) continue;   // the ladder lands here'), 'a guardrail that opens where the ladder lands');
  assert.ok(html.includes('WALK_SURF.push({ x0: x - R, x1: x + R, z0: z - R, z1: z + R, y0: rim, y1: rim });'), 'and a walk surface on it');
  assert.ok(html.includes('LADDERS.push({ x: x + Math.cos(ang) * (LX + 0.1)'), 'with a ladder up');
  for (const call of ['tankDeck(O.liq1);', 'tankDeck(O.liq);', 'tankDeck(O.etoh1);', 'tankDeck(O.etoh2);'])
    assert.ok(html.includes(call), 'deck on: ' + call);
  assert.equal((html.match(/dome: false, noRail: true/g) || []).length >= 4, true, 'the four tanks no longer carry a dome or the old torus rail');
  assert.ok(html.includes("O.etoh1 = tank(FPX, FP1Z, 12, 12.1, 0x7fd3ff, 0x5ec8ff, 'etoh', { dome: false, noRail: true, y: -TPIT.d, level: 0.4 })"), 'Final Product Tank 1 has a flat deck, not a squashed dome');
  assert.ok(html.includes("O.etoh2 = tank(FPX, FP2Z, 12, 12.1, 0x7fd3ff, 0x5ec8ff, 'etoh', { dome: false, noRail: true, y: -TPIT.d, level: 0.65 })"), 'and Tank 2 the same');
  assert.ok(html.includes("'liq1', { level: 0.9, dome: false, noRail: true }"), 'Liq Tank 1 the same');
  // ---------------------------------------------------------------- tin-bin tops: walkways and plant-side ladders
  assert.ok(html.includes('function binWalkway(xa, za, xb, zb, y)'), 'a walkway helper exists');
  assert.ok(html.includes('function siloLadderAt(x, z, R, H, ang)'), 'and a ladder that can sit on any side');
  assert.ok(html.includes('binWalkway(w2.x, w2.z, w3s.x, w3s.z, BTOP);') && html.includes('binWalkway(w3n.x, w3n.z, w4.x, w4.z, BTOP);'),
    'Tin Bin 2 -> 3 and Tin Bin 3 -> 4, both at the roof height');
  assert.ok(html.includes('rimOf = (cx, cz, R, tx, tz) =>'), 'the walkway ends are measured from the two bin rims, not hard-coded');
  assert.ok(html.includes('const BTOP = SILOH + 0.15'), 'the deck sits on the roofs (siloClimb lays the roof at H + 0.15)');
  assert.ok(html.includes('siloLadderAt(SILOX, -SILOZ, SILOR, SILOH, 0)'), 'a plant-side ladder on Tin Bin 2');
  assert.ok(html.includes('if (i === 1) siloLadderAt(TB34X, z, TB34R, SILOH, 0);'), 'and on Tin Bin 4');
  assert.ok(html.includes('function siloClimb(x, z, R, H, gaps)') && html.includes('if (open) continue;'),
    'the eave guardrail opens where a walkway or ladder meets it');
  assert.ok(html.includes('WALK_SURF.push({ x0: Math.min(xa, xb) - W / 2') && html.includes('wallSegs.push([xa + ox + SX'), 'the deck is walkable and its rails block a fall');
  // ---------------------------------------------------------------- performance audit
  assert.ok(html.includes("const FPS_CAP = (window.Plant3D && window.Plant3D.tier && window.Plant3D.tier.fps) || 144, FPS_STEP = FPS_CAP > 0 ? 1000 / FPS_CAP : 0;"),
    'the frame rate is capped from the quality tier (144 on a desktop, 60 on a phone)');
  /* v1.97.26: a time gate (counting callbacks over-skipped on a busy phone) */
  assert.ok(html.includes('if (PACE.minGap && now - PACE.last < PACE.minGap) { requestAnimationFrame(frame); return; }'), 'the cap draws on every k-th screen refresh (even gaps), and a skipped refresh still schedules the next one');
  assert.ok(!html.includes('fpsAcc'), 'the old time accumulator (it skipped frames on timing jitter) is gone');
  // NPC rigs never animate after their pose: folded to one mesh per material and out of the shadow pass
  assert.ok(html.includes('mergeModel(root, false);'), 'NPC rigs are merged after posing (the boiler and the vending props do the same)');
  assert.ok(html.includes('// The pose above is the last thing that ever moves these parts'), 'and the reason is written down');
  assert.ok(html.includes('root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });   // indoors, static: out of the shadow pass'), 'vending machines are out of the shadow pass');
  assert.ok(html.includes('mergeModel(root, true, o => { for (const f of TOWER.fans)'), 'the cooling tower shell is folded while its fan rotors stay');
  assert.ok(html.includes('function mergeModel(root, castShadow, skip) {'), 'mergeModel can leave named parts alone');
  // performance: the model is folded to one mesh per material instead of 258 parts, and it is out of the shadow pass
  assert.ok(html.includes('mergeModel(root, false);') && html.includes('function mergeModel(root, castShadow, skip)'), 'the boiler batch-merged, with shadows off');
  assert.ok(html.includes('function mergeModel(root, castShadow, skip) {') && html.includes('if (parts.length < 2) continue;'), 'merge keeps single-part materials as they are');
  assert.ok(html.includes('if (o !== root) o.matrixAutoUpdate = false; })'), 'and stops walking static matrices every frame');
  assert.ok(!html.includes("'BOILER A'") && !html.includes('15.5 - H'), 'the old procedural boilers and their rooftop stacks are gone');
  // ---------------------------------------------------------------- the players wear their own wardrobe builds (v1.97.185)
  assert.ok(html.includes("const PLAYER_SKIN = {") && html.includes("'/corn-souls/assets/models/player1_3_0.glb'") && html.includes("'/corn-souls/assets/models/player2_3_0.glb'"), 'Player 1 wears squeeg1, Player 2 wears squeeg2');
  assert.equal((html.match(/dressPlayerSkin\(/g) || []).length, 8, 'one definition + seven avatars: 2P remote, own 3rd person, Ranger driver, mower rider, passenger seat, the other player seated in a car, and the idle Player 2 at the smoking area (v1.97.190)');
  for (const call of ['dressPlayerSkin(av, VEST_COL[other], {});', 'dressPlayerSkin(d, vest, { sit: true });', 'dressPlayerSkin(av, VEST_COL[me], { onRig: (R, root, swing) => {'])

    assert.ok(html.includes(call), 'wired: ' + call.slice(0, 40));
  // ---------------------------------------------------------------- vending: the Shifty Food machine and the cans
  { const files = ['shifty_food_machine.glb', 'shifty_popcorn.glb', 'shifty_corn_chips.glb', 'shifty_roasted_corn.glb', 'milo_rade_can.glb', 'water_can.glb'];
    for (const f of files) assert.ok(fs.existsSync('assets/models/' + f), 'shipped: ' + f);
    const read = f => { const b = fs.readFileSync('assets/models/' + f); let off = 12, doc = null;
      while (off < b.length) { const len = b.readUInt32LE(off), type = b.readUInt32LE(off + 4), body = off + 8;
        if (type === 0x4e4f534a) doc = JSON.parse(b.slice(body, body + len).toString('utf8')); off = body + len + ((4 - (len % 4)) % 4); }
      return doc; };
    const m = read('shifty_food_machine.glb'), names = new Set(m.nodes.map(n => n.name));
    assert.deepEqual(m.animations.map(a => a.name).sort(), ['Dispense_CORN_CHIPS', 'Dispense_POPCORN', 'Dispense_ROASTED_CORN'], 'the three selection clips are in the file');
    for (const n of ['SELECT_POPCORN', 'SELECT_CORN_CHIPS', 'SELECT_ROASTED_CORN', 'DISPENSED_POPCORN', 'DISPENSED_CORN_CHIPS', 'DISPENSED_ROASTED_CORN', 'SNACK_DISPENSER_FLAP'])
      assert.ok(names.has(n), 'machine node: ' + n);
    assert.equal((m.images || []).length, 1, 'the machine labels are one embedded PNG');
    for (const f of files.slice(1)) assert.equal((read(f).images || []).length, 1, f + ' carries its own embedded label');
  }
  assert.ok(html.includes("const VEND = { machines: [], picks: [], props: {}, busy: false, eaten: 0 };"), 'one vending state');
  assert.ok(html.includes('if (vendX()) return;   // a dropped packet or a vending machine takes the X press first'), 'X checks the vending first, from the UI block where toast/modal live');
  assert.ok(html.includes('const r = P3.kiaToggle() || P3.radioToggle()'), 'and the launcher-patched line is untouched');
  assert.ok(html.includes("stepSafe('vending', () => vendUpdate(dt));"), 'the flap is animated from the frame loop');
  assert.ok(html.includes("loadVendMachine({ x: X[4] - 0.55, y: 0, z: OZN + 0.55, yaw: 0, kind: 'snack' })"), 'break-room machine placed where the flat box was');
  assert.ok(html.includes("loadVendMachine({ x: 57.5 + SH_DX, y: FY, z: ZN + 0.52, yaw: 0, kind: 'snack' })"), 'scale-house machine placed in shifted coordinates');
  assert.ok(html.includes('for (const s2 of DRINK_SPOTS) VEND.machines.push('), 'the Milo-Rade machines answer X too');
  assert.ok(html.includes("if (r.water) toast('WATER: out of order - it never stocked water. Dispensing Milo-Rade anyway.');"), 'the WATER button keeps its joke and still drops a Milo-Rade can');
  assert.ok(html.includes("vendSpawn('water_can.glb', 'Water',"), 'the water can is a separate item at each machine');
  assert.ok(html.includes('if (!M || !M.ready || VEND.busy) return false;'), 'repeated presses are ignored while one is dropping');
  assert.ok(!/vendSpawn\([^)]*0\.001/.test(html), 'the embedded preview packet scale is never copied onto a spawned prop');
  assert.ok(html.includes('// deliberately NOT merged: DISPENSED_* and SNACK_DISPENSER_FLAP have to stay addressable as nodes'), 'the machine stays unmerged so its nodes work');
  // the cabinets' own buttons are what you press - no menu, no dialog
  assert.ok(html.includes("const n = byName['SELECT_' + s2.key]; if (n) M.buttons.push({ node: n, file: s2.file, name: s2.name });"), 'the Shifty Food buttons are registered by node');
  assert.ok(html.includes("for (const nm of ['MILO_RADE_SELECT_BUTTON', 'MILO_RADE_SELECT_BUTTON_SECOND'])"), 'so are the Milo-Rade ones');
  assert.ok(html.includes("const w = byName['WATER_SELECT_BUTTON']; if (w) M.buttons.push({"), 'and the WATER button is its own button');
  assert.ok(html.includes('ray.intersectObject(M.root, true)') && html.includes('if (!onIt) return null;'), 'pressing raycasts the cabinet, and looking away does nothing');
  assert.ok(html.includes('const pick = btn || (M.buttons || [])[0];'), 'aim at a button for that item, aim anywhere on the cabinet for the first one');
  assert.ok(!html.includes('Shifty Food · KEEP YOUR BODY RUNNING'), 'the selection menu is gone');
  assert.ok(!html.includes("toast('Dispensing "), 'and nothing is announced when it dispenses');
  {   // the vending engine block must not touch UI-only helpers - calling toast() there shipped a TypeError on v1.97.66
    const a = html.indexOf('const VEND = {'), b = html.indexOf('// ---------- MILO RADE vending machines', a);
    const engine = html.slice(a, b > a ? b : a + 12000);
    for (const fn of ['toast(', 'modal(', 'unlockMouse(']) assert.ok(!engine.includes(fn), 'the vending engine block must not call ' + fn);
    assert.ok(html.includes('vendPress: () => vendPress()'), 'it exposes the press to the UI instead');
    assert.ok(html.includes("const p = P3.vendPickNear();") && html.includes("toast('Collected ' + P3.vendTake(p))"), 'and the UI block does the talking');
  }
  // ---------------------------------------------------------------- ground and floor layering (z-fighting guard)
  // grass is the base plane at y 0; dirt, asphalt and the concrete pads lie above it. The separation must ride on the
  // resolution-relative offset alone: a slope factor is multiplied by the floor's own depth slope, which is unbounded for
  // a plane seen along its own plane, and that is what used to walk the concrete out of the clip range in the distance.
  assert.ok(html.includes('polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: GB(kind)'),
    'the base layer is pushed back and every overlay pulled forward by resolution steps, with no slope term');
  assert.ok(html.includes("const GLAYER = { grass: [0, 8], dirt: [0.016, -8],"), 'grass is the layer that always loses the depth fight: it is the bottom entry of the layer table');
  assert.ok(html.includes("groundMat('dirt', false, EXR - WXR, SZR - NROAD), (EXR + WXR) / 2, GY('dirt'),"), 'the dirt yard takes the dirt layer - BELOW the roads that cross it');
  assert.ok(html.includes("holeySlab(TFX - TFW / 2, TFZ - TFD / 2, TFX + TFW / 2, TFZ + TFD / 2, GY('dirt'),"), 'and so does the pit pad');
  assert.ok(html.includes("padMat(c), x, GY('pad'), z, null)"), 'the station and fermentation pads sit on the pad layer, above dirt and asphalt, with their own offset material');
  assert.ok(html.includes('(X0 + X1) / 2, FY + 0.025, HZ, null, true);   // darker tile floor'), 'the scale-house tile floor clears its slab top');
  assert.ok(html.includes('camera.near = 0.2; camera.updateProjectionMatrix();'), 'and the walk camera near plane is 0.2, not 0.1');
  // the flat concrete pads are thin planes lying on the ground, so they need the same protection as the textured layers:
  // their own offset material (the shared mat(c) must stay untouched) and a real gap above the grass
  assert.ok(html.includes('m.polygonOffset = true; m.polygonOffsetFactor = 0; m.polygonOffsetUnits = GLAYER.pad[1];'), 'pads get their own forward-offset material - resolution steps, never a slope factor');
  assert.ok(html.includes("mat(c).clone(); m.polygonOffset = true"), 'and the shared palette material is not modified');
  assert.ok(html.includes("padMat(c), x, GY('pad'), z, null)"), 'pads sit on the top layer, clear of the grass, dirt and asphalt');
  assert.ok(html.includes('t.anisotropy = Math.min(8, (renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy()) || 4);'), 'ground textures keep their detail at grazing angles');
  {   // the layers, bottom to top, come out of GLAYER and must stay strictly ordered with a real gap
    const tbl = html.slice(html.indexOf('const GLAYER = {'), html.indexOf('const GY = k =>'));
    const rows = [...tbl.matchAll(/(\w+): \[([\d.]+), (-?\d+)\]/g)].map(m => [m[1], +m[2], +m[3]]);
    assert.ok(rows.length === 6, 'six ground layers: ' + rows.map(r => r[0]).join(', '));
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i][1] - rows[i - 1][1] >= 0.005, rows[i][0] + ' clears ' + rows[i - 1][0]);
      assert.ok(rows[i][2] < rows[i - 1][2], rows[i][0] + ' is pulled further forward than ' + rows[i - 1][0]);
    }
  }
  // ---------------------------------------------------------------- riding along: one drives, one sits beside them
  assert.ok(html.includes('function seatPassenger(g, vest)') && html.includes('d.position.set(0.34, RANGER_SEAT_Y, -0.02)'), 'a passenger seat on the other half of the bench (the driver sits at -0.3)');
  assert.ok(html.includes('y: 0, vy: 0, pass: false }'), 'the walk state carries the ride-along flag');
  assert.ok(html.includes('else if (walk.pass) passUpdate(dt); else walkPhysics(dt);'), 'riding along replaces walking, so you are carried rather than walking inside the car');
  assert.ok(html.includes("return (out || V3()).set(0.34, 0.78, -0.02).applyMatrix4(g.matrixWorld);"), 'the seat position comes from the vehicle transform');
  assert.ok(html.includes('if (!walk.on || walk.dead || !V) { passExit(); return; }') && html.includes('const R = NET.rp; if (!R || !R.drive) return null;'), 'if the driver gets out, the passenger steps out too (v1.97.109: checks the other PLAYER is driving; the old check read a flag their Ranger never had and dropped you at once)');
  assert.ok(html.includes("if (walk.pass) { passExit(); return 'Stepped out of the passenger seat'; }"), 'X gets you out');
  assert.ok(html.includes('if (V && !walk.ride && !walk.drive && Math.hypot(walk.x - V.x, walk.z - V.z) < (V.car ? 3.6 : 3.4))'), 'X beside their Ranger (or the car they drive) gets you in');
  assert.ok(html.includes("netSend({ t: 'ps', on: true });") && html.includes("netSend({ t: 'ps', on: false });"), 'the other PC is told both ways');
  assert.ok(html.includes('ps: !!walk.pass,'), 'the 15 Hz player message carries it');
  assert.ok(html.includes('R.ps = !!m.ps;'), 'and it is read back');
  assert.ok(html.includes('R.av.visible = R.walk && !R.drive && !R.mow && !R.ps;'), 'their standing body is hidden while they are seated in your car');
  assert.ok(html.includes('utv.passenger = seatPassenger(P0, VEST_COL[NET.host ? 1 : 0])'), 'and they are drawn in your passenger seat, in their own vest colour');
  assert.ok(html.includes('const show = VIEW.third && walk.on && !walk.dead && !walk.drive && !walk.mow && !walk.pass;'), 'your own third-person body is hidden while you ride');
  assert.ok(html.includes('VIEW.legs = [swing.legL, swing.legR].filter(Boolean);'), 'the walk cycle drives the skinned hip bones once the model is on');
  assert.ok(html.includes('function skinSwing(') && html.includes('skinSwing(l.root, l.b, l.rest, SKIN_X, l.cur)'), 'and swings each bone about the model X axis from its rest pose');
  assert.ok(html.includes('av.traverse(o => { if (o.isMesh) o.userData.body = true; });'), 'box parts are marked, so held items survive the hide');
  assert.ok(html.includes('for (const c of box) if (c.parent) c.parent.remove(c);'), 'and the box body is REMOVED, so nothing can reveal it again');
  assert.ok(html.includes('if (av.userData.rig && av.userData.rig.parent) av.userData.rig.parent.remove(av.userData.rig);'), 'a second dress replaces the rig instead of stacking one on top');
  assert.ok(html.includes('for (const c of av.children.slice()) if (c !== R && !c.userData.item) c.visible = false;'), 'and nothing else on the avatar is left showing, even if a box part escaped the marker');
  assert.ok(html.includes('for (const o of scene.children.slice()) if (o.userData.selfAv) scene.remove(o);'), 'one self avatar, ever: a stray from a half-finished build is swept out of the scene');
  {
    const reader2 = html.slice(html.indexOf('const GLB_CT = {'), html.indexOf('function loadGlbModel('));
    const skinSrc = html.slice(html.indexOf('// ---------- SKINNED NPCs'), html.indexOf('function loadNpcModels() {'));
    const playerSrc = html.slice(html.indexOf('const PLAYER_SKIN = {'), html.indexOf('// ---------- PACKAGE BOILERS'));
    assert.ok(playerSrc.includes('function dressPlayerSkin(') && skinSrc.includes('function skinBone(') && skinSrc.includes('function skinBox('), 'the skinned player helpers are in the game');
    const lib4 = { window: {}, console };
    vm.runInNewContext(scripts.find(x => x.includes('window.THREE=eu')), lib4);
    const T4 = Object.create(lib4.window.THREE, { TextureLoader: { value: class { load() { return new lib4.window.THREE.Texture(); } } } });   // no DOM images in node (both player builds have embedded maps)
    const bytes = [fs.readFileSync('assets/models/player1_3_0.glb'), fs.readFileSync('assets/models/player2_3_0.glb')];
    const buf = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
    const thenable = v => ({ then: cb => { const r = cb(v); return (r && r.then) ? r : thenable(r); }, catch: () => thenable(v) });
    const pctx = { T: T4, console, TextDecoder, VEST_COL: [0xff7a1a, 0xc6e41f], Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
      fetch: url => thenable({ ok: true, arrayBuffer: () => thenable(buf(/squeeg1|player1/.test(url) ? bytes[0] : bytes[1])) }) };
    vm.createContext(pctx);
    vm.runInContext(reader2 + '\n' + skinSrc + '\n' + playerSrc + '\nthis.dressPlayerSkin = dressPlayerSkin; this.skinBox = skinBox; this.skinSwing = skinSwing; this.skinBone = skinBone;', pctx);
    const avatar = () => { const av = new T4.Group(); const box = new T4.Mesh(new T4.BoxGeometry(0.4, 0.6, 0.3), new T4.MeshLambertMaterial({ color: 0xffffff }));
      box.userData.body = true; av.add(box); return av; };
    const a1 = avatar(), a2 = avatar();
    pctx.dressPlayerSkin(a1, 0xff7a1a, {});   // Player 1 (orange vest) -> squeeg1, 1.78 m
    pctx.dressPlayerSkin(a2, 0xc6e41f, {});   // Player 2 (lime vest)   -> squeeg2, 1.65 m
    {   // a held item must survive the dressing; anything else on the avatar must not show through the model
      const a3 = avatar(), held = new T4.Group(), stray = new T4.Group();
      held.userData.item = true; a3.add(held); a3.add(stray);
      pctx.dressPlayerSkin(a3, 0xff7a1a, {});
      assert.equal(held.visible, true, 'a held item stays visible on a dressed avatar');
      assert.equal(stray.visible, false, 'and every other child of the avatar is switched off');
    }
    const rigOf = av => av.userData.rig;
    const g1 = rigOf(a1), g2 = rigOf(a2);
    assert.ok(g1 && g2, 'a model was added to each avatar');
    assert.equal(a1.children.some(c => c.userData.body), false, 'the box body is gone, the model stands in for it');
    const H = g => pctx.skinBox(g).max.y - pctx.skinBox(g).min.y;
    assert.ok(H(g1) > 1.74 && H(g1) < 1.86, 'Player 1 is 1.78 m tall, up to 8 cm more to the top of the 3.0 build\'s hard hat (' + H(g1).toFixed(2) + ')');
    assert.ok(H(g2) > 1.61 && H(g2) < 1.73, 'Player 2 is 1.65 m tall, plus her hard hat (' + H(g2).toFixed(2) + ')');
    assert.ok(g1 !== g2, 'the two players are built from different files');
    assert.ok(Math.abs(g1.rotation.y - Math.PI) < 1e-6, 'and turned to face the way the box avatars face');
    let shadows = 0; g1.traverse(o => { if (o.isMesh && o.castShadow) shadows++; }); assert.equal(shadows, 0, 'no shadow casting on the skinned player');
    {   // a seated player folds their legs: the head drops and the feet stay near the floor
      const a4 = avatar(); pctx.dressPlayerSkin(a4, 0xff7a1a, { sit: true }); const g4 = rigOf(a4);
      const bb4 = pctx.skinBox(g4); assert.ok(Math.abs(bb4.min.y) < 0.06, 'seated feet stay on the floor (' + bb4.min.y.toFixed(3) + ')');
      assert.ok(H(g4) < 1.5, 'and the model is shorter once its legs are folded (' + H(g4).toFixed(2) + ' m)');
    }
    {   // the walk cycle: swinging the hip bones moves the feet in opposite directions (an alternating gait)
      const a5 = avatar(); let cap = null;
      pctx.dressPlayerSkin(a5, 0xff7a1a, { onRig: (R, root, swing) => { cap = { root, swing }; } });
      const X = new T4.Vector3(1, 0, 0), footZ = n => { const v = new T4.Vector3(); pctx.skinBone(cap.root, n).getWorldPosition(v); return v.z; };
      const footY = n => { const v = new T4.Vector3(); pctx.skinBone(cap.root, n).getWorldPosition(v); return v.y; };
      const zL0 = footZ('LeftFoot'), zR0 = footZ('RightFoot');
      pctx.skinSwing(cap.root, cap.swing.legL.b, cap.swing.legL.rest, X, 0.5);   // left forward
      pctx.skinSwing(cap.root, cap.swing.legR.b, cap.swing.legR.rest, X, -0.5);  // right back
      const dzL = footZ('LeftFoot') - zL0, dzR = footZ('RightFoot') - zR0;
      assert.ok(Math.abs(dzL) > 0.05 && Math.abs(dzR) > 0.05, 'swinging the hips moves the feet (' + dzL.toFixed(2) + ' / ' + dzR.toFixed(2) + ')');
      assert.ok(Math.sign(dzL) !== Math.sign(dzR), 'left and right feet move in opposite directions');
      const y0 = footY('LeftFoot');
      pctx.skinSwing(cap.root, cap.swing.kneeL.b, cap.swing.kneeL.rest, X, 0.55);   // and bending the knee lifts the foot off the ground
      assert.ok(footY('LeftFoot') - y0 > 0.1, 'bending the knee lifts the foot (' + (footY('LeftFoot') - y0).toFixed(2) + ' m)');
    }
  }
  // cross-script wiring: the frame loop lives in a later script block than the renderer, so the HUD readout has to go
  // through the Plant3D bridge - reading `renderer` directly there threw a ReferenceError once a second (v1.97.60).
  assert.ok(html.includes('get drawCalls() { return renderer ? (PERF.dc || renderer.info.render.calls) : 0; }'), 'the renderer counters are exposed on Plant3D');
  assert.ok(html.includes('get perf() { return PERF; }, get tier() { return TIER; },'), 'and so are the frame budget and the quality tier');
  assert.ok(html.includes('P3.perf.frame = performance.now() - now;'), 'the frame-loop bridge feeds the frame time back into the budget (cross-block: PERF lives with the renderer)');
  assert.ok(html.includes('get triCount() { return renderer ? (PERF.tri || renderer.info.render.triangles) : 0; }'), 'triangles too');
  assert.ok(html.includes('+ P3.drawCalls +'), 'and that is what the FPS readout uses');
  { const at = html.indexOf("$('fps').textContent");
    const line = html.slice(at, html.indexOf(';', at));
    assert.ok(!line.includes('renderer'), 'the readout never touches renderer itself: ' + line.slice(0, 60)); }

  // the merge itself, run for real: the game's own glTF reader + mergeModel on the boiler file
  {
    const reader = html.slice(html.indexOf('const GLB_CT = {'), html.indexOf('function loadGlbModel('));
    const merger = html.slice(html.indexOf('function mergeModel(root, castShadow, skip) {'), html.indexOf('function rigPivot('));
    assert.ok(reader.includes('function glbBuild(') && merger.includes('function mergeModel('), 'both helpers are in the game');
    const lib3 = { window: {}, console };
    vm.runInNewContext(scripts.find(x => x.includes('window.THREE=eu')), lib3);   // the engine bundle the other suites use
    const T3 = lib3.window.THREE, mctx = { console, TextDecoder, T: T3 };
    vm.createContext(mctx);
    vm.runInContext(reader + '\n' + merger, mctx);
    const model = mctx.glbBuild(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength));
    const count = () => { let meshes = 0, tris = 0, casters = 0;
      model.root.traverse(o => { if (!o.isMesh) return; meshes++; const g3 = o.geometry; tris += (g3.index ? g3.index.count : g3.attributes.position.count) / 3; if (o.castShadow) casters++; });
      return { meshes, tris, casters }; };
    model.root.updateMatrixWorld(true);
    const before = count(), bbBefore = new T3.Box3().setFromObject(model.root);
    mctx.mergeModel(model.root, false);
    model.root.updateMatrixWorld(true);
    const after = count(), bbAfter = new T3.Box3().setFromObject(model.root);
    assert.ok(before.meshes > 250, 'the raw model is ' + before.meshes + ' separate parts');
    assert.ok(after.meshes <= 12, 'merged down to ' + after.meshes + ' submissions');
    assert.ok(Math.abs(after.tris - before.tris) < 1, 'every triangle survives (' + before.tris + ' -> ' + after.tris + ')');
    assert.ok(bbAfter.min.distanceTo(bbBefore.min) < 1e-3 && bbAfter.max.distanceTo(bbBefore.max) < 1e-3, 'and the bounds do not move');
    assert.equal(after.casters, 0, 'and nothing goes into the shadow pass');
  }
}

console.log('PASS: the outage stops the plant model dead (conveyors, pumps, mills, RTO) and the pivot keeps running on its own diesel until the day tank is dry');
