// Run from the test/ directory: node validate-hydrant.cjs
// v1.97.143: the owner's low-poly fire hydrant (lopoly_hydrant.glb) replaces the old code-drawn flat hydrant west of the ethanol
// load-out shack: 0.88 m tall (the old picture's height), crisp nearest-pixel colour maps, registered and credited.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const glb = fs.readFileSync(path.join(root, 'assets/models/lopoly_hydrant.glb'));
assert.equal(glb.toString('latin1', 0, 4), 'glTF'); assert.equal(glb.readUInt32LE(4), 2); assert.equal(glb.readUInt32LE(8), glb.length, 'a whole GLB (the first upload arrived as "[object Object]")');
const jl = glb.readUInt32LE(12), d = JSON.parse(glb.toString('utf8', 20, 20 + jl));
assert.equal(d.nodes.length, 18); assert.equal(d.meshes.length, 14); assert.equal(d.materials.length, 3); assert.equal(d.images.length, 3);
assert.ok(d.samplers.every(s => s.magFilter === 9728 && s.minFilter === 9728), 'the model asks for nearest-pixel sampling');
// its height as made: the top-level parts stacked up the y axis (node translations + each mesh's own extent)
let top = 0, bottom = Infinity;
for (const i of d.scenes[0].nodes.flatMap(r => d.nodes[r].children || [])) { const n = d.nodes[i]; if (n.mesh === undefined) continue;
  const y = n.matrix ? n.matrix[13] : 0, acc = d.accessors[d.meshes[n.mesh].primitives[0].attributes.POSITION]; top = Math.max(top, y + acc.max[1]); bottom = Math.min(bottom, y + acc.min[1]); }
assert.ok(Math.abs(bottom) < 1e-6 && Math.abs(top - 2.1) < 1e-3, 'stands on its base, 2.1 units tall as made');
const S = +html.match(/const HYDRANT_SCALE = ([0-9.]+);/)[1];
assert.ok(Math.abs(top * S - 0.88) < 0.02, 'drawn ' + (top * S).toFixed(2) + ' m tall, like the picture it replaces (0.86 m)');
// in the game
assert.ok(html.includes("loadGlbModel('/corn-souls/assets/models/lopoly_hydrant.glb'"), 'the game loads it');
assert.ok(html.includes('t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;') && /function hydrantModel[\s\S]{0,700}NearestFilter/.test(html), 'crisp colour maps');
assert.ok(html.includes('hydrantModel(hx, hz, -Math.PI / 2); add('), 'at the ethanol load-out shack, where the flat hydrant stood');
assert.ok(!html.includes("billboard('hydrant'") && !html.includes('hydrant: [0.52, 0.86, 48, 80'), 'the code-drawn flat hydrant is gone');
assert.ok(html.includes('extraCols.push([hx, hz, 0.25]'), 'still solid');
// registered and credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')), e = Object.values(reg).filter(Array.isArray).flat().find(x => x && x.id === 'first-party-lopoly-hydrant');
assert.ok(e && e.status === 'in-use' && e.files.includes('assets/models/lopoly_hydrant.glb'), 'registered');
assert.ok(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8').includes('Low-poly fire hydrant') && fs.readFileSync(path.join(root, 'assets/models/README.md'), 'utf8').includes('lopoly_hydrant.glb'), 'credited and listed');
console.log('PASS: the owner\'s low-poly hydrant (a whole GLB, 0.88 m, crisp pixels) stands at the ethanol load-out shack in place of the flat picture; registered and credited');
