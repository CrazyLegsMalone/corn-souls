// Run from the test/ directory: node validate-office-chair.cjs
// Guards TEST v1.97.70: emnix's "PSX Office Chair" (CC BY 4.0) as every office chair: the energy center control room's operator chairs
// and the seated board operator's. Turned back-to-+z like the box chairs, seat top at 0.47 (what seated workers are fitted to).
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const b = fs.readFileSync(path.join(root, 'assets/models/psx_office_chair.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
assert.equal(b.readUInt32LE(0), 0x46546C67); assert.ok(b.length < 200000, 'small');
assert.match(d.asset.extras.author, /emnix/); assert.match(d.asset.extras.license, /CC-BY-4\.0/); assert.equal(d.asset.extras.title, 'PSX Office Chair');
assert.ok(/“PSX Office Chair”\*\* — by \*\*emnix\*\*/.test(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8')), 'credited');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets.find(a => a.id === 'sketchfab-emnix-psx-office-chair');
assert.ok(reg && reg.status === 'in-use' && reg.license_name === 'CC BY 4.0' && reg.files.includes('assets/models/psx_office_chair.glb'), 'registered');
assert.ok(/const CHAIR = \{ url: '\/corn-souls\/assets\/models\/psx_office_chair\.glb', seat: 0\.66, top: 0\.47,/.test(html), 'seat 0.66 in the model, 0.47 in the game');
const top = +html.match(/const SKIN_POSE = \{[^}]*seatTop: ([0-9.]+)/)[1]; assert.equal(top, 0.47, 'the height seated workers are fitted to');
assert.ok(/p\.rotation\.y = -Math\.PI \/ 2; p\.scale\.setScalar\(CHAIR\.top \/ CHAIR\.seat\);/.test(html), 'its back (+x as made) turned to +z, scaled to the seat height');
assert.ok(/const put = proto => \{ const m = proto\.clone\(\); m\.userData\.chairModel = true; for \(const c of g\.children\) if \(c\.isMesh\) c\.visible = false; g\.add\(m\); \};/.test(html), 'cloned into each chair, the box chair hidden');
assert.ok(html.includes('ring.position.y = 0.3; g.add(ring); chairModel(g); };'), 'the control room operator chairs');
assert.ok(html.includes('extraCols.push([x, z, 0.4]); chairModel(g); return g;'), 'the seated worker\'s chair');
assert.equal((html.match(/const seated = npc\.g\.children\.filter\(c => c\.isGroup && !c\.userData\.chairModel\);/g) || []).length, 2, 'a seated worker\'s model never hides the chair');
console.log('PASS: PSX office chair (emnix, CC BY 4.0) as every office chair, seat at 0.47');
