// Run from the test/ directory: node validate-fridge.cjs
// Guards TEST v1.97.69: emnix's "PSX Fridge" (CC BY 4.0) in the process building break room, in place of the plain steel box.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const b = fs.readFileSync(path.join(root, 'assets/models/psx_fridge.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
assert.equal(b.readUInt32LE(0), 0x46546C67, 'a GLB'); assert.ok(b.length < 60000, 'small');
assert.match(d.asset.extras.author, /emnix/); assert.match(d.asset.extras.license, /CC-BY-4\.0/); assert.equal(d.asset.extras.title, 'PSX Fridge');
assert.ok(d.meshes.length === 1 && d.images.length === 1, 'one textured mesh');
assert.ok(/“PSX Fridge”\*\* — by \*\*emnix\*\*/.test(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8')), 'credited');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets.find(a => a.id === 'sketchfab-emnix-psx-fridge');
assert.ok(reg && reg.status === 'in-use' && reg.license_name === 'CC BY 4.0' && reg.files.includes('assets/models/psx_fridge.glb'), 'registered');
assert.ok(html.includes("const FRIDGE_URL = '/corn-souls/assets/models/psx_fridge.glb';") && html.includes('function fridgeModel(x, z, y, depth, yaw, stand) {'), 'the loader');
assert.ok(html.includes('fridgeModel(-62.48, OZN + 0.52, SLAB_TOP + 0.05, 0.78, 0, stand);'), 'in the break room, where the box stood, on the office floor, door into the room');
assert.ok(/const bb = new T\.Box3\(\)\.setFromObject\(root\), sz = bb\.getSize\(V3\(\)\), k = depth \/ \(sz\.z \|\| 1\);/.test(html), 'scaled evenly to the old depth');
assert.ok(html.includes('box(0.92, 1.78, 0.78, matU(0xb9bec3), -62.48, 0.89, OZN + 0.52)'), 'the stand-in box has its own material (the static merge would otherwise fold it in for good)');
assert.ok(/for \(const o of stand \|\| \[\]\) if \(o\) \{ o\.visible = false; o\.removeFromParent\(\); \}/.test(html), 'and goes when the model arrives');
assert.ok(html.includes("wallSegs.push([-62.95, OZN + 0.92, -62.0, OZN + 0.92], [-62.95, OZN + 0.1, -62.95, OZN + 0.92], [-62.0, OZN + 0.1, -62.0, OZN + 0.92]);"), 'still solid');
console.log('PASS: PSX fridge (emnix, CC BY 4.0) in the break room');
