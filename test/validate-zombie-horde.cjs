// Run from the test/ directory: node validate-zombie-horde.cjs
// Guards TEST v1.97.63, co-op horde mode (owner: "coop zombie horde"): started from the pause menu where you stand, waves of corn
// zombies out of the dark 26-44 m away, more and tougher each round with a breather between them, a HUD banner, your best wave kept
// on the device. In 2 player it is ONE horde: the host owns the zombies, sends them 12 times a second, the guest draws them and
// reports its hits, and they come for whichever player is nearer.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = html.slice(html.indexOf('// ---------- ZOMBIE HORDE'), html.indexOf('// ---------- RADIO PING'));
assert.ok(src.length > 2000, 'the horde block is there');

const sent = [], hurts = [], store = {};
const ctx = { Math, console, JSON,
  ZOMB: { list: [], speed: 1.5, dmg: 14, kills: 0 },
  walk: { on: true, dead: null, drive: false, x: 0, y: 0, z: 0 },
  NET: { conn: null, host: true, rp: null },
  netSend: o => sent.push(o), floorAt: () => 0, scene: { remove() {} },
  playerHurt: (n, cause) => hurts.push([n, cause]),
  zombPush() {}, zombSpawn: s => { const z = { x: s.x, y: s.y, z: s.z, a: 0, hp: 100, state: 'idle', deadT: 0, g: {} }; ctx.ZOMB.list.push(z); return z; },
  zombHurt: (z, n) => { z.hp -= n; if (z.hp <= 0 && z.state !== 'dead') { z.state = 'dead'; z.deadT = 0; ctx.hordeKill(z); } },
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  document: { getElementById: () => null } };
ctx.window = { __toast: m => ctx.toasts.push(m) }; ctx.toasts = [];
vm.createContext(ctx);
vm.runInContext(src + '\nthis.HORDE = HORDE; this.hordeStart = hordeStart; this.hordeStop = hordeStop; this.hordeToggle = hordeToggle; this.hordeStep = hordeStep; this.hordeRecv = hordeRecv;' +
  '\nthis.hordeTarget = hordeTarget; this.hordeKill = hordeKill; this.hordePuppets = hordePuppets; this.hordeRelayHit = hordeRelayHit; this.hordeN = hordeN; this.hordeHp = hordeHp; this.hordeSpd = hordeSpd; this.hordeRows = hordeRows;', ctx);
const { HORDE, ZOMB, walk } = ctx;
const run = (s, dt = 0.05) => { for (let t = 0; t < s; t += dt) ctx.hordeStep(dt); };
const live = () => ZOMB.list.filter(z => z.horde && z.state !== 'gone' && z.state !== 'dead');
const killAll = () => live().forEach(z => ctx.zombHurt(z, 9999));

// waves get bigger and tougher
assert.deepEqual([1, 2, 3, 5].map(ctx.hordeN), [5, 7, 9, 13], 'wave sizes');
assert.ok(ctx.hordeHp(5) > ctx.hordeHp(1) && ctx.hordeSpd(5) > ctx.hordeSpd(1) && ctx.hordeSpd(99) <= 2.7, 'later waves are tougher but never outrun you by much');

// a solo round
ctx.hordeStart(10, -10);
assert.ok(HORDE.on && HORDE.host && HORDE.state === 'break' && HORDE.wave === 0, 'starts with a breather');
run(7); assert.equal(HORDE.state, 'wave'); assert.equal(HORDE.wave, 1); assert.equal(HORDE.left, 5, 'wave 1 is five');
run(12); const w1 = live();
assert.ok(w1.length > 0 && w1.length <= HORDE.live, 'they come a few at a time, never more than ' + HORDE.live + ' at once');
for (const z of w1) { const d = Math.hypot(z.x - 10, z.z + 10); assert.ok(d >= HORDE.R0 - 0.01 && d <= HORDE.R1 + 0.01, 'out of the dark 26-44 m away, not on top of you: ' + d.toFixed(1)); }
assert.ok(w1.every(z => z.state === 'chase' && z.hp === ctx.hordeHp(1) && z.spd === ctx.hordeSpd(1)), 'they come straight for the spot');
let guard = 0; while (HORDE.state === 'wave' && guard++ < 40) { killAll(); run(3); }
assert.equal(HORDE.kills, 5, 'the whole wave counted'); assert.equal(HORDE.state, 'break', 'cleared, then a breather');
assert.ok(HORDE.t > 0 && HORDE.t <= HORDE.brk, 'the break is counting down');
run(HORDE.brk + 1); assert.equal(HORDE.wave, 2); assert.equal(HORDE.left, 7, 'wave 2 is seven');
run(10); assert.ok(live().every(z => z.hp === ctx.hordeHp(2)), 'wave 2 takes more');
// going down ends it, and the best wave is kept
walk.dead = 'zombie'; run(0.2);
assert.ok(!HORDE.on && HORDE.state === 'over' && HORDE.overT > 0, 'you go down, the horde is over');
assert.equal(store.cs_horde_best, '2', 'best wave kept on the device');
assert.ok(ctx.toasts.join(' ').includes('wave 2'), 'and said so');
assert.ok(!/\{ t: '[a-z]+'[^}]*[,{] t:/.test(html.slice(html.indexOf('// ---------- ZOMBIE HORDE'), html.indexOf('// ---------- RADIO PING'))), 'no horde message sets t twice (the type would be clobbered)');
assert.ok(live().length === 0, 'the ones still out there are cleared');

// 2 player: the host owns it, the guest asks and reports
walk.dead = null; ZOMB.list.length = 0; sent.length = 0;
ctx.NET.conn = { open: true }; ctx.NET.host = false;
assert.ok(ctx.hordeToggle().includes('other player'), 'the guest asks the host to start');
assert.equal(sent.pop().t, 'hs');
ctx.hordeRecv({ t: 'hd', on: true, st: 'wave', w: 3, l: 9, k: 4, x: 5, z: 6, ct: 0, b: 2 });
assert.ok(HORDE.on && !HORDE.host && HORDE.wave === 3 && HORDE.kills === 4, 'the guest follows the host round');
ctx.hordeRecv({ t: 'hz', a: [[1, 5, 0, 7, 0.3, 0, 1], [2, 9, 0, 9, 0, 0, 0]] });
assert.equal(ZOMB.list.length, 2, 'the host zombies are drawn here');
const pup = ZOMB.list[0]; assert.ok(pup.net === 'them' && pup.nid === 1 && pup.tx === 5 && pup.nmove > 0, 'as puppets the host moves');
sent.length = 0; assert.equal(ctx.hordeRelayHit(pup, 25), true); { const h = sent.pop(); assert.ok(h.t === 'hh' && h.i === 1 && h.n === 25, 'hits go to the host, not applied here'); assert.equal(pup.hp, 1e6, 'and never take the puppet down locally'); }
ctx.hordeRecv({ t: 'hz', a: [[1, 5, 0, 7, 0.3, 1, 0]] });
assert.equal(pup.state, 'dead', 'the host says it is down'); assert.equal(ZOMB.list[1].state, 'gone', 'one it dropped is taken away');
ctx.hordeRecv({ t: 'hx' }); { const h = hurts.pop(); assert.ok(h[0] === 14 && h[1] === 'zombie', 'a zombie that reached the guest hurts them here'); }
run(0.2); assert.ok(!sent.some(m => m.t === 'hz'), 'the guest never sends zombies of its own');
// the host picks whichever player is nearer
ZOMB.list.length = 0; ctx.NET.host = true; HORDE.host = true; HORDE.on = true;
walk.x = 0; walk.z = 0; ctx.NET.rp = { walk: true, drive: false, x: 40, y: 0, z: 0 };
const zz = { x: 35, z: 0, horde: true };
assert.equal(ctx.hordeTarget(zz).rp, true, 'the nearer player is the one it comes for');
zz.x = 5; assert.ok(!ctx.hordeTarget(zz).rp, 'and the other way round');
ctx.NET.rp = null; { const t2 = ctx.hordeTarget(zz); assert.ok(t2 && t2.x === 0 && t2.z === 0 && !t2.rp, 'alone: you'); }
assert.equal(ctx.hordeTarget({ x: 5, z: 0 }), null, 'a drifting zombie is not the horde');

// the hooks in the zombie code and the controls
assert.ok(/ENCL\.length && \(typeof HORDE === 'undefined' \|\| !HORDE\.on\)\)/.test(html), 'the drifting zombies stop while a horde is on');
assert.ok(/if \(z\.net === 'them' && typeof hordeRelayHit === 'function' && hordeRelayHit\(z, n\)\) return;/.test(html), 'the guest relays its hits');
assert.ok(/ZOMB\.kills\+\+; if \(typeof hordeKill === 'function'\) hordeKill\(z\);/.test(html), 'kills count toward the round');
assert.ok(/const tg = typeof hordeTarget === 'function' \? hordeTarget\(z\) : null;/.test(html) && /if \(rp\) \{ if \(typeof hordeHurtThem === 'function'\) hordeHurtThem\(z\); \}/.test(html), 'they chase and hit either player');
assert.ok(/move = z\.spd \|\| ZOMB\.speed;/.test(html), 'later waves are faster');
assert.ok(/if \(z\.net === 'them'\) \{   \/\* a puppet: the host says where it is/.test(html), 'puppets are moved, not driven');
assert.ok(html.includes("stepSafe('horde', () => hordeStep(dt));") && html.includes("stepSafe('thrown', () => updateThrown(dt));"), 'stepped every frame');
assert.ok(/m\.t === 'hs' \|\| m\.t === 'hd' \|\| m\.t === 'hz' \|\| m\.t === 'hh' \|\| m\.t === 'hx'\) \{ hordeRecv\(m\);/.test(html), 'the five horde messages arrive');
assert.ok(/horde: \(\) => hordeToggle\(\), get hordeOn\(\) \{ return HORDE\.on; \}/.test(html), 'Plant3D.horde');
assert.ok(/\['🧟 ' \+ \(P3\.hordeOn \? 'Stop the horde' : 'Zombie horde here'\)/.test(html), 'on the pause menu');
assert.ok(html.includes('<div id="hordeHud"></div>') && /#hordeHud\{display:none;/.test(html), 'the wave banner');
console.log('PASS: zombie horde (waves out of the dark, tougher each round, breathers, best wave kept, one shared horde in 2 player with the host owning it)');
