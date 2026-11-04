// Run from the test/ directory: node validate-grain-pile.cjs
// v1.97.130 / .133 / .134: the grain pile north of the north corn field: "ramp the ranger on it to jump over the train", "just
// supposed to look like a normal pile of grain that happens to be able to be used as a ramp", "just needs the one pile in the spot
// i asked for. i never asked for 2 piles". ONE natural heap (a heightfield: what you see is the floor). Builds the game's own pile
// and drives the game's own vehVertical west over it at 60 fps on three lines (the peak line and 3 m either side): clearance over
// a hopper car on the real rail loop, and where / how hard it lands. Also checks it looks like a pile: no walls, rounded outline.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const loopSrc = cut('const SATPX = ', 'const TL = {');
const pileSrc = cut('// ---------- GRAIN PILE JUMP (v1.97.130', '// ---------- AIR (owner, v1.97.94:');
const floorSrc = cut('function floorAt(x0, z0, y) {', '// ---------- WATER RIPPLES');
const airSrc = cut('const AIR = {', '\nfunction vehVertical(u, dt) {');
const vvSrc = cut('function vehVertical(u, dt) {', '\nfunction buildUTV(');
const hurts = [];
const ctx = { T, Math, Float32Array, scene: new T.Scene(), wallSegs: [], WALK_SURF: [], DIGS: [], PONDS: { hole: 0 }, inPond: () => false, ROOFMAP: { h: null }, roofAt: () => -99, srgbTex: t => t, document: undefined,
  utvBump() {}, walk: { drive: true }, dmgHit: (k, n) => hurts.push(n), dmgDrivingKey: () => 'utv' };
vm.createContext(ctx);
vm.runInContext(loopSrc + '\n' + pileSrc + '\n' + floorSrc + '\n' + airSrc + '\n' + vvSrc + '\nthis.GRAIN_PILES = GRAIN_PILES; this.buildGrainPiles = buildGrainPiles; this.floorAt = floorAt; this.vehVertical = vehVertical; this.AIR = AIR; this.LSAMP = LSAMP;', ctx);
ctx.buildGrainPiles();
const G = ctx.GRAIN_PILES, CAR_TOP = 5.1, CAR_HALF = 1.55;
const TX = ctx.LSAMP.filter(p => p.x > -320 && p.x < -200 && p.z > -420 && p.z < -200).sort((a, b) => a.z - b.z);
const trackX = z => { for (let i = 0; i < TX.length - 1; i++) if (z >= TX[i].z && z <= TX[i + 1].z) return TX[i].x + (TX[i + 1].x - TX[i].x) * (z - TX[i].z) / ((TX[i + 1].z - TX[i].z) || 1); return NaN; };   // the real loop
const meshes = ctx.scene.children.filter(o => o.name === 'grainPile');
assert.equal(G.length, 1, 'one pile (the owner never asked for two)');
assert.equal(meshes.length, 1, 'one pile mesh');
assert.equal(ctx.WALK_SURF.length, 1, 'one heightfield floor');
assert.ok(ctx.WALK_SURF.every(s => typeof s.hf === 'function'), 'their floor is their own heightfield');
assert.equal(ctx.wallSegs.length, 0, 'no walls: it is grain, you can climb it (no built ramp sides)');
assert.ok(meshes.every(m => m.userData.noRoof), 'kept out of the roof map (their floor is exact already)');
// clear of the track and any car on it, everywhere
let minC = 99;
for (const H of G) { const R = H.grid; for (let j = 0; j < R.nz; j++) for (let i = 0; i < R.nx; i++) if (R.g[j * R.nx + i] > 0.02) { const x = R.x0 + i * R.C, z = R.z0 + j * R.C; minC = Math.min(minC, Math.abs(x - trackX(z))); } }
assert.ok(minC > CAR_HALF + 3, 'well clear of a car on the track (closest grain ' + minC.toFixed(2) + ' m from the centreline)');
assert.ok(G[0].cx > trackX(G[0].cz) + 15, 'the pile is on the east side, the corn field side of the track');
// they look like piles: every outer edge is at the ground, the outline is not a rectangle, and the slopes are grain's
for (const H of G) {
  const R = H.grid; let edge = 0, rows = new Set();
  for (let i = 0; i < R.nx; i++) edge = Math.max(edge, R.g[i], R.g[(R.nz - 1) * R.nx + i]);
  for (let j = 0; j < R.nz; j++) { edge = Math.max(edge, R.g[j * R.nx], R.g[j * R.nx + R.nx - 1]); let w = 0; for (let i = 0; i < R.nx; i++) if (R.g[j * R.nx + i] > 0.02) w++; if (w) rows.add(w); }
  assert.equal(edge, 0, 'it comes down to the ground all round (no cut-off sides)');
  assert.ok(rows.size > 12, 'a rounded, uneven outline (' + rows.size + ' different row widths), not a box');
}
{ // repose: grain's slope everywhere (under 0.55 incl. lumps)
  const R = G[0].grid; let mx = 0;
  for (let j = 1; j < R.nz - 1; j++) for (let i = 1; i < R.nx - 1; i++) { const k = j * R.nx + i; if (R.g[k] < 0.3) continue; mx = Math.max(mx, Math.abs(R.g[k + 1] - R.g[k - 1]) / (2 * R.C), Math.abs(R.g[k + R.nx] - R.g[k - R.nx]) / (2 * R.C)); }
  assert.ok(mx < 0.55, 'no slope steeper than grain lies (' + mx.toFixed(2) + ')');
}
// the climb: a slope (launches), not steps, on the peak line and 3 m either side
for (const z of [-308, -305, -302]) {
  let ms = 0; for (let x = -213; x > -224; x -= 0.25) ms = Math.max(ms, (ctx.floorAt(x - 0.25, z, 9) - ctx.floorAt(x, z, 9)) / 0.25);
  assert.ok(ms > 0.3 && ms < ctx.AIR.SLOPE, 'z ' + z + ': the climb is a slope under the 0.45 launch limit (' + ms.toFixed(2) + ')');
  assert.ok(ctx.floorAt(-224, z, 9) > 4.5, 'z ' + z + ': peak over 4.5 m');
}
assert.equal(ctx.floorAt(-205, -305, 0), 0, 'flat grass before the toe');
assert.equal(ctx.floorAt(-255, -305, 9), 0, 'nothing across the track: flat grass where you land');
// drive it: west at a steady speed (the gas held), 60 steps a second
function jump(v, z) {
  const u = { x: -195, z, y: 0, vx: -v, vz: 0, vy: 0, air: false }, tx = trackX(z); hurts.length = 0;
  let over = null, top = 0, landed = null, launched = null;
  for (let i = 0; i < 60 * 8; i++) { u.x += u.vx / 60; ctx.vehVertical(u, 1 / 60); top = Math.max(top, u.y);
    if (u.air && launched === null) launched = u.x;
    if (Math.abs(u.x - tx) < CAR_HALF && over === null) over = u.y;   // its height over the cars' roofs
    if (launched !== null && !u.air && landed === null) { landed = { x: u.x, hit: u.land }; break; } }
  return { over, top, launched, landed, hurt: hurts.reduce((a, b) => a + b, 0) };
}
const mph = v => v / 0.44704;
for (const z of [-305, -302, -308]) {
  const res = [14, 18, 21, 24, 26.4].map(v => [v, jump(v, z)]);   // 31, 40, 47, 54, 59 mph
  for (const [v, r] of res) console.log('  z ' + z + ', ' + mph(v).toFixed(0) + ' mph: leaves the peak at x ' + (r.launched || 0).toFixed(1) + ', ' + (r.over != null ? r.over.toFixed(1) : '-') + ' m over the track (cars 5.1), top ' + r.top.toFixed(1) + ' m, lands at x ' + (r.landed ? r.landed.x.toFixed(1) : '-') + ', hit ' + (r.landed ? r.landed.hit.toFixed(1) : '-') + ' m/s' + (r.hurt ? ', damage ' + r.hurt.toFixed(0) : ''));
  for (const [v, r] of res) assert.ok(r.launched !== null && r.launched < -220, 'z ' + z + ', ' + mph(v).toFixed(0) + ' mph: it leaves the ground off the peak');
  assert.ok(res.filter(([v]) => v >= 18).every(([, r]) => r.over > CAR_TOP + 1), 'z ' + z + ': from 40 mph up it clears a hopper car by a metre or more');
  assert.ok(res.find(([v]) => v === 14)[1].over < CAR_TOP, 'z ' + z + ': at 31 mph it does not make it (a jump you have to commit to)');
  assert.ok(res.filter(([v]) => v >= 18).every(([, r]) => r.landed.x < trackX(z) - 8), 'z ' + z + ': from 40 mph it comes down on the grass well past the track');
  assert.ok(res.every(([, r]) => r.hurt < 40), 'z ' + z + ': a hard landing on flat grass, but it never wrecks the Ranger in one jump');
}
// v1.97.150, owner: asked whether landings on the pile should be softer - yes: (hit - AIR.HURT) * 2 instead of * 6, so the same
// jump costs a third of what it did. It still has to hurt, or the jump is free.
assert.ok(html.includes('HURT: 9, HURT_K: 2 };'), 'a hard landing costs 2 HP per m/s over the limit (it was 6)');
assert.ok(html.includes('(hit - AIR.HURT) * AIR.HURT_K') && !html.includes('(hit - AIR.HURT) * 6'), 'and the landing damage uses that number');
{ const hard = [14, 18, 21, 24, 26.4].map(v => jump(v, -305));
  assert.ok(hard.every(r => r.hurt < 15), 'every speed down the pile costs under 15 HP (18-34 before): ' + hard.map(r => r.hurt.toFixed(0)).join('/'));
  assert.ok(hard[hard.length - 1].hurt > 5, 'and 59 mph still costs something (' + hard[hard.length - 1].hurt.toFixed(0) + ' HP), so it is not free'); }
assert.ok(html.includes('buildBillboards(); buildDirtHills(); buildGrainPiles();'), 'built with the world, before the static merge');
assert.ok(html.includes("const h = s.hf ? s.hf(x, z) :"), 'floorAt reads heightfield surfaces');
assert.ok(html.includes('o.userData.noRoof ||'), 'the roof map skips noRoof meshes');
console.log('PASS: one grain pile, an ordinary heap (a heightfield to the ground, rounded outline, no walls, clear of the track) that jumps the train: 40+ mph clears a hopper car by a metre on the peak line and 3 m either side, landing on the grass past the track');
