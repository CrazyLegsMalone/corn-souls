// Run from the test/ directory: node validate-two-player.cjs
// v1.97.109: 2 player sync. Two copies of the game's own world-sync and creature code run side by side (host and guest),
// their messages piped to each other, with three.js and small stubs: the host's power outage, game clock, darkness, light
// events and corn field creatures reach the guest (and the guest's changes reach the host without being flipped back),
// creatures are run by the host for both players (the guest only mirrors them, its hits count on the host, the host's
// creature biting the guest bites the guest, the guest's corn ears lure them), plus the ride-along wiring.
// v1.97.181: the hunt-and-bite step no longer depends on where a stalker happened to wander: both it and the guest are put on
// a fixed spot well inside the corn, so the suite cannot land the guest just outside the field (where a stalker shadows but
// never bites) and time out. That was the one run in forty that failed on CI.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const slice = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const clockSrc = slice('// ---------- GAME CLOCK', 'dayT = 99;   // re-light right away\n}') + 'dayT = 99;   // re-light right away\n}';
const creepSrc = slice("// ---------- THE NORTH CORN FIELD'S CREATURES (v1.97.108)", '\n// pigeon coo, synthesized like the train');
const syncSrc = slice('// ---------- WORLD SYNC (v1.97.109)', '\nfunction netRecv(m) {');
const recvSrc = slice('\nfunction netRecv(m) {', '\nfunction netUpdate(dt) {');
const mkModel = bodyName => { const root = new T.Group(), byName = {}, m = new T.MeshLambertMaterial({ color: 0xc9a032 });
  const body = new T.Mesh(new T.BoxGeometry(1.8, 2.4, 1.8), m); body.name = bodyName; body.position.y = 2.6; root.add(body); byName[bodyName] = body;
  for (let i = 0; i < 6; i++) { const h = new T.Group(); h.name = 'Leg_Hip_' + i; root.add(h); const s = new T.Mesh(new T.BoxGeometry(0.2, 1, 0.2), m); s.position.set(Math.cos(i), -0.5, Math.sin(i)); h.add(s); }
  return { root, byName }; };
const make = host => {
  const q = [], notes = [];
  const ctx = { T, Math, Date, NROAD: -134, scene: new T.Scene(), camera: new T.PerspectiveCamera(), V3: (x, y, z) => new T.Vector3(x, y, z), tv: new T.Vector3(), tv2: new T.Vector3(),
    walk: { on: true, dead: null, drive: false, pass: false, x: 300, z: 300, y: 0, yaw: 0 }, root: {}, floorAt: () => 0, pushOut() {}, puff() {}, layBody() {}, tsnd: { ctx: null }, kiaNoise() {}, utv: { g: null },
    DMG_NOTIFY: m => notes.push(m), loadGlbModel: (url, cb) => cb(mkModel(/daddy/.test(url) ? 'Daddy_Cob_Torso' : 'Cob_Body')),
    NET: { host, conn: { open: true, send: o => q.push(JSON.parse(JSON.stringify(o))) }, rp: null }, POWER_OUTAGE: { on: false },
    LIGHT: { darkTo: 0, darkHold: 0, darkRate: 2, flick: null, kill: null, ref: [0, 0, 0] }, O: {}, KIA: {}, q, notes };
  ctx.netSend = o => { try { if (ctx.NET.conn && ctx.NET.conn.open) ctx.NET.conn.send(o); } catch (e) {} };
  ctx.setPowerOutage = on => { ctx.POWER_OUTAGE.on = !!on; return on; };
  ctx.rollStates = () => ctx.rd || ''; ctx.rollApply = s => { ctx.rdApplied = s; };   // roll-up / mesh door states ride the world sync (v1.97.137; validate-mesh-doors.cjs)
  ctx.lightsDark = (a, f, h) => { ctx.LIGHT.darkTo = a; ctx.LIGHT.darkRate = 3 / (f || 1.5); ctx.LIGHT.darkHold = h || 0; return a; };
  vm.createContext(ctx);
  vm.runInContext(html.slice(html.indexOf('const HP = { max'), html.indexOf('function takeSquish(')) + 'let dayT = 0;\n' + clockSrc + '\n' + creepSrc + '\n' + syncSrc + '\n' + recvSrc + `
    this.GT = GT; this.gameDate = gameDate; this.gameTimeSet = gameTimeSet; this.CREEP = CREEP; this.CFIELD = CFIELD; this.loadCreeps = loadCreeps; this.updateCreeps = updateCreeps;
    this.creepHurt = creepHurt; this.creepGuest = creepGuest; this.wsState = wsState; this.wsLock = wsLock; this.WSYNC = WSYNC; this.netRecv = netRecv; this.wsClock = wsClock; this.creepEars = creepEars;`, ctx);
  return ctx;
};
// netRecv touches a few things that are not part of this test; give them inert stand-ins
for (const n of ['makeRagdoll', 'dmgNet', 'smashNet', 'crackAt', 'kiaToggle', 'radioToggle', 'srNet', 'coolerHandle', 'nh3Valve', 'saHit', 'saPatch', 'nh3Hit', 'swapRangers', 'railPhoneApply', 'setWeather', 'netRemote']) globalThis[n] = () => {};
const H = make(true), G = make(false);
for (const c of [H, G]) for (const n of ['makeRagdoll', 'dmgNet', 'smashNet', 'crackAt', 'kiaToggle', 'radioToggle', 'srNet', 'coolerHandle', 'nh3Valve', 'saHit', 'saPatch', 'nh3Hit', 'swapRangers', 'railPhoneApply', 'setWeather', 'netRemote']) c[n] = () => {};
const pipe = () => { for (const [from, to] of [[H, G], [G, H]]) { const ms = from.q.splice(0); for (const m of ms) to.netRecv(m); } };
const step = (sec, dt = 0.05) => { for (let t = 0; t < sec; t += dt) { for (const c of [H, G]) { for (const k in c.WSYNC.lock) c.WSYNC.lock[k] = Math.max(0, c.WSYNC.lock[k] - dt); c.updateCreeps(dt); }
  if ((H.WSYNC.sendT += dt) > 0.25) { H.WSYNC.sendT = 0; H.netSend(H.wsState()); } pipe(); } };
H.loadCreeps(); G.loadCreeps();
assert.equal(G.creepGuest(), true, 'the guest knows it is the guest'); assert.equal(H.creepGuest(), false);

// the host's world reaches the guest
step(0.6);
const ids = c => c.CREEP.list.map(q => q.id + q.kind).sort().join();
assert.equal(ids(G), ids(H), 'the guest has the host\'s creatures');
step(2); for (const c of H.CREEP.list) { const g = G.CREEP.list.find(q => q.id === c.id); assert.ok(Math.hypot(g.x - c.x, g.z - c.z) < 1.5, 'and they stand where the host\'s do'); }
H.setPowerOutage(true); step(0.5); assert.equal(G.POWER_OUTAGE.on, true, 'host power outage: the guest goes dark too');
H.lightsDark(0.88, 2.5, 20); H.gameTimeSet({ hour: 3 }); step(0.5);
assert.equal(G.LIGHT.darkTo, 0.88, 'scripted darkness'); assert.equal(G.gameDate().getHours(), 3, 'the game clock'); assert.equal(G.GT.real, false);
H.LIGHT.kill = { t: 10, T: 15, r: 45, x: 5, z: 6 }; step(0.5); assert.ok(G.LIGHT.kill && G.LIGHT.kill.r === 45 && G.LIGHT.kill.x === 5, 'a blackout');
H.gameTimeSet({ real: true }); step(0.5); assert.equal(G.GT.real, true, 'back to real time');

// the guest's own change: sent at once, not flipped back by the host's older state
G.setPowerOutage(false); G.wsLock('po'); G.netSend({ t: 'po', on: false });
H.netSend(H.wsState());   // an old state (still on) already in flight
pipe(); assert.equal(G.POWER_OUTAGE.on, false, 'the guest\'s own change is not flipped back by a state the host sent before it heard'); assert.equal(H.POWER_OUTAGE.on, false, 'and the host follows');
step(2); assert.equal(G.POWER_OUTAGE.on, false); assert.equal(H.POWER_OUTAGE.on, false);
G.lightsDark(0.5, 1, 5); G.wsLock('dk'); G.netSend({ t: 'dk', a: 0.5, f: 1, h: 5 }); step(0.4); assert.equal(H.LIGHT.darkTo, 0.5, 'guest darkness reaches the host'); step(2); assert.equal(G.LIGHT.darkTo, 0.5);
G.gameTimeSet({ hour: 22 }); G.wsLock('gt'); G.netSend({ t: 'gt', v: G.wsClock() }); step(0.5); assert.equal(H.gameDate().getHours(), 22, 'guest time change reaches the host'); step(2); assert.equal(G.gameDate().getHours(), 22);
G.netSend({ t: 'le', k: 'flick', s: 4, r: 30, x: 1, z: 2 }); step(0.1); assert.ok(H.LIGHT.flick && H.LIGHT.flick.r === 30, 'guest flicker reaches the host');

// creatures: the guest's hits count on the host
const c1 = H.CREEP.list[0], g1 = G.CREEP.list.find(q => q.id === c1.id), hp0 = c1.hp;
G.creepHurt(g1, 3); assert.equal(g1.hp, hp0, 'the guest does not keep score itself'); step(0.4); assert.equal(c1.hp, hp0 - 3, 'the host takes the damage'); assert.equal(g1.hp, hp0 - 3, 'and the guest sees it');
// the host's creature hunts the guest when the guest is in the corn, and bites the guest (not the host)
// v1.97.181: stand both of them on a fixed point well inside the corn. The old line put the guest 6 m north of wherever the first
// stalker had wandered to, and when it had drifted up to the field edge the guest landed 2 m outside the corn - where a stalker
// only ever shadows you ('stalk') and never bites, so the loop below timed out about one run in forty (CI caught it, local runs
// usually did not). Where the monster is put and where you are put are not what this assertion is about; the bite is.
const fx = (H.CFIELD.x0 + H.CFIELD.x1) / 2, fz = (H.CFIELD.z0 + H.CFIELD.z1) / 2;
assert.ok(H.CFIELD.z1 - fz > 12 && fz - H.CFIELD.z0 > 12, 'the corn field is deep enough to stand well inside it');
c1.x = fx - 3; c1.z = fz + 6;   // 6.7 m away, both in the corn; the host himself is at 300, 300, out of it
H.NET.rp = { walk: true, drive: false, ps: false, x: fx, z: fz, ears: null }; G.walk.x = fx; G.walk.z = fz;
for (let i = 0; i < 200 && !G.CREEP.bites; i++) { H.NET.rp.x = G.walk.x; H.NET.rp.z = G.walk.z; step(0.05); }
assert.ok(G.CREEP.bites >= 1, 'the guest got bitten by the host\'s creature'); assert.equal(H.CREEP.bites, 0, 'the host did not'); assert.equal(c1.state, 'hunt');
assert.ok(G.notes.some(n => /A cob stalker bit you!/.test(n)), 'and the guest is told');
// the guest's corn ear lures the host's creature; when it eats it, the guest puts the ear back in its can
H.NET.rp = { walk: false, drive: false, ps: false, x: 999, z: 999, ears: [[3, c1.x + 3, H.CFIELD.z1 + 15]] }; G.walk.x = 300; G.walk.z = 300;
G.CORN_PROPS_STATE = { items: [0, 1, 2, 3].map(() => ({ type: 'ear', g: new T.Group(), held: false, inCan: false, sleep: true, v: new T.Vector3() })), cans: [Object.assign(new T.Group(), {})] };
G.CORN_PROPS_STATE.cans[0].position.set(60, 0, -60);
let out = false; for (let i = 0; i < 600 && !G.CORN_PROPS_STATE.items[3].inCan; i++) { step(0.05); if (c1.z > H.CFIELD.z1 + 1) out = true; }
assert.ok(out, 'drawn out of the field by the guest\'s ear'); assert.equal(G.CORN_PROPS_STATE.items[3].inCan, true, 'it ate it: the guest\'s ear is back in the guest\'s can');
// Daddy, on both
for (const c of H.CREEP.list) if (c.kind === 'stalker') H.creepHurt(c, 99);
step(6); assert.ok(H.CREEP.list.some(c => c.kind === 'daddy'), 'Daddy on the host'); step(0.5); assert.ok(G.CREEP.list.some(c => c.kind === 'daddy'), 'and on the guest'); assert.equal(G.CREEP.phase, 'boss');

// v1.97.164, owner: "Make sure all the new features are synced with 2 player"
{ for (const c of [H, G]) c.wallSegs = [];
  const daddy = H.CREEP.list.find(c => c.kind === 'daddy'); if (daddy) H.creepHurt(daddy, 999); step(0.5);
  // a debug stalker the GUEST asks for: put down in front of the guest, and it goes for the guest even with the host in the corn
  H.walk.x = (H.CFIELD.x0 + H.CFIELD.x1) / 2; H.walk.z = (H.CFIELD.z0 + H.CFIELD.z1) / 2; G.walk.x = 400; G.walk.z = 400; G.walk.yaw = 0; G.CREEP.bites = 0; H.CREEP.bites = 0;
  H.NET.rp = { walk: true, drive: false, ps: false, x: 400, z: 400, ears: null };
  assert.match(vm.runInContext("creepDebug('near')", G), /Asked the host/); step(0.3);
  const fs1 = H.CREEP.list.find(c => c.free && c.hp > 0); assert.ok(fs1 && Math.abs(fs1.x - 400) < 0.5 && Math.abs(fs1.z - 391) < 1, 'it comes out 9 m in front of the guest (host side)');
  step(0.3); assert.ok(G.CREEP.list.some(c => c.id === fs1.id), 'and the guest sees it (next world update)');
  for (let i = 0; i < 200 && !G.CREEP.bites; i++) { H.NET.rp.x = G.walk.x; H.NET.rp.z = G.walk.z; step(0.05); }
  assert.ok(G.CREEP.bites >= 1 && fs1.state === 'hunt', 'it hunts and bites the guest, though the host is standing in the corn (it used to keep after the host)');
  H.creepHurt(fs1, 99); step(0.3);
  // nibblers: the guest sees them burst, sees the dead stay, sees zombies get up green - and is told, like the host
  const fsNibs = H.CREEP.list.filter(c => c.kind === 'nibbler' && c.grp === H.CREEP.ngid); for (const c of fsNibs) H.creepHurt(c, 99);   // (the debug stalker's own five, out of the way)
  H.walk.x = 900; H.walk.z = 900; H.NET.rp = { walk: false, drive: false, ps: false, x: 999, z: 999, ears: null }; G.walk.x = 0; G.walk.z = -320; G.notes.length = 0; step(0.3);
  vm.runInContext('nibBurst({ x: 0, z: -300 })', H); const grp = H.CREEP.ngid, mine = H.CREEP.list.filter(c => c.grp === grp);
  step(0.6); assert.ok(G.notes.some(n => /Nibblers burst out/.test(n)), 'the guest near a burst is told');
  H.creepHurt(mine[0], 99); H.creepHurt(mine[1], 99); step(0.6);
  const gd = G.CREEP.list.find(c => c.id === mine[0].id); assert.ok(gd && gd.state === 'dead', 'the guest sees the corpse'); step(10); assert.ok(G.CREEP.list.includes(gd) && gd.state === 'dead', 'and it stays');
  H.CREEP.ngrp.get(grp).t = 19.95; step(2.5);
  const gz = G.CREEP.list.find(c => c.id === mine[0].id); assert.ok(mine[0].zombie && gz.zombie && gz.state !== 'dead', 'the zombie gets up on both');
  assert.ok(G.notes.some(n => /getting back up/.test(n)), 'and the guest is told');
  // a guest joining with corpses already lying there: no death scream for each (they arrive already down)
  H.creepHurt(mine[1], 99); step(1);   // (a zombie that goes down stays down: a corpse for the join)
  const G2 = make(false); for (const n of ['makeRagdoll', 'dmgNet', 'smashNet', 'crackAt', 'kiaToggle', 'radioToggle', 'srNet', 'coolerHandle', 'nh3Valve', 'saHit', 'saPatch', 'nh3Hit', 'swapRangers', 'railPhoneApply', 'setWeather', 'netRemote']) G2[n] = () => {};
  G2.loadCreeps(); G2.netRecv(H.wsState()); const c2 = G2.CREEP.list.find(c => c.id === mine[1].id);
  assert.ok(c2 && c2.state === 'dead' && c2.deadT >= 5, 'a corpse that was already there arrives down and quiet');
  assert.ok(!G2.notes.some(n => /Nibblers burst out/.test(n)), 'and joining is not news of a burst'); }
// the mini map shows the other player wherever they are - on foot or driving
assert.ok(html.includes("{ const R = NET.rp; if (R && NET.conn && NET.conn.open && (R.walk || R.drive || R.ps)) { g.fillStyle = '#ff4fa2';") && html.includes('g.arc(R.x, R.z, 4.5 * dpr / k'), 'mini map: the other player\'s dot follows their position, on foot or in a vehicle');

// wiring
assert.ok(html.includes("peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' })"), 'reliable channel: one-off messages are no longer lost');
assert.ok(html.includes("if (NET.host && (WSYNC.sendT += rdt) > 0.25) { WSYNC.sendT = 0; netSend(wsState()); }"), 'the host sends its world 4x a second');
assert.ok(html.includes("if (!NET.host) { const ce = creepEars(); if (ce) o.ce = ce; }"), 'the guest reports its corn ears');
for (const t of ["m.t === 'ws'", "m.t === 'le'", "m.t === 'dk'", "m.t === 'gt'", "m.t === 'ch'", "m.t === 'cbt'", "m.t === 'cea'", "m.t === 'cdbg'"]) assert.ok(recvSrc.includes(t), 'handles ' + t);
assert.ok(html.includes("time: { set: o => { gameTimeSet(o); wsLock('gt'); netSend({ t: 'gt', v: wsClock() }); }"), 'time controls are shared');
assert.ok(html.includes("dark: (a, f, h) => { wsLock('dk'); netSend({ t: 'dk', a, f, h }); return lightsDark(a, f, h); },"), 'darkness is shared');
assert.ok(html.includes("netSend({ t: 'le', k: 'kill',") && html.includes("netSend({ t: 'le', k: 'flick',"), 'flicker and blackout are shared');
assert.ok(html.includes("const r = setPowerOutage(!!on); if (typeof wsLock === 'function') wsLock('po');"), 'the power switch locks out the host\'s older state for a moment');
// v1.97.110: you can be shot in a vehicle or on the mower; a tag knocks you out of it first
{ const tb = slice('function netTargetBody(R) {', '\nfunction updateBalls(dt) {');
  for (const k of ['if (R.av.visible) return [R.x, R.y + 0.9, R.z, 0.95];', 'if (R.drive && R.car && O.cars && O.cars[R.car[0]])', 'if (R.drive && NET.rr && NET.rr.g)', 'if (R.ps && utv.g)', 'if (R.mow && O.shedMower && O.shedMower.g)']) assert.ok(tb.includes(k), 'a paintball can find them: ' + k.slice(0, 40));
  const tc = { T, Math, O: { cars: [], shedMower: { g: { position: new T.Vector3(10, 0.2, 20) } } }, NET: { rr: null }, utv: { g: null }, walk: {}, CAR_ON: null };
  vm.createContext(tc); vm.runInContext(tb + '\nthis.f = netTargetBody;', tc);
  assert.deepEqual(Array.from(tc.f({ av: { visible: false }, mow: [10, 0.2, 20, 0, 1] })), [10, 0.2 + 0.95, 20, 0.6], 'on the mower: the rider is a target');
  assert.equal(tc.f({ av: { visible: false } }), null, 'nowhere: no target');
  assert.ok(html.includes("if (walk.pass) passExit(); if (walk.mow) mowExit(true); if (walk.drive) utvExit();"), 'tagged in a vehicle: out of it, then down'); }
assert.ok(!html.includes('NET.rp && NET.rp.av.visible) {   // my paintball'), 'the old on-foot-only check is gone');
// riding along
{ const pu = slice('function passUpdate(dt) {', '\nfunction passExit() {');
  assert.ok(!/Q\.drive/.test(pu) && html.includes('const R = NET.rp; if (!R || !R.drive) return null;'), 'riding along checks the other PLAYER is driving (it read a flag their Ranger never had, so you fell out at once)');
  assert.ok(pu.includes('const s = carSeat(V.car, -1); walk.x = s.x; walk.z = s.z; walk.y = s.y - EYE;'), 'in a car you sit in its passenger seat, eyes at the passenger\'s eye'); }
assert.ok(html.includes("return (NET.rp.drive && rideToggle()) || 'The other player is driving that one';"), 'X at the car they are driving: ride along (it used to just say they were driving it)');
assert.ok(html.includes("carFigure(CAR_ON, 'passFig', -1).visible = true;") && html.includes("carFigure(c, 'drvFig', 1).visible = !!theirs;"), 'the driver sees you in the passenger seat, you see them at the wheel');

// a car index arrives over the network: it has to be checked, or a malformed or cross-version message throws every time
assert.ok(html.includes('const c = m.car && O.cars ? O.cars[m.car[0]] : null; if (!c) R.car = null;'), 'their ride message bounds-checks the car index');
assert.ok(html.includes('const c = O.cars ? O.cars[m.i] : null; if (c) {'), 'and so does the car position message');
assert.ok(html.includes("const c = O.cars && typeof remote === 'object' ? O.cars[remote.i] : null; if (c) {"), 'and the stereo car index');

console.log('PASS: host world state (power, clock, darkness, light events, creatures) reaches the guest, guest changes reach the host and stick, host-run creatures for both players (hits, bites, ear lure, Daddy), ride-along wiring');
