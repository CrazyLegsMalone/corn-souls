// Run from the test/ directory: node validate-trees.cjs
// v1.97.126/127: the owner's PSX tree pack (Kernel Art/2D/tree_sprites_ten_8view) draws all 56 scenery trees, in stands of
// one species each, at the same spots every session, never in the corn, on a road, on the highway or on the railroad.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict'), path = require('path');
const html = fs.readFileSync('game.html', 'utf8');
const dir = path.join('..', 'assets', 'textures', 'trees');
const NL = String.fromCharCode(10);
const fn = (src, name) => {
  const i = src.indexOf('function ' + name + '(');
  assert.ok(i >= 0, name + ' exists');
  let d = 0;
  for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) return src.slice(i, j + 1); }
  return '';
};

// ---------------------------------------------------------------- the pack on disk
const KINDS = ['01-broadleaf', '02-leaning-pine', '03-silver-birch', '04-weeping-willow', '05-red-maple',
  '06-dead-snag', '07-fan-palm', '08-cypress', '09-flowering-cherry', '10-acacia'];
for (const k of KINDS) {
  const f = path.join(dir, k + '-atlas.png');
  assert.ok(fs.existsSync(f), 'atlas present: ' + k);
  const d = fs.readFileSync(f).subarray(0, 33);
  assert.equal(d.toString('ascii', 1, 4), 'PNG', k + ' is a PNG');
  assert.ok(d.readUInt32BE(16) === 256 && d.readUInt32BE(20) === 128, k + ' atlas is 4 x 2 tiles of 64 px');
}
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(man.frame_size_px.join('x'), '64x64', '64 px frames');
assert.equal(man.anchor_px_from_top_left.join(','), '32,62', 'ground anchor at 32, 62');
assert.equal(man.trees.length, 10, 'ten species');
for (const t of man.trees) {
  assert.equal(t.frames.length, 8, t.id + ' has eight views');
  assert.equal(t.frames.map(f => f.angle_degrees).join(','), '0,45,90,135,180,225,270,315', t.id + ' runs front round to front-left');
  for (const f of t.frames) assert.equal(f.atlas_rect_px[2] + 'x' + f.atlas_rect_px[3], '64x64', t.id + ' frame rects are one tile');
}

// ---------------------------------------------------------------- the game side (how a card is drawn)
assert.ok(html.includes("'/corn-souls/assets/textures/trees/' + kind + '-atlas.png'"), 'the game loads the atlases from the repo');
assert.ok(html.includes('t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;'), 'crisp nearest pixels, no mipmaps');
assert.ok(html.includes('if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;') && html.includes('return (TREE_SPR.atlas[kind] = t);'), 'atlases tagged sRGB through the guarded form');
assert.ok(html.includes('tex.repeat.set(0.25, 0.5); tex.offset.set((view % 4) * 0.25, view < 4 ? 0.5 : 0);'), 'one 4 x 2 window per view, row 0 on the top row of the file');
assert.ok(html.includes('geo.translate(0, TREE_SPR.quad / 2 - TREE_SINK, 0);') && html.includes('const TREE_SINK = 0.25;'), 'bottom-anchored by the pack anchor');
assert.ok(html.includes('m.castShadow = false; m.receiveShadow = false;'), 'a flat card never casts a shadow');
assert.ok(html.includes('const TREE_SPRITE_COUNT = 999;'), 'every scenery tree is a card now (the proof of concept used 8)');
assert.ok(html.includes('const TREE_SPOTS = treePlacement();'), 'and the layout comes from the placement function');
assert.ok(html.includes("else billboard('tree', x, z, s);"), 'the code-painted spruce path is still there for an A/B (lower TREE_SPRITE_COUNT)');


// ---------------------------------------------------------------- the 45 degree choice, from the game's own code
{
  const src = html.slice(html.indexOf('function treeView(a) {'), html.indexOf('function treeAtlas(kind) {'));
  assert.ok(src.length > 20, 'treeView came out of the game');
  const view = a => { const ctx = { Math }; vm.createContext(ctx); vm.runInContext(src + NL + 'this.v = treeView(' + a + ');', ctx); return ctx.v; };
  const D = Math.PI / 180;
  assert.deepEqual([0, 90, 180, 270].map(a => view(a * D)), [0, 2, 4, 6], 'front, right, back and left are views 0, 2, 4, 6');
  assert.equal(view(45 * D), 1, 'the diagonals fall between them');
  assert.equal(view(22 * D), 0, 'within 22.5 degrees of front is still front');
  assert.equal(view(23 * D), 1, 'past that it is the next view');
  assert.equal(view(-90 * D), 6, 'negative angles wrap the right way');
}

// ---------------------------------------------------------------- placement: same spots, one species per stand, nothing in the way
const line = p => { const m = html.match(new RegExp(p)); assert.ok(m, 'source found: ' + p); return m[0]; };
const block = (from, to) => { const i = html.indexOf(from); assert.ok(i > 0, from); const j = html.indexOf(to, i); return html.slice(i, j + to.length); };
const world = [
  line('const WXR = [^' + NL + ']+'),
  line('const NROAD = [^' + NL + ']+'),
  line('const SH_DX = [^' + NL + ']+'),
  line('const HWY = [^' + NL + ']+'),
  block('const DIRT_ROADS = [', '];'),
  line('const CFIELD = [^' + NL + ']+'),
  line('const inCField = [^' + NL + ']+'),
  'const O = { pivot: { cx: -675, cz: -99, R: 344 } };',
  block('const TREE_TOTAL = 56;', '];'),
  fn(html, 'treeRng'), fn(html, 'treeBlocked'), fn(html, 'treePlacement')
].join(NL);
assert.ok(html.includes('const cx = -675, cz = -99, R = 344;'), 'the pivot stub matches the game');
const run = () => {
  const ctx = { Math };
  vm.createContext(ctx);
  vm.runInContext(world + NL + 'this.out = treePlacement(); this.blk = treeBlocked;', ctx);
  return ctx;
};
const A = run().out, B = run().out;
assert.equal(A.length, 56, 'all 56 trees are placed');
assert.ok(Array.isArray(A[0]) && A[0].length === 4, 'each spot carries x, z, scale and species');
assert.equal(JSON.stringify(A), JSON.stringify(B), 'and they are the same 56 spots every session (seeded, not Math.random)');
const kinds = {};
for (const s of A) kinds[s[3]] = (kinds[s[3]] || 0) + 1;
assert.equal(Object.keys(kinds).length, 10, 'all ten species are used: ' + JSON.stringify(kinds));
assert.ok(Object.values(kinds).every(n => n >= 5), 'and each has a stand of its own (five or more trees): ' + JSON.stringify(kinds));
{ // nothing stands in anything
  const ctx = run();
  for (const s of A) assert.equal(ctx.blk(s[0], s[1]), false, 'free ground at ' + s[0].toFixed(1) + ',' + s[1].toFixed(1));
  assert.equal(ctx.blk(-30, -200), true, 'the north corn field is blocked');
  assert.equal(ctx.blk(-675, -99), true, 'the pivot circle is blocked');
  assert.equal(ctx.blk(-45, 0), true, 'the plant and the roads inside it are blocked');
  assert.equal(ctx.blk(-178, -6), true, 'the grain yard road is blocked');
  assert.equal(ctx.blk(100, 369), true, 'the highway (z = 434 - 0.653x) is blocked');
  assert.equal(ctx.blk(-240, 60), true, 'the rail spur is blocked');
  assert.equal(ctx.blk(250, -60), false, 'and open ground is open');
}
{ // the stands really are grouped: one species never turns up in two far-apart places
  const byKind = {};
  for (const s of A) (byKind[s[3]] = byKind[s[3]] || []).push(s);
  for (const k in byKind) {
    const list = byKind[k], cx = list.reduce((n, s) => n + s[0], 0) / list.length, cz = list.reduce((n, s) => n + s[1], 0) / list.length;
    const far = Math.max(...list.map(s => Math.hypot(s[0] - cx, s[1] - cz)));
    assert.ok(far < 150, k + ' is one stand, not scattered (radius ' + far.toFixed(0) + ' m)');
  }
}

// ---------------------------------------------------------------- registry and credits
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8'));
const entry = reg.assets.find(a => a.id === 'first-party-psx-tree-sprites');
assert.ok(entry && entry.creator === 'CrazyLegsMalone (project owner)' && entry.status === 'in-use', 'registered as first-party owner work, in use');
for (const k of KINDS) assert.ok(entry.files.includes('assets/textures/trees/' + k + '-atlas.png'), 'registered: ' + k);
assert.ok(fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8').includes('PSX tree sprites (10 species x 8 views)'), 'and credited');

console.log('PASS: PSX tree pack - ten species x eight views on disk and in the manifest, nearest-filtered sRGB cards with a bottom anchor and no shadow, the nearest-45 view right at every eighth turn, and all 56 trees placed by a seeded generator in ten single-species stands that never touch the corn field, the pivot circle, a road, the highway or the railroad');
