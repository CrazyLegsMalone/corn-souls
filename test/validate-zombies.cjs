// Run from the test/ directory: node validate-zombies.cjs
// Guards TEST v1.97.40, the corn zombie prototype (owner: "spawns randomly inside any building but moves slow once found"):
// spawned inside a roofed building away from you, idle until it sees you (no wall between) or you get close, then a slow chase,
// swipes in reach, takes tool / paintball damage, goes down and sinks, and only ZOMB.max at a time.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const lib = { window: {}, console }; vm.runInNewContext([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const src = html.slice(html.indexOf('// ---------- CORN ZOMBIES'), html.indexOf('// ---------- PLAYER HEALTH'));
const hurts = [], scene = new T.Scene();
const ctx = { T, Math, console, scene, walk: { on: true, dead: null, drive: false, x: 0, y: 0, z: 0, yaw: 0 }, wallSegs: [], colliders: [], ENCL: [], held: 'sledge', TOOLS: { sledge: { L: 0.9 } },
  floorAt: () => 0, mat: c => new T.MeshLambertMaterial({ color: c }), loadGlbModel() {}, creepSound() {}, DMG_NOTIFY() {}, playerHurt: (n, cause) => hurts.push([n, cause]),
  tv: new T.Vector3(), tv2: new T.Vector3() };
vm.createContext(ctx); vm.runInContext(src + '\nthis.ZOMB = ZOMB; this.zombLOS = zombLOS; this.zombSpawn = zombSpawn; this.zombUpdate = zombUpdate; this.zombToolHit = zombToolHit; this.zombPaintHit = zombPaintHit; this.zombSpot = zombSpot; this.zombPush = zombPush;', ctx);
const { ZOMB, walk } = ctx;
const run = (s, dt = 0.05) => { for (let t = 0; t < s; t += dt) ctx.zombUpdate(dt); };
// line of sight and walls
ctx.wallSegs.push([5, -5, 5, 5]);
assert.equal(ctx.zombLOS(0, 0, 10, 0), false, 'a wall between: no sight'); assert.equal(ctx.zombLOS(0, 0, 4, 0), true);
{ const p = { x: 5.1, z: 0, y: 0 }; ctx.zombPush(p); assert.ok(p.x >= 5 + ZOMB.R - 1e-9, 'kept off a wall line'); }
ctx.wallSegs.length = 0;
// spawning: inside a building, away from you
ctx.ENCL.push({ x0: 100, x1: 120, z0: 100, z1: 120, area: 400 }, { x0: -5, x1: 5, z0: -5, z1: 5, area: 100 });
for (let i = 0; i < 20; i++) { const s = ctx.zombSpot(); assert.ok(s.x > 100 && s.x < 120 && s.z > 100 && s.z < 120, 'in the building ' + ZOMB.far + '+ m away, never the one you stand in'); }
// idle until it sees you, then a slow chase
const z = ctx.zombSpawn({ x: 0, z: 12, y: 0 }); walk.x = 0; walk.z = 30; run(1);
assert.equal(z.state, 'idle', 'out of sight range: it waits');
ctx.wallSegs.push([-3, 8, 3, 8]); walk.z = 0; run(0.5); assert.equal(z.state, 'idle', 'a wall between you: it does not know');
ctx.wallSegs.length = 0; run(0.2); assert.equal(z.state, 'chase', 'in sight: it comes for you');
const z0 = z.z; run(2); assert.ok(z0 - z.z > 2.6 && z0 - z.z < 3.2, 'at ' + ZOMB.speed + ' m/s - slower than you walk (moved ' + (z0 - z.z).toFixed(2) + ' m in 2 s)');
run(10); assert.ok(Math.abs(z.z) < ZOMB.reach && hurts.length >= 1 && hurts[0][0] === ZOMB.dmg && hurts[0][1] === 'zombie', 'in reach it swipes you');
const n0 = hurts.length; run(1); assert.ok(hurts.length - n0 <= 1, 'not every frame: once every ' + ZOMB.cd + ' s');
// hits: a sledgehammer swing in front, three paintballs
assert.equal(ctx.zombToolHit({ x: 0, y: 0, z: 1 }, 40), true); assert.equal(z.hp, 60); assert.ok(z.hitT > 0, 'staggered');
assert.equal(ctx.zombToolHit({ x: 0, y: 0, z: -1 }, 40), false, 'swinging the other way misses');
for (let i = 0; i < 3; i++) { z.hitT = 0; assert.equal(ctx.zombPaintHit(new T.Vector3(z.x, 1, z.z - 3), new T.Vector3(0, 0, 1), 6), true); }
assert.equal(z.hp, 15); ctx.zombToolHit({ x: 0, y: 0, z: 1 }, 40); assert.equal(z.state, 'dead');
run(10); assert.equal(z.state, 'gone', 'it lies there, sinks, and goes'); assert.ok(!z.g.parent);
// spawning on a timer, never more than ZOMB.max
walk.x = 0; walk.z = 0; ZOMB.t = 0; run(ZOMB.every * (ZOMB.max + 2), 0.25);
assert.equal(ZOMB.list.filter(q => q.state !== 'gone').length, ZOMB.max, 'up to ' + ZOMB.max + ' at a time');
// wiring
assert.ok(html.includes("stepSafe('zombies', () => zombUpdate(dt));"));
assert.ok(html.includes('if (zombToolHit(dir, TOOL_DMG[held] || 12))') && html.includes('zombPaintHit(p, dir, len)'), 'tools and paintballs hit them');
assert.ok(html.includes("hit === 'zombie' ? 'Squeeg got eaten by a corn zombie.'"), 'its own death message');
console.log('PASS: corn zombies (spawn inside a building away from you, need sight or closeness, slow chase, timed swipes, tool + paint damage, down / sink / gone, max ' + ZOMB.max + ')');
