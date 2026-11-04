// Run from the test/ directory: node validate-trees.cjs
// v1.97.129: the scenery trees are back on the code-painted spruce billboard (the owner preferred them to the PSX card pack).
// What stays from v1.97.127 is the placement: seeded, so the same spots every session, and never in the corn field, in the
// pivot circle, on a road, on the highway or on the railroad. The card pack is parked in assets/textures/trees (registered,
// approved, unused), and this suite keeps it intact so bringing it back is a renderer change and nothing else.
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

// ---------------------------------------------------------------- the old trees are back
assert.ok(html.includes('const BILL_SPEC = {'), 'the billboard system is there');
assert.ok(html.includes('tree: [5.6, 9.0, 160, 256, (c, W, H) => {'), 'with the code-painted spruce (5.6 x 9.0 m) in it');
assert.ok(html.includes("for (const [x, z, sc] of TREE_SPOTS) { extraCols.push([x, z, 0.45 * sc]); billboard('tree', x, z, sc); }"),
  'every placed tree goes through billboard() - one instanced mesh for all of them');
assert.ok(html.includes('function buildBillboards() {'), 'and the billboards are still built');
for (const gone of ['TREE_SPR', 'treeSpriteSetup', 'updateTreeSprites', 'treeView(', 'TREE_SINK', 'TREE_STANDS', 'spriteTrees'])
  assert.ok(!html.includes(gone), 'the PSX card renderer is gone: ' + gone);
assert.ok(!html.includes("'/corn-souls/assets/textures/trees/'"), 'nothing loads the tree atlases any more');

// ---------------------------------------------------------------- the placement that stays
assert.ok(html.includes('const TREE_TOTAL = 56;') && html.includes('const TREE_SEED = 20261104;'), '56 trees from a fixed seed');
assert.ok(html.includes('const TREE_SPOTS = treePlacement();'), 'placed by the generator, not by Math.random');
{
  const line = p => { const m = html.match(new RegExp(p)); assert.ok(m, 'source found: ' + p); return m[0]; };
  const block = (from, to) => { const i = html.indexOf(from); assert.ok(i > 0, from); return html.slice(i, html.indexOf(to, i) + to.length); };
  const world = [
    line('const WXR = [^' + NL + ']+'), line('const NROAD = [^' + NL + ']+'), line('const SH_DX = [^' + NL + ']+'),
    line('const HWY = [^' + NL + ']+'), block('const DIRT_ROADS = [', '];'),
    line('const CFIELD = [^' + NL + ']+'), line('const inCField = [^' + NL + ']+'),
    'const O = { pivot: { cx: -675, cz: -99, R: 344 } };', line('const TREE_TOTAL = 56;'), line('const TREE_SEED = [0-9]+;'),
    fn(html, 'treeRng'), fn(html, 'treeBlocked'), fn(html, 'treePlacement')
  ].join(NL);
  const run = () => { const ctx = { Math }; vm.createContext(ctx); vm.runInContext(world + NL + 'this.out = treePlacement(); this.blk = treeBlocked;', ctx); return ctx; };
  const A = run().out, B = run().out;
  assert.equal(A.length, 56, 'all 56 trees are placed');
  assert.ok(Array.isArray(A[0]) && A[0].length === 3, 'each spot carries x, z and scale');
  assert.equal(JSON.stringify(A), JSON.stringify(B), 'and they are the same 56 spots every session');
  const ctx = run();
  for (const s of A) assert.equal(ctx.blk(s[0], s[1]), false, 'free ground at ' + s[0].toFixed(1) + ',' + s[1].toFixed(1));
  assert.equal(ctx.blk(-30, -200), true, 'the north corn field is blocked');
  assert.equal(ctx.blk(-675, -99), true, 'the pivot circle is blocked');
  assert.equal(ctx.blk(-45, 0), true, 'the plant and the roads inside it are blocked');
  assert.equal(ctx.blk(-178, -6), true, 'the grain yard road is blocked');
  assert.equal(ctx.blk(100, 369), true, 'the highway is blocked');
  assert.equal(ctx.blk(-240, 60), true, 'the rail spur is blocked');
  assert.equal(ctx.blk(250, -60), false, 'and open ground is open');
}


// ---------------------------------------------------------------- the parked pack is still intact and honestly labelled
const KINDS = ['01-broadleaf', '02-leaning-pine', '03-silver-birch', '04-weeping-willow', '05-red-maple',
  '06-dead-snag', '07-fan-palm', '08-cypress', '09-flowering-cherry', '10-acacia'];
for (const k of KINDS) {
  const f = path.join(dir, k + '-atlas.png');
  assert.ok(fs.existsSync(f), 'parked but kept: ' + k);
  const d = fs.readFileSync(f).subarray(0, 33);
  assert.ok(d.readUInt32BE(16) === 256 && d.readUInt32BE(20) === 128, k + ' is still the 4 x 2 atlas');
}
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(man.trees.length, 10, 'and the manifest still describes ten species of eight views');
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8'));
const entry = reg.assets.find(a => a.id === 'first-party-psx-tree-sprites');
assert.ok(entry, 'the pack is still registered (provenance for the releases that used it)');
assert.equal(entry.status, 'approved', 'but marked approved-and-unused, not in use');
assert.ok(/PARKED again in v1\.97\.129/.test(entry.evidence), 'with the reason written down');
assert.ok(fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8').includes('not used** since v1.97.129'), 'and credited as not used');

console.log('PASS: the trees are the old code-painted spruce again (one billboard instanced mesh, 5.6 x 9.0 m), the PSX card renderer and its atlas loading are gone, and the placement that stays is still seeded - the same 56 spots every session, clear of the corn field, the pivot circle, the roads, the highway and the railway');
