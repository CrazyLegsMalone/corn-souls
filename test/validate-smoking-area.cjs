// Run from the test/ directory: node validate-smoking-area.cjs
// v1.97.183: the owner's low-poly smoking-area shelter (smoking_area_lopoly.glb) sits on the grass east of the employee
// parking lot's east curb (x 145, z -80) so it is by the parking lot and away from the plant (west of the east road, x 72).
// Decorative: the reader marks it noHit and it casts/receives shadows; no collision, no interaction.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const glb = fs.readFileSync(path.join(root, 'assets/models/smoking_area_lopoly.glb'));
assert.equal(glb.toString('latin1', 0, 4), 'glTF'); assert.equal(glb.readUInt32LE(4), 2); assert.equal(glb.readUInt32LE(8), glb.length, 'a whole GLB');
const jl = glb.readUInt32LE(12), d = JSON.parse(glb.toString('utf8', 20, 20 + jl));
assert.equal(d.nodes.length, 17); assert.equal(d.meshes.length, 10); assert.equal(d.materials.length, 8);
assert.equal(d.skins, undefined); assert.equal(d.images, undefined); assert.equal((d.animations || []).length, 0, 'rigid, flat colours, no clip');
{ let tris = 0; for (const m of d.meshes) for (const pr of m.primitives) { const i = pr.indices; tris += (i === undefined ? d.accessors[pr.attributes.POSITION].count : d.accessors[i].count) / 3; }
  assert.equal(tris, 174, '174 triangles'); }
{ const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const a of d.accessors) if (a.type === 'VEC3' && a.min) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.min[k]); mx[k] = Math.max(mx[k], a.max[k]); }
  assert.ok(Math.abs((mx[0] - mn[0]) - 8) < 0.01 && Math.abs((mx[2] - mn[2]) - 6) < 0.01 && Math.abs((mx[1] - mn[1]) - 3) < 0.01, 'an 8 x 3 x 6 m shelter'); }
// in the game
assert.ok(html.includes("loadGlbModel('/corn-souls/assets/models/smoking_area_lopoly.glb'"), 'the game loads it');
assert.ok(html.includes('g.position.set(145, 0.1, -80)'), 'placed on the grass east of the lot (x 145, z -80)');
assert.ok(html.includes('function loadSmokingArea()') && html.includes('loadSmokingArea();'), 'defined and called at init');
// east of the lot's east curb (140), away from the plant west of the east road (72)
assert.ok(html.includes('const X0 = 54 + SH_DX, X1 = 114 + SH_DX'), 'the employee parking lot is still there');
// registered and credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8'));
const e = reg.assets.find(x => x.id === 'first-party-smoking-area-lowpoly');
assert.ok(e && e.status === 'in-use' && e.files.includes('assets/models/smoking_area_lopoly.glb'), 'registered');
assert.ok(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8').includes('Smoking area shelter (low poly)') && fs.readFileSync(path.join(root, 'assets/models/README.md'), 'utf8').includes('smoking_area_lopoly.glb'), 'credited and listed');
console.log('PASS: the owner\'s smoking-area shelter (a whole GLB, 174 tris, 8 x 6 m) sits on the grass by the employee parking lot, away from the plant; registered and credited');
