// Run from the test/ directory: node validate-grass.cjs
// v1.97.128: the owner's PSX grass tuft pack. Six 32 px frames in a 128 x 64 atlas, drawn as crossed-quad cutout cards,
// streamed in 64 m chunks round the camera, and placed ONLY where a downward probe finds the grass ground layer - never on
// dirt, asphalt, a concrete pad or a building floor. Owner's words: "sporadically in grassy areas never on dirt or concrete".
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict'), path = require('path');
const html = fs.readFileSync('game.html', 'utf8');
const dir = path.join('..', 'assets', 'textures', 'grass');
const NL = String.fromCharCode(10);
const fn = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' exists');
  let d = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); }
  return '';
};

// ---------------------------------------------------------------- the pack on disk
const atlasPath = path.join(dir, 'psx-grass-atlas.png');
assert.ok(fs.existsSync(atlasPath), 'the atlas is in the repo');
{
  const d = fs.readFileSync(atlasPath).subarray(0, 33);
  assert.equal(d.toString('ascii', 1, 4), 'PNG', 'it is a PNG');
  assert.equal(d.readUInt32BE(16) + 'x' + d.readUInt32BE(20), '128x64', 'the atlas is 128 x 64');
}
const man = JSON.parse(fs.readFileSync(path.join(dir, 'grass-manifest.json'), 'utf8'));
assert.equal(man.atlas_size_px.join('x'), '128x64', 'the manifest agrees with the file');
assert.equal(man.frame_size_px.join('x'), '32x32', 'six 32 px frames');
assert.equal(man.ground_anchor_px_from_top_left.join(','), '16,30', 'the ground anchor is (16, 30)');
assert.equal(man.frames.length, 6, 'six variants');
{
  const seen = new Set();
  for (const f of man.frames) {
    const [x, y, w, h] = f.rect_px;
    assert.equal(w + 'x' + h, '32x32', f.id + ' is one frame');
    assert.ok(x >= 0 && y >= 0 && x + w <= 128 && y + h <= 64, f.id + ' rect stays inside the atlas (no bleed)');
    assert.ok(!seen.has(x + ',' + y), 'no two frames share a rect');
    seen.add(x + ',' + y);
  }
}

// ---------------------------------------------------------------- how the game draws a tuft
assert.ok(html.includes("'/corn-souls/assets/textures/grass/psx-grass-atlas.png'"), 'the game loads the atlas from the repo');
assert.ok(html.includes('t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;'), 'nearest sampling, no mipmaps (as the pack asks)');
assert.ok(html.includes('t.wrapS = t.wrapT = T.ClampToEdgeWrapping;'), 'clamp addressing');
assert.ok(html.includes('if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;'), 'tagged sRGB through the guarded form');
assert.ok(html.includes('tex.repeat.set(0.25, 0.5); tex.offset.set((f % 3) * 0.25, f < 3 ? 0.5 : 0);'), 'one 3 x 2 window per frame, row 0 on the top row of the file');
assert.ok(html.includes('new T.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: T.DoubleSide })'), 'cutout material at alphaTest 0.5, double sided');
assert.ok(!/map: tex, alphaTest: 0\.5[^)]*transparent: true/.test(html), 'and never translucent');
assert.ok(html.includes('const GRASS_H = 0.42, GRASS_W = 0.5, GRASS_SINK = GRASS_H * 2 / 32;'), 'the card is sunk by the manifest anchor: 2 px of 32');
assert.ok(html.includes('b.rotateY(Math.PI / 2);'), 'crossed quads: a tuft reads from any angle with no per-frame billboarding');
assert.ok(html.includes('m.castShadow = false; m.receiveShadow = false;'), 'grass casts no shadows');

// ---------------------------------------------------------------- grass only, never dirt or concrete (the owner's rule)
{
  const src = fn(html, 'grassProbe');
  const run = layer => {
    const ctx = {
      GRASS: { solids: [1] }, V3: (x, y, z) => ({ x, y, z }), DOWN: {}, ray: { set() {}, far: 0, intersectObjects: () => (layer ? [{ object: { material: { userData: layer === 'none' ? {} : { ground: layer } } }, point: { y: 0.02 } }] : []) }
    };
    vm.createContext(ctx); vm.runInContext(src + NL + 'this.out = grassProbe(0, 0);', ctx); return ctx.out;
  };
  assert.equal(run('grass'), 0.02, 'the grass layer takes a tuft');
  for (const bad of ['dirt', 'asphalt', 'dirtroad', 'pad', 'none']) assert.equal(run(bad), null, bad + ' is refused');
  assert.equal(run(null), null, 'and bare space with no ground under it is refused');
}

// ---------------------------------------------------------------- the scatter: seeded, clumped, streamed, culled
const stubs = () => ({
  T: {
    InstancedMesh: class { constructor(g, m, n) { this.count = n; this.userData = {}; this.visible = false; this.instanceMatrix = {}; this.instanceColor = {}; } setMatrixAt() {} setColorAt() {} computeBoundingSphere() {} dispose() {} },
    Color: class { setRGB() {} }
  },
  V3: (x, y, z) => ({ x, y, z }), DOWN: {}, dummy: { position: { set() {} }, rotation: { set() {} }, scale: { set() {} }, updateMatrix() {}, matrix: { clone: () => ({}) } },
  scene: { add() {}, remove() {} }, renderer: {}, localStorage: { getItem: () => null, setItem() {} },
  GRASS_H: 0.42, GRASS_W: 0.5, GRASS_SINK: 0.42 * 2 / 32
});
const GAME_DENSITY = +html.match(/const GRASS = \{\s*on: true, density: ([0-9.]+),/)[1];   // the game's own default
const grassCtx = (probe = () => 0, density = GAME_DENSITY) => {
  const ctx = stubs();
  ctx.GRASS = { on: true, density, dist: 96, chunk: 64, ring: 1, atlas: {}, mats: {}, geo: {}, chunks: new Map(), solids: [1], solidsT: 0, made: 0, shown: 0 };
  ctx.grassProbe = probe;
  ctx.grassGeo = () => ({});
  ctx.grassMat = () => ({});
  ctx.collectSolids = () => [1];
  ctx.tv = { copy: () => ({ applyMatrix4: () => ({ x: 0, y: 0, z: 0 }) }) };
  ctx.camera = { position: { x: 0, z: 0 } };
  vm.createContext(ctx);
  vm.runInContext([fn(html, 'treeRng'), fn(html, 'grassSolidsNear'), fn(html, 'grassChunk'), fn(html, 'grassDrop'), fn(html, 'updateGrass'), fn(html, 'grassSet')].join(NL), ctx);
  return ctx;
};
{
  const a = grassCtx(), b = grassCtx();
  a.grassChunk(0, 0); b.grassChunk(0, 0);
  assert.ok(a.GRASS.made > 0, 'a chunk on open grass grows tufts (' + a.GRASS.made + ')');
  // v1.97.135, owner: "remove 90% of the grass tufts" - a tenth of what the old 0.16 default grew, still in clumps of 3
  let old = 0, now = 0; for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) { const o = grassCtx(() => 0, 0.16), n = grassCtx(); o.grassChunk(cx, cz); n.grassChunk(cx, cz); old += o.GRASS.made; now += n.GRASS.made; }
  console.log('  grass: ' + now + ' tufts vs ' + old + ' before (' + (100 * now / old).toFixed(1) + '%)'); assert.ok(now / old > 0.07 && now / old < 0.13, 'about a tenth of the old tufts (' + now + ' vs ' + old + ', ' + (100 * now / old).toFixed(1) + '%)');
  assert.ok(now % 3 === 0, 'still in clumps of three, not lone blades');
  assert.equal(a.GRASS.made, b.GRASS.made, 'and the same chunk grows the same tufts every session (seeded)');
  assert.ok(a.GRASS.chunks.get('0:0').meshes.length <= 6, 'packed into at most one instanced mesh per frame');
  const c = grassCtx(() => null);   // a probe that never finds grass: dirt, concrete, the corn, a floor
  c.grassChunk(0, 0);
  assert.equal(c.GRASS.made, 0, 'a chunk with no grass under it grows nothing at all');
}
{
  const ctx = grassCtx();
  for (let i = 0; i < 12; i++) ctx.updateGrass(1);   // one chunk per frame, so let it settle
  assert.equal(ctx.GRASS.chunks.size, 9, 'a 3 x 3 ring of 64 m chunks round the camera');
  assert.equal(ctx.GRASS.made > 0, true, 'grass grows in all of them');
  ctx.camera.position.x = 64 * 6;   // walk six chunks east
  ctx.updateGrass(1);
  assert.ok(!ctx.GRASS.chunks.has('0:0'), 'chunks left behind are released');
  const anyVisible = [...ctx.GRASS.chunks.values()].some(c => c.meshes.some(m => m.visible));
  assert.ok(anyVisible, 'and the new ones are shown');
  ctx.GRASS.dist = 0; ctx.updateGrass(0);
  assert.ok(![...ctx.GRASS.chunks.values()].some(c => c.meshes.some(m => m.visible)), 'a zero draw distance hides everything');
}
{
  const ctx = grassCtx();
  ctx.grassSet({ density: 9, dist: -4, on: false });
  assert.equal(ctx.GRASS.density, 2, 'density clamps to 2 tufts per m2');
  assert.equal(ctx.GRASS.dist, 0, 'and the draw distance floors at 0');
  assert.equal(ctx.GRASS.on, false, 'switching it off works');
  assert.ok(html.includes("localStorage.setItem('cs_grass'"), 'the settings are remembered per device');
  assert.ok(html.includes("get grass() { return { on: GRASS.on, density: GRASS.density, dist: GRASS.dist, chunks: GRASS.chunks.size, instances: GRASS.made, visible: GRASS.shown, drawCalls:"), 'and P3.grass reports chunks, instances, visible and draw calls');
}

assert.ok(html.includes('function grassSolidsNear(x0, z0, S)') && html.includes('const pts = [[], [], [], [], [], []], near = grassSolidsNear(x0, z0, S);'),
  'each chunk prefilters the solids to what reaches it: 256 probes against 2,000 meshes would cost more than the grass');
// ---------------------------------------------------------------- registry and credits
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8'));
const entry = reg.assets.find(a => a.id === 'first-party-psx-grass-tufts');
assert.ok(entry && entry.creator === 'CrazyLegsMalone (project owner)' && entry.status === 'in-use', 'registered as first-party owner work, in use');
assert.ok(entry.files.includes('assets/textures/grass/psx-grass-atlas.png'), 'the atlas is listed');
assert.ok(fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8').includes('PSX grass tufts'), 'and credited');

console.log('PASS: PSX grass - six 32 px frames in a 128 x 64 atlas with the (16,30) anchor, nearest cutout cards with no shadow, crossed quads so a tuft reads from any angle with no per-frame work, seeded clumped scatter that only takes ground the probe finds grass on (never dirt, asphalt, concrete pads or floors), streamed in a 3 x 3 ring of 64 m chunks that are dropped behind and culled by distance, with density and draw distance clamped and remembered');

assert.ok(html.includes('m.userData.noHit = true;'), 'and takes no paintball hits');
