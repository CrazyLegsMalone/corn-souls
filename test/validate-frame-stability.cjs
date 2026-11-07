// Run from the test/ directory: node validate-frame-stability.cjs
// v1.97.92 frame-stability audit. Guards the five fixes that keep every frame costing about the same:
//  1. shadows redrawn every frame on every tier, cheaper on low/medium (smaller box, coarse steps, no tiny casters)
//  2. critter ground probes: at most one per frame, against nearby meshes only (they were 5-11 ms spikes)
//  3. frame pacing on whole screen refreshes (the old accumulator skipped frames on timing jitter)
//  4. no per-frame garbage in the vehicle contacts, roof tops and vehicle hits
//  5. no forced page layout every frame while walking
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), launcher = fs.readFileSync('index.html', 'utf8');
const fn = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };

// 1 ---------------------------------------------------------------- shadows
assert.ok(html.includes('SH = { on: false, R: TIER.shadowR || 85,'), 'the walking shadow box size comes from the tier');
const follow = fn(html, 'shadowFollow');
assert.ok(follow.includes("const st = Math.max(1, Math.round((TIER.shadowStep || 0) / tx)) * tx;"), 'the box step is a whole number of texels (no shimmer)');
assert.ok(follow.includes('/ st) * st') && follow.includes('w = Math.round((cx * z.x + cy * z.y + cz * z.z) / st) * st'), 'all three box axes snap to the coarse step, so walking does not move it every frame');
assert.ok(html.includes('if (TIER.minCaster > 0) {') && html.includes('< TIER.minCaster) { o.castShadow = false; off++; }'), 'little objects stop casting on low / medium');
assert.ok(html.indexOf('PERF.smallCasters = off;') < html.indexOf('PERF.casters = n;'), 'and the caster count is taken after the trim');

// 2 ---------------------------------------------------------------- critters
const spawn = fn(html, 'crSpawn'), leg = fn(html, 'crLeg');
assert.ok(spawn.includes('for (let k = 0; k < 1; k++)') && !spawn.includes('k < 20'), 'a spawn makes one ground probe per frame, not 20');
assert.ok(spawn.includes('> 20) { c.spawnTries = 0; c.t = 2; return; }'), 'and rests 2 s after 20 frames without a spot');
assert.ok(!/\n  c\.t = 2;\s+\/\/ try again shortly\n\}/.test(spawn), 'a miss leaves c.t at 0, so the very next frame tries again');
assert.ok(leg.includes('for (let k = 0; k < 1; k++)') && !leg.includes('k < 8'), 'picking a run makes one try per frame');
assert.ok(html.includes('c.t = (c.legTries = (c.legTries || 0) + 1) < 8 ? 0 : (c.legTries = 0, 1);'), 'up to 8 frames of tries, then a 1 s rest');
assert.ok(html.includes('crSolids = crSolidsNear(collectSolids(true));'), 'the probes only test meshes near the critter areas');
{ // run crSolidsNear against stub meshes
  const src = fn(html, 'crSolidsNear');
  class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
  class Sphere { constructor() { this.center = new V(); this.radius = 0; } copy(s) { this.center = new V(s.center.x, s.center.y, s.center.z); this.radius = s.radius; return this; } applyMatrix4(m) { this.center.x += m.x; this.center.z += m.z; return this; } }
  const mesh = (x, z, r) => ({ geometry: { boundingSphere: { center: new V(0, 0, 0), radius: r } }, matrixWorld: { x, z } });
  const ctx = { T: { Sphere, Vector3: V }, CR_AREA: [[0, 0, 10, 10]] }; vm.createContext(ctx);
  vm.runInContext(src + '\nthis.out = crSolidsNear([' + ['mesh(5,5,1)', 'mesh(50,50,1)', 'mesh(13,5,2)', 'mesh(-40,5,1)'].join(',') + ']).length;', Object.assign(ctx, { mesh }));
  assert.equal(ctx.out, 2, 'a mesh inside or touching (with 2 m margin) a critter area is kept, far ones are dropped');
}

// 2c --------------------------------------------------------------- four lizards (v1.97.170, owner: "increase lizard number to 4")
{ const set = html.match(/if \(!critters\) critters = (\[[^\]]*\]);/);
  assert.ok(set, 'the critter set is created in one place');
  assert.equal((set[1].match(/makeCritter\('lizard'\)/g) || []).length, 4, 'four lizards');
  assert.equal((set[1].match(/makeCritter\('rat'\)/g) || []).length, 1, 'and still the one rat');
  // each lizard has its own sprite material: the hit / eat tint is applied per creature
  assert.ok(html.includes('const sm = new T.SpriteMaterial({ map: srgbTex(new T.CanvasTexture(cv)), alphaTest: 0.5 }); mats.push(sm);'),
    'makeCritter builds a fresh sprite material per creature (shooting one cannot recolour the rest)');
  // one spawn probe a frame for the whole set, whatever the population
  assert.ok(html.includes('let crBudget = 1;') && html.includes('if ((c.t -= dt) <= 0 && crBudget > 0) { crBudget--; crSpawn(c); }'),
    'the spawn budget is shared, so four lizards still cost one probe a frame');
  // run it: five critters all waiting, one frame at a time
  const src = fn(html, 'updateCritters');
  const mk = () => ({ state: 'gone', t: -1, life: 100, g: { position: { x: 0, y: 0, z: 0 }, visible: false }, mats: [], cols: [] });
  const ctx = { dt: 0, calls: 0, critters: [mk(), mk(), mk(), mk(), mk()], crSolids: [1], crSolidsT: 0, collectSolids: () => [], crSolidsNear: () => [1],
    critNetGuest: () => false, crFar: () => false, crSpawn: c => { ctx.calls++; c.state = 'idle'; }, crLeg: () => true, crFloor: () => 0, walk: { on: false, dead: false }, clock: 0,
    Math, V3: (x = 0, y = 0, z = 0) => ({ x, y, z }), makeCritter: () => mk() };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.updateCritters = updateCritters;', ctx);
  let worst = 0;
  for (let i = 0; i < 12; i++) { const before = ctx.calls; ctx.updateCritters(0.1); worst = Math.max(worst, ctx.calls - before); }
  assert.equal(worst, 1, 'never more than one spawn probe in a frame (worst ' + worst + ')');
  assert.equal(ctx.calls, 5, 'and all five still get their turn (' + ctx.calls + ' spawns over 12 frames)'); }


const wallSpot = fn(html, 'crWallSpot'), wallStep = fn(html, 'crWallStep');
assert.ok(spawn.includes("if (c.kind === 'lizard' && (c.spawnTries || 0) < 8)"), 'a lizard asks for a wall first, and only falls back to the floor after 8 frames');
assert.ok(spawn.includes("c.state = 'climb'"), 'and it starts out clinging to it');
assert.ok(html.includes("(s === 'idle' || s === 'run' || s === 'climb')"), 'the 2P mirror counts a climbing lizard as alive, not as a corpse');
assert.ok(html.includes('if (c.wall) { const y = crFloor(c.g.position.x, c.g.position.z); if (y != null) c.g.position.y = y; c.wall = null; }'), 'shooting one off a wall drops the corpse to the floor');
{ // a horizontal probe: a wall gives a spot 7 cm clear of the face, facing out; a floor is not something to hold on to
  class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
  const mk = face => {
    const hit = { point: new V(3, 2, 4), face: { normal: new V(face[0], face[1], face[2]) } };
    const ctx = { CR_AREA: [[-10, -10, 10, 10]], walk: { on: false }, V3: (x, y, z) => new V(x, y, z), Math,
      crRay: () => hit, upNormal: h => h.face.normal };
    vm.createContext(ctx); vm.runInContext(wallSpot + '\nthis.out = crWallSpot();', ctx); return ctx.out;
  };
  const w = mk([-1, 0, 0]);
  assert.ok(w && Math.abs(w.x - (3 - 0.07)) < 1e-9 && w.y === 2 && w.nx === -1 && w.nz === 0, 'a wall face gives a spot just clear of it, with the normal pointing out');
  assert.equal(mk([0, 1, 0]), null, 'a floor (or roof) is rejected');
}
{ // crawling off the end of the face: it turns round instead of walking into the air
  class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
  const ctx = { clock: 0, V3: (x, y, z) => new V(x, y, z), crRay: () => null, upNormal: () => ({ x: 0, y: 0, z: 0 }),
    c: { wall: { x: 1, y: 2, z: 0, nx: -1, nz: 0, tx: 0, tz: 1, dir: 1, t: 5 }, g: { position: new V(1, 2, 0), userData: {} } } };
  vm.createContext(ctx); vm.runInContext(wallStep + '\ncrWallStep(c, 1 / 60);', ctx);
  assert.equal(ctx.c.wall.dir, -1, 'no face ahead: the lizard turns round');
}

// 3 ---------------------------------------------------------------- frame pacing
{ const src = html.slice(html.indexOf('const PACE = {'), html.indexOf('function frame(now) {'));
  const k = (hz, cap) => { const ctx = { FPS_CAP: cap }; vm.createContext(ctx); vm.runInContext(src + '\nlet t = 0; for (let i = 0; i < 1200; i++) { t += 1000 / ' + hz + ' + (i % 3 - 1) * 0.15; paceUpdate(t); } this.k = PACE.k; this.hz = PACE.hz;', ctx); return ctx.k; };
  assert.equal(k(60, 60), 1, '60 Hz screen, 60 cap: every refresh is drawn (no jitter skips)');
  assert.equal(k(120, 60), 2, '120 Hz screen, 60 cap: every 2nd refresh, even gaps');
  assert.equal(k(90, 60), 1, '90 Hz screen, 60 cap: every refresh (never uneven 1-2-1-2 gaps)');
  assert.equal(k(144, 144), 1, '144 Hz desktop, 144 cap: every refresh');
  assert.equal(k(165, 60), 3, '165 Hz screen, 60 cap: every 3rd refresh');
  assert.equal(k(240, 90), 3, '240 Hz screen, 90 cap: every 3rd refresh');
  { const kp = (hz) => { const ctx = { FPS_CAP: 30, window: { Plant3D: { tier: { fps: 30, fpsHi: 40 } } } }; vm.createContext(ctx); vm.runInContext(src + '\nlet t = 0; for (let i = 0; i < 1200; i++) { t += 1000 / ' + hz + ' + (i % 3 - 1) * 0.15; paceUpdate(t); } this.k = PACE.k;', ctx); return ctx.k; };
    assert.equal(kp(120), 3, 'v1.97.22: phone tier on a 120 Hz screen: every 3rd refresh (40 fps), measured from real refresh gaps');
    assert.equal(kp(60), 2, 'and on a 60 Hz screen it keeps 30 (every 2nd)'); }
}
assert.ok(html.includes('function frame(now) {\n  paceUpdate(now);'), 'every refresh feeds the pacing measurement');

// 4 ---------------------------------------------------------------- no per-frame garbage
const tops = fn(html, 'updateVehTops');
assert.ok(!tops.includes('of [b.min.x') && tops.includes('i & 1 ? b.max.x : b.min.x'), 'roof tops walk the 8 box corners without throwaway arrays');
const hits = fn(html, 'vehicleHits');
assert.ok(!/\.map\(|\.concat\(|\.filter\(/.test(hits) && hits.includes('vehHitOne('), 'vehicle hits walk the semis and train cars in place');
const one = fn(html, 'vehHitOne');
assert.ok(!one.includes('continue') && one.includes('return true;') && one.trim().endsWith('return false;\n}'), 'vehHitOne reports a hit with true, otherwise false');
const floor = fn(html, 'floorAt');
assert.ok(!floor.includes('DIGS.some(') && floor.includes('for (let i = 0; i < DIGS.length; i++)'), 'floorAt checks the dug-out areas without a closure');
assert.ok(launcher.includes('const CS_POOL=[],CS={n:0,stamp:-1};') && launcher.includes('if(CS.stamp===clock)return;CS.stamp=clock;CS.n=0;'), 'vehicle contacts are built once per frame into a reused pool');
assert.ok(launcher.includes('function csVehiclePenetration(x,z,r,ignore){   // returns a shared result object') && launcher.includes('if(o.g===ignore)continue;'), 'and queries skip their own vehicle instead of rebuilding the list');
{ // run the engine string against stub vehicles: bodies are pooled, queries are correct
  const start = launcher.indexOf('const vehicleContactEngine=') + 'const vehicleContactEngine='.length, end = launcher.indexOf(';\n  const playerBlockAnchor=', start);
  const engine = JSON.parse(launcher.slice(start, end));
  const g = (x, z, a = 0) => ({ position: { x, z }, rotation: { y: a }, visible: true });
  const truck = g(0, 0), car = g(20, 0), mine = g(40, 0);
  const ctx = { clock: 1, vehicles: [{ g: truck }], train: { cars: [] }, THRUS: [], O: { cars: [{ g: car, x: 20, z: 0, a: 0 }] }, CAR_ON: null, RANGER_SAVE: null, walk: { drive: true, mow: false }, utv: { g: mine }, NET: {} };
  vm.createContext(ctx); vm.runInContext(engine + '\nthis.a = csVehiclePenetration(20, 2.5, 1, null); this.ax = this.a && this.a.z; this.n1 = CS.n; this.b = csVehiclePenetration(20, 2.5, 1, O.cars[0].g); this.n2 = CS.n; this.pool = CS_POOL.length; clock = 2; csBuild(); this.pool2 = CS_POOL.length; this.c = csVehiclePenetration(0, 0.5, 1, null);', ctx);
  assert.ok(ctx.a && ctx.ax > 0, 'a point next to a parked car is pushed away from it');
  assert.equal(ctx.b, null, 'the same query ignoring that car finds nothing');
  assert.equal(ctx.n1, 7, 'one truck (5 samples) and one car (2 samples) are in the frame list');
  assert.equal(ctx.n2, 7, 'a second query in the same frame reuses the list');
  assert.equal(ctx.pool2, ctx.pool, 'the next frame reuses the pooled objects (no new ones)');
  assert.ok(ctx.c && ctx.c.kind === 'corn-truck', 'a point inside the truck reports a truck contact');
}

// 5 ---------------------------------------------------------------- no forced layout while walking
assert.ok(html.includes("const labelsOn = !P3.walking && $('labels').offsetParent;") && html.includes("const panelW = labelsOn && $('panel').classList.contains('open') ? $('panel').offsetWidth : 0;"),
  'the side panel is only measured when the station labels are on screen');
// v1.97.146, owner: "remove that menu we dont need it at this point" - the equipment panel never opens
assert.ok(html.includes('const UNIT_PANEL = false;') && html.includes('function selectUnit(id, noCam) {\n  if (!UNIT_PANEL) return;'), 'the equipment panel is switched off at selectUnit (every way in goes through it)');
assert.ok(html.includes("if (!P3.walking && $('labels').offsetParent) for (const id in labels) { const s = Sim."), 'the 5 Hz label refresh is skipped while walking too');

// v1.97.157, owner: "yeast cooler temp display texture flickers" - the readout sat exactly on its housing's front face (z-fighting)
{ const m = html.match(/scr\.position\.set\(cs\[3\], 2\.55, Z0 - ([\d.]+)\); scr\.rotation\.y = Math\.PI;[^\n]*\n\s*box\(0\.36, 0\.22, ([\d.]+), dark, cs\[3\], 2\.55, Z0 - ([\d.]+)\);/);
  assert.ok(m, 'the yeast cooler readout and its housing');
  const face = +m[3] + +m[2] / 2; assert.ok(+m[1] - face >= 0.005, 'the readout stands clear in front of its housing (' + (+m[1]).toFixed(3) + ' vs face ' + face.toFixed(3) + '), not on it'); }

console.log('PASS: frame stability - shadows every frame with a cheaper pass, critter probes time-sliced and local, refresh-locked frame pacing, no per-frame garbage in vehicle contacts / roofs / hits / floorAt, no layout reads while walking');

async function verifyTestUpdate() {
  const worker = fs.readFileSync('sw.js', 'utf8');
  const handlers = new Map(), deleted = [];
  let claims = 0, navigations = 0;
  const current = worker.match(/const CACHE = '([^']+)'/)[1];
  const oldTest = 'corn-souls-test-shell-v1', live = 'corn-souls-live-shell-v1';
  vm.runInNewContext(worker, {
    caches: {
      keys: async () => [oldTest, current, live],
      delete: async name => deleted.push(name),
    },
    self: {
      addEventListener: (type, fn) => handlers.set(type, fn),
      clients: {
        claim: async () => claims++,
        matchAll: async () => [{
          url: 'https://example.test/corn-souls/test/index.html',
          navigate: async () => navigations++,
        }],
      },
    },
  });
  let activation;
  handlers.get('activate')({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, [oldTest]);
  assert.equal(claims, 1, 'the new worker takes over fetches');
  assert.equal(navigations, 0, 'activating the worker keeps an open game running');
  assert.equal([...launcher.matchAll(/checkLatestVersion\(\)/g)].length, 1, 'only a fresh launch can redirect to a new version');
  assert.ok(launcher.includes('if (await checkLatestVersion()) return;'));
}
verifyTestUpdate().catch(err => { console.error(err); process.exitCode = 1; });
