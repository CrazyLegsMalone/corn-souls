// Run from the test/ directory: node validate-duck-sync.cjs
// v1.97.179, owner: "only duck sync". The ducks on the two ponds were the last thing each machine ran for itself, so the two
// players saw twelve different ducks in different places. Now the host swims them and sends where they are 4 times a second
// (3 numbers a duck: its offset inside the pond and its heading, in the order both sides build them), and the guest glides to
// that and runs no AI of its own. The bob, the facing mirror and the quack stay local on both sides.
// This suite runs the game's own updateDucks / duckRows / duckApply on a host and a guest.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const src = cut('const ducks = []; let duckMats = null;', 'let WIND = {');
const draw = new Proxy({ createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {}, beginPath: () => {}, ellipse: () => {}, fill: () => {}, moveTo: () => {}, lineTo: () => {}, arc: () => {}, stroke: () => {}, fillText: () => {} }, { get: (o, k) => o[k] || (() => {}), set: () => true });
const make = guest => {
  const camera = new T.PerspectiveCamera(); camera.position.set(0, 1.6, 0); camera.updateMatrixWorld();
  const sent = [];
  const ctx = { T, Math, console, document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) }, srgbTex: t => t,
    scene: { add() {} }, clock: 0, walk: { on: true, x: 0, z: 0 }, camera, tsnd: { ctx: null },
    V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), quack: () => {},
    PONDS: Object.assign([[0, 0], [-100, -100]], { phi: 0, half: 40, water: 0.35 }),
    critNetGuest: () => guest, netSend: m => sent.push(m), sent, NET: { host: !guest, conn: { open: true } } };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.updateDucks = updateDucks; this.duckRows = duckRows; this.duckApply = duckApply; this.D = ducks;', ctx);
  return ctx;
};
const step = (ctx, sec, dt = 1 / 60) => { for (let t = 0; t < sec; t += dt) { ctx.clock += dt; ctx.updateDucks(dt); } };
// ---------------------------------------------------------------- the host swims them and sends
const H = make(false), G = make(true);
step(H, 1);
const packets = H.sent.filter(m => m.t === 'du');
assert.ok(packets.length >= 3 && packets.length <= 5, 'the host sends about 4 a second (' + packets.length + ' in 1 s)');
assert.equal(H.D.length, 12, 'twelve ducks, six a pond, in the order both sides build them');
assert.equal(packets[packets.length - 1].a.length, 36, 'three numbers a duck (offset x, offset z, heading)');
assert.ok(H.D.every(d => d.s.visible && Math.abs(d.s.scale.x) === 0.75), 'and all twelve are drawn, facing with the mirror rule');
const moved = H.D.map(d => d.lx + ',' + d.lz);
step(H, 3);
assert.notEqual(H.D.map(d => d.lx + ',' + d.lz).join('|'), moved.join('|'), 'over 3 s the host ducks paddle somewhere');
assert.ok(H.D.every(d => Math.max(Math.abs(d.lx), Math.abs(d.lz)) <= ctx25(H) + 1e-9), 'and never leave the pond');
function ctx25(c) { return c.PONDS.half - 2.5; }
// ---------------------------------------------------------------- the guest follows, and runs no AI
step(G, 0.1);   // it builds its own twelve first (nothing has been sent yet)
const g0 = G.D.map(d => d.lx + ',' + d.lz + ',' + d.a);
const t0 = G.D.map(d => d.t);
step(G, 1);
assert.deepEqual(G.D.map(d => d.lx + ',' + d.lz + ',' + d.a), g0, 'the guest ducks do not swim on their own before a packet arrives');
assert.deepEqual(G.D.map(d => d.t), t0, 'and it runs no turn timers either: the host owns them');
assert.equal(G.sent.filter(m => m.t === 'du').length, 0, 'a guest never sends ducks');
// a host packet: the guest glides to exactly the host's ducks
const row = H.duckRows();
G.duckApply(row);
step(G, 2);
const far = G.D.map((d, i) => Math.hypot(d.lx - H.D[i].lx, d.lz - H.D[i].lz)).reduce((a, b) => Math.max(a, b), 0);
assert.ok(far < 0.35, 'after 2 s the guest is on the host ducks (worst ' + far.toFixed(2) + ' m behind)');
assert.ok(G.D.every(d => d.s.visible && Math.abs(d.s.scale.x) === 0.75), 'and the guest still draws and mirrors them');
// the heading comes round the short way, not the long way
G.D[0].a = 3.0; H.D[0].a = -3.0; G.duckApply(H.duckRows()); step(G, 3);
assert.ok(Math.abs(Math.atan2(Math.sin(G.D[0].a - H.D[0].a), Math.cos(G.D[0].a - H.D[0].a))) < 0.4, 'the heading turns the short way round');
// ---------------------------------------------------------------- wiring
assert.ok(html.includes("if (m.t === 'du') { if (!NET.host) duckApply(m.a); return; }"), 'the packet is applied by the guest only');
assert.ok(html.includes("if (duckNetT >= 0.25) { duckNetT = 0; if (typeof NET !== 'undefined' && NET.conn && NET.conn.open) netSend({ t: 'du', a: duckRows() }); }"), 'and sent by the host only, 4 a second, connection permitting');
assert.ok(html.includes('const guest = critNetGuest();   // 2 player: the host owns the ducks'), 'the guest branch is a guest-only branch - solo runs the host path');
console.log('PASS: duck sync (the host swims the twelve ducks inside their ponds and sends 3 numbers a duck 4x a second; the guest glides to that within a third of a metre, turns the short way, runs no AI and sends nothing; both draw and mirror them)');
