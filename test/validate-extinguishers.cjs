// Run from the test/ directory: node validate-extinguishers.cjs
// Guards TEST v1.97.55 (owner: "Are all the fire extinguishers functional?" ... "Both"): every fire extinguisher in the plant is
// the real 3D one and you can take a full can from any of them - the two posts and every wall mount (extWall registers itself as
// a station, so takeExtinguisher() finds it), and the four that were plain red cylinders are wall mounts now.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const fn = html.slice(html.indexOf('function extWall('), html.indexOf('function extStation('));
assert.ok(/EXT\.stations\.push\(m\);/.test(fn), 'a wall mount is a station');
assert.ok(/extModelInto\(m, 0\.62, false\)/.test(fn), 'drawn with the real model');
const calls = (html.match(/[^a-zA-Z]extWall\(/g) || []).length - 1 + (html.slice(html.indexOf('ext = (x, z) => extWall('), html.indexOf('ext = (x, z) => extWall(') + 4000).match(/[^a-zA-Z.]ext\(/g) || []).length;
assert.ok(calls >= 11, 'eleven wall mounts (' + calls + ')');
assert.equal((html.match(/extStation\(/g) || []).length - 1, 2, 'and the two posts');
assert.ok(!/(cyl|CylinderGeometry)\([^;]{0,60}mat\(0xc8211c\)[^;]{0,80};\s*(\/\/[^\n]*)?extinguisher/i.test(html), 'no red cylinder stands in for an extinguisher any more');
const take = html.slice(html.indexOf('function takeExtinguisher('), html.indexOf('function updateExtinguisher('));
assert.ok(/for \(const m of EXT\.stations\)/.test(take) && /EXT\.charge = 1/.test(take), 'any station gives a full can');
console.log('PASS: every extinguisher is usable (2 posts + the wall mounts, ' + calls + ' extWall calls in the code, all the real model)');
