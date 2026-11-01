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

  ctx.updatePivot(3600);                                  // one hour of running
  assert.ok(Math.abs(G.fuel - 118.8) < 1e-6, 'it sips 1.2 L an hour, got ' + G.fuel);
  assert.ok(P.g.rotation.y < 0, 'the arm turns while the engine runs');
  assert.ok(P.water[0].offset.y > 0, 'and the water scrolls');

  // the plant outage does not touch it: the pivot runs on its own diesel
  G.fuel = 0.5;
  let told = null; ctx.PIVOT_NOTIFY = m => { told = m; };
  const rot = P.g.rotation.y;
  ctx.updatePivot(3600);
  assert.equal(G.running, false, 'it stops when the tank runs dry');
  assert.ok(told && /diesel/i.test(told), 'and the player is told: ' + told);
  ctx.updatePivot(60);
  assert.equal(P.g.rotation.y, rot, 'the arm stays where it stopped');
  assert.ok(P.sheets.every(w => w.visible === false), 'the water is off');

  // refuelling with a diesel can brings it back
  C.charge = 20;
  assert.ok(/starts up/.test(ctx.pivotGenAction('pour')), 'pouring diesel restarts the engine');
  assert.equal(G.fuel, 20, 'the can holds 20 L');
  assert.equal(C.charge, 0, 'and is empty afterwards');
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
  assert.ok(html.includes('POWER_OUTAGE.on && S === STACKS[0] ? 0 : S.rate'), 'the RTO stops smoking');
  assert.ok(html.includes('(OUT_F - C.T) * (0.0025 + 0.006 * openSum) * dt'), 'the cooler warms with no compressor');

  // the pivot gen-set: prop, fuel, sound and the interaction
  assert.ok(html.includes('const PIVOT_GEN = { x: 0, z: 0, r: 2.8, fuel: 120, cap: 120, burn: 1.2'), 'tank and burn rate');
  assert.ok(html.includes('const CAN = { cap: 20, charge: 20 }'), 'the diesel can holds 20 L');
  assert.ok(html.includes('// ---- diesel gen-set on its own pad beside the pivot point'), 'the gen-set is built');
  assert.ok(html.includes('1 - (d - 25) / 55'), 'the diesel is only audible near the corn circle');
  assert.ok(html.includes('pivotGenSound();'), 'the engine sound runs every frame');
  assert.ok(html.includes('pivotGenNear: () => pivotGenNear()'), 'the tank is reachable from the world');
  assert.ok(html.includes('if (P3.pivotGenNear()) { pivotGenMenu(); return; }'), 'E opens the gen-set menu');
  assert.ok(html.includes("P3.pivotGenAction('dump')"), 'a debug row can empty the tank');
  assert.ok(html.includes('set pivotNotify(f) { PIVOT_NOTIFY = f; }'), 'the out-of-diesel notice reaches the HUD');
}

console.log('PASS: the outage stops the plant model dead (conveyors, pumps, mills, RTO) and the pivot keeps running on its own diesel until the day tank is dry');
