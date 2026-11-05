// Run from the test/ directory: node validate-creep-kick.cjs
// v1.97.176, owner: "when enemies are hit by vehicle they should be kicked back". Runs the game's own creature code (three.js and
// stubs, like validate-nibblers): a cob stalker and a nibbler driven into really get thrown - mostly the way the vehicle was going,
// sliding to a stop - the killing hit throws the body too, Daddy Cob Legs shifts least, and in 2 player a guest's hit carries its
// kick to the host (capped there).
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf("// ---------- THE NORTH CORN FIELD'S CREATURES (v1.97.108)"), b = html.indexOf('\n// pigeon coo, synthesized like the train', a);
assert.ok(a > 0 && b > a, 'the creature code is found');
assert.ok(html.slice(a, b).includes('function creepKick('), 'creepKick exists in the creature code');
const mkModel = bodyName => { const root = new T.Group(), byName = {}, m = new T.MeshLambertMaterial({ color: 0xc9a032 }); const body = new T.Mesh(new T.BoxGeometry(1.8, 2.4, 1.8), m); body.name = bodyName; body.position.y = 2.6; root.add(body); byName[bodyName] = body;
  for (let i = 0; i < 6; i++) { const h = new T.Group(); h.name = 'Leg_Hip_' + i; root.add(h); const s = new T.Mesh(new T.BoxGeometry(0.2, 1, 0.2), m); s.position.set(Math.cos(i), -0.5, Math.sin(i)); h.add(s); } return { root, byName }; };
const sent = [], walk = { on: true, dead: null, drive: false, x: 900, z: 900, y: 0, yaw: 0 }, utv = { g: null, x: 0, z: 0, vx: 0, vz: 0 };
const ctx = { T, Math, NROAD: -134, scene: new T.Scene(), walk, utv, camera: new T.PerspectiveCamera(), V3: (x, y, z) => new T.Vector3(x, y, z), tv: new T.Vector3(), tv2: new T.Vector3(),
  floorAt: () => 0, pushOut() {}, puff() {}, layBody() {}, DMG_NOTIFY() {}, tsnd: { ctx: null }, kiaNoise() {},
  loadGlbModel: (url, cb) => cb(mkModel(/daddy/.test(url) ? 'Daddy_Cob_Torso' : 'Cob_Body')), CORN_PROPS_STATE: { items: [], cans: [] }, NET: { conn: null, host: false, rp: null }, netSend: m => sent.push(m) };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + '\nthis.CREEP = CREEP; this.loadCreeps = loadCreeps; this.updateCreeps = updateCreeps; this.creepHurt = creepHurt; this.creepKick = creepKick; this.creepNetHit = creepNetHit; this.CREEP_KICK = CREEP_KICK;', ctx);
const C = ctx.CREEP, run = (sec, dt = 0.05) => { for (let t = 0; t < sec; t += dt) ctx.updateCreeps(dt); };
const park = () => { walk.drive = false; utv.g = null; utv.vx = utv.vz = 0; };
// drive at it from 1 m west at `sp` m/s heading east for one step, then park and let it slide
const ram = (c, sp) => { c.biteCd = 0; c.rise = 0; walk.drive = true; utv.g = {}; utv.x = c.x - 1; utv.z = c.z; utv.vx = sp; utv.vz = 0; const x0 = c.x, z0 = c.z; run(0.05); park(); run(3); return [c.x - x0, c.z - z0]; };

ctx.loadCreeps();
// a cob stalker, held still so only the kick moves it
const st = C.list.find(c => c.kind === 'stalker'); st.K = Object.assign({}, st.K, { roam: 0, run: 0 });
const hp0 = st.hp, [sx, sz] = ram(st, 15);
assert.ok(st.hp < hp0, 'the vehicle hurt it (' + hp0 + ' -> ' + st.hp + ')');
assert.ok(sx > 3, 'a stalker hit at 15 m/s is thrown well clear the way the vehicle was going (' + sx.toFixed(2) + ' m; the old shove was 1.5 m)');
assert.ok(Math.abs(sz) < 0.5, 'straight on: no sideways throw');
assert.ok(!st.kvx && !st.kvz, 'and it slides to a stop');
const [sx2] = ram(st, 6); assert.ok(sx2 > 0.8 && sx2 < sx, 'a slower hit throws it less (' + sx2.toFixed(2) + ' m)');

// a nibbler: lighter, flies further; the killing hit throws the body
ctx.creepHurt(st, 99); run(1.5);
const nb = C.list.find(c => c.kind === 'nibbler' && c.hp > 0); nb.K = Object.assign({}, nb.K, { roam: 0, run: 0 }); nb.burst = 0;
const [nx] = ram(nb, 10);
assert.equal(nb.state, 'dead', 'a nibbler run over dies');
assert.ok(nx > 3.2, 'and its body is thrown (' + nx.toFixed(2) + ' m)');
assert.ok(nx > sx2 * 1.5, 'further than a stalker at a similar speed');

// the throw follows the vehicle: hit side-on, it goes mostly the way the vehicle was moving, a little away from it
{ const [kx, kz] = ctx.creepKick({ kind: 'stalker', x: 1, z: 0 }, 0, 10, 0, 0); assert.ok(kz > 2 * kx && kx > 0, 'mostly along the vehicle, partly away from it (' + kx.toFixed(2) + ', ' + kz.toFixed(2) + ')'); }
// size matters: Daddy shifts least, a nibbler most; nothing is thrown faster than the cap
{ const m = k => Math.hypot(...ctx.creepKick({ kind: k, x: 1, z: 0 }, 10, 0, 0, 0)); assert.ok(m('daddy') < m('stalker') && m('stalker') < m('nibbler'), 'Daddy < stalker < nibbler (' + ['daddy', 'stalker', 'nibbler'].map(m).map(v => v.toFixed(1)) + ')');
  assert.ok(Math.hypot(...ctx.creepKick({ kind: 'nibbler', x: 1, z: 0 }, 60, 0, 0, 0)) <= ctx.CREEP_KICK.max + 1e-9, 'capped'); }
assert.equal(ctx.creepKick({ kind: 'stalker', x: 1, z: 0 }, 0, 0, 0, 0), null, 'a parked vehicle kicks nothing');

// 2 player: the guest's hit sends its kick with the damage; the host applies it, capped
const st2 = C.list.find(c => c.kind === 'stalker' && c.hp > 0) || C.list.find(c => c.kind === 'nibbler' && c.hp > 0); assert.ok(st2, 'something left alive to hit');
ctx.NET.conn = { open: true }; ctx.NET.host = false; sent.length = 0;
ctx.creepHurt(st2, 3, null, null, [5.123, -1]);
assert.equal(JSON.stringify(sent[0]), JSON.stringify({ t: 'ch', i: st2.id, n: 3, k: [5.12, -1] }), 'the guest sends the kick to the host');
ctx.creepHurt(st2, 1); assert.equal(JSON.stringify(sent[1]), JSON.stringify({ t: 'ch', i: st2.id, n: 1 }), 'a paint hit still sends no kick');
ctx.NET.host = true; st2.kvx = st2.kvz = 0;
ctx.creepNetHit({ i: st2.id, n: 3, k: [50, 0] });
assert.ok(Math.abs(st2.kvx - ctx.CREEP_KICK.max) < 1e-9 && st2.kvz === 0, 'the host applies a guest kick, capped (' + st2.kvx + ')');
st2.kvx = st2.kvz = 0; ctx.creepNetHit({ i: st2.id, n: 1, k: ['x', 1] }); assert.ok(!st2.kvx && !st2.kvz, 'a garbled kick is ignored');
ctx.NET.conn = null;

// wiring: all three vehicle hits throw what they hit; the host slides every creature, dead ones too
assert.equal((html.match(/creepKick\(c, utv\.vx, utv\.vz, utv\.x, utv\.z\)/g) || []).length, 3, 'stalker / Daddy, nibbler and the guest hit all pass a kick');
assert.ok(!html.includes('c.x -= (utv.x - c.x) / (dv || 1) * 1.5'), 'the old fixed 1.5 m shove is gone');
assert.ok(html.includes('    const c = CREEP.list[i];\n    creepKickStep(c, dt);\n    if (c.state === \'dead\')'), 'the host slides every creature before its AI, dead or alive');

console.log('creatures hit by a vehicle are kicked back: ok');
