// Run from the test/ directory: node validate-corn-sync.cjs
// v1.97.111: 2 player corn ears and cubes. Two copies of the launcher's own corn prop engine (host and guest) run side by
// side with their messages piped together: whoever picks one up drives it and the other PC carries it along and cannot
// grab it; a thrown one comes to rest in the same spot on both; the host's resting snapshot brings a late joiner's yard in
// line without undoing a move the guest just made; and if the other player leaves, what they had falls. Also checks the
// game's hooks and that carrying a dead critter puts the gun away.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), loader = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cornSrc = JSON.parse(loader.match(/const cornEngine=("(?:[^"\\]|\\.)*");/)[1]);
const make = host => {
  const q = [];
  const cam = { position: new T.Vector3(0, 1.6, 0), dir: new T.Vector3(0, 0, -1), updateMatrixWorld() {}, getWorldDirection(v) { return v.copy(this.dir); } };
  const ctx = { T, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), console, setTimeout() {}, scene: new T.Scene(), extraCols: [], colliders: [], wallSegs: [],
    floorAt: () => 0, puff() {}, splatSnd() {}, gunClick() {}, SH_DX: 0, NROAD: -134, SCZ_OUT: -60, GDX: 0, GDZ: 0, BODY_R: 0.28,
    walk: { on: true, drive: false, mow: false, ride: false, dead: false, x: 0, y: 0, z: 0, yaw: 0 }, camera: cam,
    NET: { host, conn: { open: true, send: o => q.push(JSON.parse(JSON.stringify(o))) } }, q };
  ctx.netSend = o => { if (ctx.NET.conn && ctx.NET.conn.open) ctx.NET.conn.send(o); };
  vm.createContext(ctx);
  vm.runInContext(cornSrc + '\nthis.S = CORN_PROPS_STATE; this.cornBuild = cornBuild; this.cornInteract = cornInteract; this.cornThrow = cornThrow; this.cornUpdate = cornUpdate; this.cornNetRecv = cornNetRecv; this.cornNetDrop = cornNetDrop;', ctx);
  ctx.cornBuild(); return ctx;
};
const H = make(true), G = make(false);
let peers = [H, G];
const pipe = () => { for (const [a, b] of [[peers[0], peers[1]], [peers[1], peers[0]]]) for (const m of a.q.splice(0)) if (m.t === 'cp') b.cornNetRecv(m); };
const step = (sec, dt = 0.02) => { for (let t = 0; t < sec; t += dt) { for (const c of peers) c.cornUpdate(dt); pipe(); } };
const look = (c, t) => { const p = t.g.position; c.camera.position.set(p.x, 1.6, p.z + 1.6); c.camera.dir.set(0, p.y - 1.6, -1.6).normalize(); };
const near = (a, b, e = 0.05) => a.distanceTo(b) < e;

assert.equal(H.S.props.length, 22, 'two stations: 4 cubes and 7 ears each'); assert.equal(G.S.props.length, H.S.props.length);
assert.ok(H.S.props.every((t, i) => t.nid === i && near(t.g.position, G.S.props[i].g.position)), 'built in the same order and places on both PCs (so an id means the same prop)');

// the guest picks up a cube: it is the guest's, the host sees it carried and cannot grab it
const gc = G.S.props[0], hc = H.S.props[0];
look(G, gc); assert.match(G.cornInteract(), /Picked up corn cube/); assert.equal(gc.net, 'me');
G.camera.position.set(10, 1.6, 10); G.camera.dir.set(1, 0, 0); step(0.6);
assert.equal(hc.net, 'them', 'on the host it is the guest\'s'); assert.equal(hc.rHeld, true, 'and in the guest\'s hands');
assert.ok(near(hc.g.position, gc.g.position, 0.2), 'carried along where the guest holds it (' + hc.g.position.toArray().map(v => v.toFixed(2)) + ')');
assert.equal(hc.col[0], 1e5, 'no collider while it is in someone\'s hands');
look(H, hc); assert.notEqual(H.cornInteract() || '', 'Picked up corn cube — fire to throw', 'the host cannot take it out of the guest\'s hands'); assert.equal(H.S.held, null);
// thrown: it comes to rest in the same spot on both, and then belongs to nobody
assert.equal(G.cornThrow(), true); step(4);
assert.equal(gc.sleep, true, 'it landed'); assert.equal(gc.net, null, 'the guest let go of it after one last word');
assert.ok(hc.net == null && hc.sleep && !hc.rHeld, 'the host has it at rest too'); assert.ok(near(hc.g.position, gc.g.position, 0.01), 'in the same spot (' + gc.g.position.toArray().map(v => v.toFixed(2)) + ')');
assert.ok(gc.g.position.x > 11, 'thrown the way the guest faced');
// now the host can pick it up, and the guest sees that
look(H, hc); assert.match(H.cornInteract(), /Picked up corn cube/); step(0.3); assert.equal(gc.net, 'them'); assert.equal(gc.rHeld, true);
assert.match(H.cornInteract(), /Set down corn/); step(3); assert.ok(gc.net == null && near(gc.g.position, hc.g.position, 0.01), 'set down: at rest in the same spot on both');

// an ear out of the can: taken from the can on one PC, gone from the can on the other
const can = G.S.cans[0]; G.camera.position.set(can.position.x, 1.6, can.position.z + 1.6); G.camera.dir.set(0, -0.55, -1.6).normalize();
assert.match(G.cornInteract(), /Picked up corn ear/); const ge = G.S.held, he = H.S.props[ge.nid]; assert.equal(he.inCan, true); step(0.3); assert.equal(he.inCan, false, 'out of the host\'s can too');
G.camera.dir.set(0, 0, 1); G.cornThrow(); step(4); assert.ok(near(he.g.position, ge.g.position, 0.01) && he.sleep, 'the ear lies in the same spot on both');

// a late joiner: the host's resting snapshot brings its yard in line
const L = make(false); peers = [H, L]; step(2.5);
assert.ok(H.S.props.every((t, i) => near(t.g.position, L.S.props[i].g.position, 0.02)), 'the late joiner sees every prop where the host has it');
// a move the guest just made is not undone by an older snapshot from the host
peers = [H, G]; const g2 = G.S.props[1]; look(G, g2); G.cornInteract(); G.camera.dir.set(-1, 0, 0); G.cornThrow();
const old = { t: 'cp', a: [[1, +H.S.props[1].g.position.x.toFixed(2), +H.S.props[1].g.position.y.toFixed(2), +H.S.props[1].g.position.z.toFixed(2), 0, 0, 0, 2]], f: 1 };
for (let i = 0; i < 200 && !(g2.sleep && g2.net == null); i++) { G.cornUpdate(0.02); H.cornUpdate(0.02); pipe(); }
const rest = g2.g.position.clone(); G.cornNetRecv(old); assert.ok(near(g2.g.position, rest, 0.001), 'a resting snapshot sent before the host heard of the throw is ignored');
step(3); assert.ok(near(H.S.props[1].g.position, rest, 0.01) && near(g2.g.position, rest, 0.01), 'and both agree where it is');
// the other player leaves while holding one: it falls where it is
look(G, g2); G.cornInteract(); G.camera.position.y = 1.6; step(0.4); const hh = H.S.props[1]; assert.equal(hh.net, 'them');
H.cornNetDrop(); assert.ok(hh.net == null && !hh.rHeld && !hh.sleep, 'theirs no more'); peers = [H, make(true)]; for (let i = 0; i < 200; i++) H.cornUpdate(0.02);
assert.ok(hh.sleep && hh.g.position.y < 0.4, 'it dropped to the ground');
// one PC alone: nothing is sent
const solo = make(true); solo.NET.conn = null; look(solo, solo.S.props[2]); solo.cornInteract(); solo.cornThrow(); for (let i = 0; i < 100; i++) solo.cornUpdate(0.02); assert.equal(solo.q.length, 0, 'single player: no messages');

// the game's hooks
assert.ok(html.includes("if (m.t === 'cp') { if (typeof cornNetRecv === 'function') cornNetRecv(m); return; }"), 'the game hands corn messages to the corn engine');
assert.ok(html.includes("if (typeof cornNetDrop === 'function') cornNetDrop();"), 'and lets go of the other player\'s corn when they leave');
assert.ok(html.includes("t.inCan || t.net === 'them' || !t.g) continue;"), 'a creature does not go for an ear the other player is moving');
assert.ok(html.includes("if (typeof cornNetTake === 'function') cornNetTake(t); }"), 'an ear a creature eats goes back in the can on both PCs');

// carrying a dead critter puts the gun (and every other tool) away
assert.ok(html.includes('fp = show && !VIEW.third && !heldDead;'), 'the game hides what you hold while you carry a corpse');
assert.ok(loader.includes("const hudVis='  const show = walk.on && !walk.dead && !walk.drive && !walk.mow, fp = show && !VIEW.third && !heldDead;';") &&
  loader.includes("fp = show && !VIEW.third && !heldDead && !CORN_PROPS_STATE.held;"), 'and the launcher keeps that when it adds its own corn carry');
{ const ug = html.slice(html.indexOf('function updateGun(dt) {'), html.indexOf('wash.t = Math.max(0, wash.t - dt);', html.indexOf('function updateGun(dt) {')));
  const vis = {}, mk = () => ({ visible: true }), gc2 = { walk: { on: true, dead: false, drive: false, mow: false }, VIEW: { third: false }, held: 'gun', TOOLS: { pick: 1 }, gun: mk(), heldG: { squeegee: mk(), hand: mk(), washer: mk(), ext: mk(), pick: mk() }, heldDead: null };
  vm.createContext(gc2); const run = () => vm.runInContext('{' + ug.replace('function updateGun(dt) {', '') + '\nthis.out = [gun.visible, heldG.squeegee.visible, heldG.pick.visible]; }', gc2);
  run(); assert.equal(gc2.out[0], true, 'the gun shows normally');
  gc2.heldDead = { nm: 'rat' }; run(); assert.deepEqual(Array.from(gc2.out), [false, false, false], 'carrying a dead rat: no gun in your hands');
  gc2.heldDead = null; run(); assert.equal(gc2.out[0], true, 'put it down (or throw it): the gun is back'); }
console.log('PASS: 2 player corn ears and cubes (carried along, cannot be grabbed from the other player, land in the same spot, late joiner, older snapshot ignored, falls when the other player leaves, single player silent); the gun is put away while carrying a dead critter');
