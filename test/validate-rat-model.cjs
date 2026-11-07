// Run from the test/ directory: node validate-rat-model.cjs
// Guards TEST v1.97.50 (owner: "replace rat model with this. dont forget to add all credits and attributions"): the rat critter
// wears Tyler Lazzareschi's Low Poly Rat (CC BY 4.0) - one textured mesh, head toward -z, 0.5 m long - with its own material per
// rat so the hit tint stays on the one you hit, and it is credited in CREDITS.md and registered in-use (credits.html reads that).
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8')), credits = fs.readFileSync('../CREDITS.md', 'utf8');
const b = fs.readFileSync('../assets/models/critters/rat.glb');
assert.equal(b.toString('latin1', 0, 4), 'glTF'); assert.equal(b.readUInt32LE(8), b.length, 'whole GLB');
const d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
assert.match(d.asset.extras.author, /Tyler Lazzareschi/); assert.match(d.asset.extras.license, /CC-BY-4\.0/);
assert.equal(d.meshes.length, 1); assert.equal(d.images.length, 1, 'colour map only');
const pa = d.accessors[0]; assert.ok(Math.abs(pa.max[2] - pa.min[2] - 0.5) < 1e-3 && Math.abs(pa.min[1]) < 1e-4, '0.5 m long, on the ground');
assert.ok(b.length < 200000, 'small: ' + b.length);
assert.ok(html.includes("const RAT_GLB = '/corn-souls/assets/models/critters/rat.glb';") && html.includes("loadGlbModel(RAT_GLB, ({ root }) => {"), 'the rat loads it');
assert.ok(html.includes('o.material = o.material.clone(); rec.mats.push(o.material); rec.cols.push(o.material.color.getHex());'), 'own material, in the tint list');
assert.ok(html.includes('return Object.assign(g.userData.rec || {}, { kind, g, mats,'), 'the critter record is the one the loader fills');
assert.ok(reg.assets.some(a => a.status === 'in-use' && a.creator === 'Tyler Lazzareschi' && a.license_name === 'CC BY 4.0' && a.files.includes('assets/models/critters/rat.glb')), 'registered in-use');
assert.ok(credits.includes('**Tyler Lazzareschi**') && credits.includes('`assets/models/critters/rat.glb`'), 'credited');
console.log('PASS: rat model (Tyler Lazzareschi, CC BY 4.0): one textured mesh, own tint material per rat, credited and registered');
