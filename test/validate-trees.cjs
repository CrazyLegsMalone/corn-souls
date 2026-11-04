// Run from the test/ directory: node validate-trees.cjs
// v1.97.126: the owner's PSX tree pack (Kernel Art/2D/tree_sprites_ten_8view). Ten species, eight views each at 45 degrees,
// 64 px frames with the ground anchor at (32, 62), "pick the nearest 45-degree frame to the viewing angle". The game ships
// the atlases only and draws them as 8 m square camera-facing cards. A proof of concept: eight of the 56 scenery trees use
// the pack, the rest are still the code-painted spruce.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict'), path = require('path');
const html = fs.readFileSync('game.html', 'utf8');
const dir = path.join('..', 'assets', 'textures', 'trees');

// ---------------------------------------------------------------- the pack on disk
const KINDS = ['01-broadleaf', '02-leaning-pine', '03-silver-birch', '04-weeping-willow', '05-red-maple',
  '06-dead-snag', '07-fan-palm', '08-cypress', '09-flowering-cherry', '10-acacia'];
for (const k of KINDS) {
  const f = path.join(dir, k + '-atlas.png');
  assert.ok(fs.existsSync(f), 'atlas present: ' + k);
  const d = fs.readFileSync(f).subarray(0, 33);
  assert.equal(d.toString('ascii', 1, 4), 'PNG', k + ' is a PNG');
  const w = d.readUInt32BE(16), h = d.readUInt32BE(20);
  assert.ok(w === 256 && h === 128, k + ' atlas is 4 x 2 tiles of 64 px (' + w + 'x' + h + ')');
}
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(man.frame_size_px.join('x'), '64x64', '64 px frames');
assert.equal(man.anchor_px_from_top_left.join(','), '32,62', 'ground anchor at 32, 62');
assert.equal(man.angle_convention, '0 = front; 90 = right; 180 = back; 270 = left', 'the angle convention is the pack\'s own');
assert.equal(man.trees.length, 10, 'ten species');
for (const t of man.trees) {
  assert.equal(t.frames.length, 8, t.id + ' has eight views');
  assert.equal(t.frames.map(f => f.angle_degrees).join(','), '0,45,90,135,180,225,270,315', t.id + ' is ordered front round to front-left');
  assert.equal(t.atlas, 'atlases/' + t.id + '-atlas.png', t.id + ' names its atlas');
  for (const f of t.frames) assert.equal(f.atlas_rect_px[2] + 'x' + f.atlas_rect_px[3], '64x64', t.id + ' frame rects are one tile');
}
// every atlas we ship is one the manifest describes
const shipped = fs.readdirSync(dir).filter(f => f.endsWith('-atlas.png')).map(f => f.replace('-atlas.png', '')).sort();
assert.equal(shipped.join(','), KINDS.slice().sort().join(','), 'the atlases on disk are exactly the manifest species');

// ---------------------------------------------------------------- the game side
assert.ok(html.includes("'/corn-souls/assets/textures/trees/' + kind + '-atlas.png'"), 'the game loads the atlases from the repo');
assert.ok(html.includes('t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;'), 'crisp nearest pixels, no mipmaps (PSX look, like the nibbler and paintball sets)');
assert.ok(html.includes('if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;') && html.includes('return (TREE_SPR.atlas[kind] = t);'), 'and the atlases are tagged sRGB through the guarded form');
assert.ok(html.includes("const TREE_SPRITE_COUNT = 8;"), 'a handful of trees convert (the proof of concept)');
assert.ok(html.includes("else billboard('tree', x, z, s);"), 'and every other tree still goes through the code-painted billboard');
assert.ok(html.includes('tex.repeat.set(0.25, 0.5); tex.offset.set((view % 4) * 0.25, view < 4 ? 0.5 : 0);'), 'the atlas window is one 4 x 2 tile, row 0 on top of the file');
assert.ok(html.includes('geo.translate(0, TREE_SPR.quad / 2 - TREE_SINK, 0);'), 'the card is bottom-anchored');
assert.ok(html.includes('const TREE_SINK = 0.25;'), 'and sunk by the pack anchor: 2 px of 64 on an 8 m card');
assert.ok(html.includes('m.castShadow = false; m.receiveShadow = false;'), 'a flat card never casts a shadow');

// ---------------------------------------------------------------- the 45 degree choice, run from the game's own code
const src = html.slice(html.indexOf('function treeView(a) {'), html.indexOf('function treeAtlas(kind) {'));
assert.ok(src.length > 20, 'treeView came out of the game');
const NL = String.fromCharCode(10);
const view = a => { const ctx = { Math }; vm.createContext(ctx); vm.runInContext(src + NL + 'this.v = treeView(' + a + ');', ctx); return ctx.v; };
const PI = Math.PI, D = PI / 180;
assert.equal(view(0), 0, 'a camera dead in front gives view 0');
assert.equal(view(90 * D), 2, 'to the right gives view 2');
assert.equal(view(180 * D), 4, 'behind gives view 4');
assert.equal(view(270 * D), 6, 'to the left gives view 6');
assert.equal(view(45 * D), 1, 'and the diagonals fall between them');
assert.equal(view(22 * D), 0, 'anything within 22.5 degrees of front is still front');
assert.equal(view(23 * D), 1, 'past that it is the next view');
assert.equal(view(-90 * D), 6, 'negative angles wrap the right way');
assert.equal(view(360 * D), 0, 'and a full turn is front again');

// ---------------------------------------------------------------- registry and credits
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8'));
const entry = reg.assets.find(a => a.id === 'first-party-psx-tree-sprites');
assert.ok(entry, 'the pack is registered');
assert.equal(entry.creator, 'CrazyLegsMalone (project owner)', 'as first-party owner work');
assert.equal(entry.status, 'in-use', 'and marked in use');
for (const k of KINDS) assert.ok(entry.files.includes('assets/textures/trees/' + k + '-atlas.png'), 'registered: ' + k);
assert.ok(fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8').includes('PSX tree sprites (10 species x 8 views)'), 'and credited');

console.log('PASS: PSX tree pack - 10 species x 8 views on disk and in the manifest (64 px, anchor 32,62, 45 degree order), atlases nearest-filtered and sRGB tagged in the game, one 4 x 2 window per view, bottom-anchored 8 m cards that never cast shadows, the nearest-45 choice right at every eighth turn, 8 of 56 trees converted, registered and credited');
