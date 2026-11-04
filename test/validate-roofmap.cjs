// Run from the test/ directory: node validate-roofmap.cjs
// v1.97.147, owner: "fix the roof collision rebuild". The roof map's second build (12 s after you start walking, for the
// late-loading models) drew the whole plant top-down into one big target and read it back in one go: a ~150 ms freeze mid-walk.
// It is now built a 128 x 128 tile a frame (two tiles in flight, read back asynchronously) and swapped in whole when the last tile
// lands. Runs the game's own rebuild code against a stand-in renderer that "draws" a known height pattern, so a tile placed in the
// wrong spot, flipped, or cut at a seam shows up cell for cell; then the failure path, and the moving things it leaves out.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const code = s => s.split('\n').map(l => l.replace(/\s\/\/ .*$/, '')).join('\n');   // the statements only (a // mid-line once hid one)

const src = cut('const ROOFMAP = {', '\n') + '\n' + cut('function roofAt(x, z) {', '\n') + '\n' + cut('const ROOFMAP_TILE = 128;', 'function roofMapBuild() {');

// the plant: a 300 x 200 m yard of roofs (x 0..300, z 0..200). Every cell gets its own height so a misplaced tile can't hide.
const H = (x, z) => (x < 0 || x > 300 || z < 0 || z > 200) ? null : 2 + ((Math.floor(x) * 7 + Math.floor(z) * 13) % 97) / 4;
const scene = new T.Scene();
const yard = new T.Mesh(new T.BoxGeometry(300, 10, 200)); yard.position.set(150, 5, 100); scene.add(yard);
let failNext = false, renders = 0, rendersThisFrame = 0;
const pending = [], data = new Map();
const renderer = {
  capabilities: { maxTextureSize: 4096 }, info: { render: { calls: 7, triangles: 70 } }, shadowMap: { autoUpdate: true, needsUpdate: false }, _rt: null, _cc: 0x123456,
  getClearColor: c => c.set(renderer._cc), getClearAlpha: () => 1, getRenderTarget: () => renderer._rt, setRenderTarget(rt) { renderer._rt = rt; }, setClearColor(c) { renderer._cc = c && c.isColor ? c.getHex() : c; }, clear() {},
  render(sc, cam) {   // the stand-in GPU: fill the bound target as the height shader would, from the camera's window on the yard
    if (failNext) { failNext = false; throw new Error('context lost'); }
    assert.ok(sc.overrideMaterial && sc.overrideMaterial.isShaderMaterial && sc.fog === null && renderer.shadowMap.autoUpdate === false, 'a tile draws with the height shader, no fog, no shadow pass');
    assert.ok(cam.layers.mask === 1 << 30 && yard.layers.test(cam.layers), 'only the listed meshes (layer 30) are drawn');
    renders++; rendersThisFrame++; renderer.info.render.calls += 50; renderer.info.render.triangles += 5000;
    const rt = renderer._rt, n = rt.width, px = new Uint8Array(n * n * 4), sx = (cam.right - cam.left) / n, sy = (cam.top - cam.bottom) / n;
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {   // screen right is +x, screen up is -z
      const x = cam.position.x + cam.left + (col + 0.5) * sx, z = cam.position.z - (cam.bottom + (row + 0.5) * sy), y = H(x, z); if (y === null) continue;
      const v = Math.floor(Math.min(1, Math.max(0, (y + 20) / 160)) * 16777215), k = (row * n + col) * 4;
      px[k] = Math.floor(v / 65536); px[k + 1] = Math.floor(v / 256) % 256; px[k + 2] = v % 256; px[k + 3] = 255; }
    data.set(rt, px);
  },
  readRenderTargetPixelsAsync(rt, x, y, w, h, buf) { const px = data.get(rt); return new Promise(res => pending.push(() => { buf.set(px); res(buf); })); }
};
const PERF = { errs: 0, err: null };
const ctx = { T, Math, console: { log() {}, warn() {}, error() {} }, Float32Array, Uint8Array, Infinity, scene, renderer, PERF, wallSegs: [[0, 0, 300, 0], [400, 0, 400, 50]], performance: { now: () => 0 }, roofMapMeshes: () => [yard] };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.ROOFMAP = ROOFMAP; this.roofAt = roofAt; this.roofMapGrid = roofMapGrid; this.roofMapRebuildStart = roofMapRebuildStart; this.roofMapStep = roofMapStep; this.roofMapGuard = roofMapGuard;', ctx);
const M = ctx.ROOFMAP, tick = () => new Promise(r => setImmediate(r));
const frame = async (gpuDone = true) => { rendersThisFrame = 0; ctx.roofMapGuard(ctx.roofMapStep); assert.ok(rendersThisFrame <= 1, 'at most one tile drawn a frame'); if (gpuDone) while (pending.length) pending.shift()(); await tick(); };

(async () => {
  // the grid: whole cells from a snapped corner, so a part swinging at the plant's edge can't slide every cell a fraction
  const G = ctx.roofMapGrid([yard]); assert.equal(G.cell, 1); assert.ok(Number.isInteger(G.x0 / G.cell) && Number.isInteger(G.z0 / G.cell), 'the corner sits on whole cells');
  { yard.position.x += 0.37; yard.updateMatrixWorld(true); const G2 = ctx.roofMapGrid([yard]); yard.position.x -= 0.37; yard.updateMatrixWorld(true); assert.equal(G2.x0, G.x0, 'a small shift at the edge leaves the grid where it was'); }

  // an old map is in use while the new one builds
  const old = new Float32Array(4).fill(5); Object.assign(M, { h: old, x0: -1000, z0: -1000, cell: 1, nx: 2, nz: 2 });
  assert.equal(ctx.roofMapRebuildStart(), true); assert.equal(ctx.roofMapRebuildStart(), false, 'one rebuild at a time');
  const J = M.job, nTiles = Math.ceil(G.nx / 128) * Math.ceil(G.nz / 128); assert.equal(J.tiles.length, nTiles, nTiles + ' tiles of 128 x 128');
  assert.ok(nTiles >= 6, 'the test yard spans several tiles both ways (seams in x and z)');
  // the GPU is slow: two tiles go out, then nothing more until one comes back
  await frame(false); await frame(false); await frame(false);
  assert.equal(renders, 2, 'two tiles in flight, no more'); assert.equal(M.h, old, 'the old map stays in use while the new one builds');
  assert.equal(renderer.info.render.calls, 7, 'the tiles are kept out of the fps readout'); assert.equal(renderer._rt, null, 'the screen target is put back'); assert.equal(renderer._cc, 0x123456, 'and the clear colour');
  assert.ok(scene.overrideMaterial === null && renderer.shadowMap.autoUpdate === true, 'the scene and shadows are put back after each tile');
  let frames = 3; while (M.job && frames < 200) { await frame(); frames++; }
  assert.equal(M.job, null, 'the rebuild finishes'); assert.equal(renders, nTiles, 'each tile drawn once'); assert.ok(frames >= nTiles, 'over ' + frames + ' frames, not one');
  assert.equal(M.builds, 1); assert.equal(M.lastTiles, nTiles); assert.equal(PERF.err, null);
  assert.ok(!yard.layers.test(Object.assign(new T.Layers(), { mask: 1 << 30 })), 'the meshes leave the roof-map layer afterwards');
  // every cell holds the height of its own spot: no tile shifted, flipped or clipped at a seam
  let bad = 0, roofs = 0;
  for (let j = 0; j < M.nz; j++) for (let i = 0; i < M.nx; i++) { const want = H(M.x0 + (i + 0.5) * M.cell, M.z0 + (j + 0.5) * M.cell), got = M.h[j * M.nx + i];
    if (want === null ? got !== -99 : Math.abs(got - want) > 1e-3) bad++; else if (want !== null) roofs++; }
  assert.equal(bad, 0, 'cells wrong: ' + bad + ' of ' + M.h.length); assert.equal(roofs, 300 * 200, 'the whole yard is roof');
  assert.ok(Math.abs(ctx.roofAt(127.5, 63.2) - H(127.5, 63.2)) < 1e-3 && Math.abs(ctx.roofAt(128.2, 128.7) - H(128.2, 128.7)) < 1e-3, 'roofAt either side of a tile seam');
  assert.ok(M.tops[0] >= 2 && M.tops[1] === Infinity, 'the wall tops are worked out from the new map (a wall under roof stops at it; one in the open keeps blocking)');

  // a rebuild that fails part-way is reported and drops back to the map it had
  const kept = M.h; renders = 0; ctx.roofMapRebuildStart(); await frame(); failNext = true; await frame();
  assert.equal(M.job, null, 'a failed tile ends the rebuild'); assert.equal(M.h, kept, 'and the last good map stays');
  assert.equal(PERF.err, 'roofmap', 'the failure shows on the fps line'); assert.equal(M.builds, 1);
  assert.equal(scene.overrideMaterial, null, 'the scene is put back even when a tile throws');
  assert.ok(!yard.layers.test(Object.assign(new T.Layers(), { mask: 1 << 30 })), 'and the layer cleared');

  // in the game
  assert.ok(html.includes('if (ROOFMAP.again > 0 && (ROOFMAP.again -= dt) <= 0) roofMapGuard(roofMapRebuildStart);') && html.includes('if (ROOFMAP.job) roofMapGuard(roofMapStep);'), 'the 12 s rebuild runs sliced, a step each frame');
  assert.ok(!/ROOFMAP\.again[^\n]*roofMapBuild\(\)/.test(html), 'not the old one-shot');
  const rm = code(cut('function roofMapMeshes() {', 'const out = [], sp'));
  for (const k of ['vehicles', 'train.cars', 'THRUS', 'NPCS', 'birds', 'critters', 'pondFrogs', 'CORN_PROPS_STATE', 'O.cars', 'O.pivot.g', 'CREEP.list', 'utv.g', 'O.shedMower', 'NET.rp', 'NET.rr', 'SKY.dome', 'VULT.s', 'bodies'])
    assert.ok(rm.includes(k), 'the roof map leaves out what moves (in code, not a comment): ' + k);
  console.log('PASS: roof map rebuild (' + nTiles + ' tiles, one drawn a frame, two in flight, swapped in whole; every cell right across the seams; snapped grid; the old map kept on failure, reported; through trains, critters, the irrigation pivot left out)');
})().catch(e => { console.error(e); process.exit(1); });
