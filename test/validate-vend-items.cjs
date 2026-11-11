// Run from the test/ directory: node validate-vend-items.cjs
// Guards TEST v1.97.78: the owner sent product art for Milorade, WET water and Chippys corn chips as GLBs that were only a box with
// the picture card wrapped round it; scripts/make_vend_items.py builds real items from the pictures. Owner: "Replace the shifty corn
// chips". Milorade replaces the Milo-Rade can, WET the water can. Runs the game's own GLB reader on the real files.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE, T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i); return html.slice(i, j); };
const ctx = { T, console, TextDecoder, Blob: class {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } };
vm.createContext(ctx); vm.runInContext(cut('const GLB_CT = {', 'function loadGlbModel(') + '\nthis.glbBuild = glbBuild;', ctx);
const root = path.join(__dirname, '..');
const SIZE = { milorade_bottle: [0.2, 0.06, 0.11], wet_water_bottle: [0.22, 0.06, 0.11], chippys_bag: [0.21, 0.15, 0.19] };   // height, min / max width
for (const [f, [h, w0, w1]] of Object.entries(SIZE)) {
  const b = fs.readFileSync(path.join(root, 'assets/models', f + '.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.equal(b.readUInt32LE(8), b.length, f + ': whole GLB');
  const pr = d.meshes[0].primitives[0];
  assert.ok(pr.attributes.NORMAL !== undefined && pr.attributes.TEXCOORD_0 !== undefined && d.images.length === 1, f + ': normals (so it is not drawn black), UVs and its picture');
  assert.match(d.asset.extras.made_by, /make_vend_items\.py/);
  const r = ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); r.root.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(r.root), s = bb.getSize(new T.Vector3());
  assert.ok(Math.abs(s.y - h) < 0.005, f + ' ' + s.y.toFixed(3) + ' m tall');
  assert.ok(s.x > w0 && s.x < w1, f + ' ' + s.x.toFixed(3) + ' m wide');
  assert.ok(Math.abs(bb.min.y) < 1e-4, f + ': stands on its base');
  assert.ok(Math.abs(bb.min.x + bb.max.x) < 0.01 && Math.abs(bb.min.z + bb.max.z) < 0.01, f + ': centred');
  const n = r.root.children[0].children.find(o => o.isMesh) || (() => { let m; r.root.traverse(o => { if (o.isMesh) m = o; }); return m; })();
  const N = n.geometry.attributes.normal; let bad = 0; for (let i = 0; i < N.count; i++) if (Math.abs(Math.hypot(N.getX(i), N.getY(i), N.getZ(i)) - 1) > 0.01) bad++;
  assert.equal(bad, 0, f + ': unit normals');
  assert.ok(fs.existsSync(path.join(root, 'assets/models/source/vend_cards', f.replace(/_(bottle|bag)$/, '') + '_card.png')), f + ': source picture kept');
}
assert.ok(fs.existsSync(path.join(root, 'scripts/make_vend_items.py')), 'the build script is kept');
// the game uses them
assert.ok(html.includes("{ key: 'CORN_CHIPS', file: 'chippys_bag.glb', name: 'Chippys: Extra Corn!' },"), 'Chippys replaces the Shifty corn chips');
assert.ok(!/file: 'shifty_corn_chips\.glb'|'milo_rade_can\.glb'|'water_can\.glb'/.test(html), 'the old chips, can and water can are not dispensed any more');
assert.equal((html.match(/file: 'milorade_bottle\.glb', name: 'Milorade'/g) || []).length, 4, 'both Milo-Rade buttons and WATER, in both machine paths');
assert.equal((html.match(/vendSpawn\('wet_water_bottle\.glb', 'WET Water',/g) || []).length, 2, 'the WET bottle at each machine');
// credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets;
for (const f of Object.keys(SIZE)) assert.ok(reg.some(a => a.status === 'in-use' && a.files.includes('assets/models/' + f + '.glb')), f + ' registered');
assert.ok(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8').includes('`wet_water_bottle.glb`, `chippys_bag.glb`'), 'credited');
console.log('PASS: vending items from the owner\'s art (Milorade + WET bottles lathed from the pictures, the Chippys bag; normals, size, base, credits; Chippys replaces the corn chips, Milorade the can, WET the water can)');
