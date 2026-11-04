// Run from the test/ directory: node validate-grain-pile.cjs
// v1.97.130: the grain pile jump north of the north corn field: "ramp the ranger on it to jump over the train". Builds the game's
// own piles (WALK_SURF ramps along x + side walls + mesh) and drives the game's own vehVertical west over them at several
// speeds at the 60 fps the Ranger runs at: how high it is over the track's hopper cars, and how hard it lands.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const pileSrc = cut('// ---------- GRAIN PILE JUMP (v1.97.130', '// ---------- AIR (owner, v1.97.94:');
const floorSrc = cut('function floorAt(x0, z0, y) {', '// ---------- WATER RIPPLES');
const airSrc = cut('const AIR = {', '\nfunction vehVertical(u, dt) {');
const vvSrc = cut('function vehVertical(u, dt) {', '\nfunction buildUTV(');
const hurts = [];
const ctx = { T, Math, scene: new T.Scene(), wallSegs: [], WALK_SURF: [], DIGS: [], PONDS: { hole: 0 }, inPond: () => false, ROOFMAP: { h: null }, roofAt: () => -99, srgbTex: t => t, document: undefined,
  utvBump() {}, walk: { drive: true }, dmgHit: (k, n) => hurts.push(n), dmgDrivingKey: () => 'utv' };
vm.createContext(ctx);
vm.runInContext(pileSrc + '\n' + floorSrc + '\n' + airSrc + '\n' + vvSrc + '\nthis.GRAIN_PILES = GRAIN_PILES; this.buildGrainPiles = buildGrainPiles; this.floorAt = floorAt; this.vehVertical = vehVertical; this.AIR = AIR;', ctx);
ctx.buildGrainPiles();
const G = ctx.GRAIN_PILES, TRACK_X = -243, CAR_TOP = 5.1, CAR_HALF = 1.55;   // the loop's centreline at z -305 (x -240 at z -296, -244 at -312) and a hopper car
assert.equal(ctx.scene.children.filter(o => o.name === 'grainPile').length, 2, 'two piles: the takeoff and the landing spill');
assert.equal(ctx.WALK_SURF.length, 6, 'their slopes are walkable / drivable ramps along x');
// the piles keep clear of the track and of cars on it
const trackX = z => -240 - Math.max(0, -296 - z) * 0.2;   // the loop: x -240 down to z -296, bending west north of it (-244 at z -312, probed in the game)
for (const H of G) for (const z of [H.z0, H.z1]) { const tx = trackX(z), xs = H.p.map(q => q[0]); assert.ok(Math.min(...xs.map(x => Math.abs(x - tx))) > CAR_HALF + 1.5, 'clear of a car on the track at z ' + z + ' by more than 1.5 m'); }
assert.ok(G.every(H => H.z0 < -305 && H.z1 > -305 && H.z1 - H.z0 >= 16), 'both straddle z -305, the middle of the owner\'s box, 16 m wide or more');
// the takeoff is at grain's natural slope and under the Ranger's 0.45 launch limit, with a sharp crest
{ const p = G[0].p, s = (p[1][1] - p[0][1]) / Math.abs(p[1][0] - p[0][0]); assert.ok(s > 0.3 && s < AIR_SLOPE(), 'the climb slope ' + s.toFixed(2) + ' is a slope (launches), not a step'); assert.ok(p[1][1] > 4 && p[2][1] < p[1][1], 'a sharp crest over 4 m (no flat top)'); }
function AIR_SLOPE() { return ctx.AIR.SLOPE; }
// floor heights along the line z -305
assert.equal(ctx.floorAt(-205, -305, 0), 0, 'flat grass before the toe'); assert.ok(Math.abs(ctx.floorAt(-224, -305, 5) - 4.6) < 1e-6, 'the 4.6 m crest');
assert.ok(Math.abs(ctx.floorAt(-218.5, -305, 5) - 2.3) < 1e-6, 'half way up'); assert.ok(Math.abs(ctx.floorAt(-252, -305, 5) - 4.5) < 1e-6, 'the landing bank');
// drive it: west along z -305 at a steady speed (the gas held), 60 steps a second
function jump(v) {
  const u = { x: -195, z: -305, y: 0, vx: -v, vz: 0, vy: 0, air: false }; hurts.length = 0;
  let over = null, top = 0, landed = null, launched = null;
  for (let i = 0; i < 60 * 8; i++) { u.x += u.vx / 60; ctx.vehVertical(u, 1 / 60); top = Math.max(top, u.y);
    if (u.air && launched === null) launched = u.x;
    if (Math.abs(u.x - TRACK_X) < CAR_HALF && over === null) over = u.y;   // its height over the cars' roofs
    if (launched !== null && !u.air && landed === null) { landed = { x: u.x, hit: u.land }; break; } }
  return { over, top, launched, landed, hurt: hurts.reduce((a, b) => a + b, 0) };
}
const mph = v => v / 0.44704;
const res = [14, 18, 21, 24, 26.4].map(v => [v, jump(v)]);   // 31, 40, 47, 54, 59 mph
for (const [v, r] of res) console.log('  ' + mph(v).toFixed(0) + ' mph: leaves the pile at x ' + (r.launched || 0).toFixed(1) + ', ' + (r.over != null ? r.over.toFixed(1) : '-') + ' m over the track (cars 5.1), top ' + r.top.toFixed(1) + ' m, lands at x ' + (r.landed ? r.landed.x.toFixed(1) : '-') + ', hit ' + (r.landed ? r.landed.hit.toFixed(1) : '-') + ' m/s' + (r.hurt ? ', damage ' + r.hurt.toFixed(0) : ''));
for (const [v, r] of res) assert.ok(r.launched !== null && r.launched < -220, mph(v).toFixed(0) + ' mph: it leaves the ground off the crest');
assert.ok(res.filter(([v]) => v >= 18).every(([, r]) => r.over > CAR_TOP + 1), 'from 40 mph up it clears a hopper car by a metre or more');
assert.ok(res.find(([v]) => v === 14)[1].over < CAR_TOP, 'at 31 mph it does not make it (it is a jump you have to commit to)');
assert.ok(res.filter(([v]) => v >= 18 && v <= 24).every(([, r]) => r.hurt === 0 && r.landed.x < -251), '40-54 mph: comes down on the landing spill and the Ranger is not damaged');
assert.ok(res.find(([v]) => v === 26.4)[1].hurt < 15, 'flat out (59 mph): a hard landing, but only a little damage');
assert.ok(html.includes('buildBillboards(); buildDirtHills(); buildGrainPiles();'), 'built with the world, before the static merge');
console.log('PASS: grain pile jump over the rail loop (takeoff at a grain slope with a sharp crest, clear of the track; 40+ mph clears a hopper car by a metre; landing spill: no damage at 40-54 mph)');
