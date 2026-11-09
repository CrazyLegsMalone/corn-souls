// Run from the test/ directory: node validate-lot-cars.cjs
// Guards TEST v1.97.56 (owner: "Can you make the green and the white vehicle drivable" - "All three" white ones - then "Put each key
// in a different place"): the green Jeep, white Renegade, white Crown Vic and white '90 Ranger are drivable cars (after the Pink
// Sedan, so its index stays 2), each with its own keychain hanging in its own spot, and a key is taken where it really hangs.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const lot = html.slice(html.indexOf('const LOT_CARS = ['), html.indexOf('const LOT_CARS = [') + 400);
for (const [fn, name, key] of [['jeep(0x2c4a30', 'green Jeep', 'dice'], ['renegade(0xf2f3f1', 'white Renegade', 'heart'], ['crownVic(0xf1f2ef', 'white Crown Vic', 'badge'], ['ranger90(0xf2f2ee', 'white Ranger pickup', 'horseshoe']]) {
  assert.ok(lot.includes('[' + fn) && lot.includes("'" + name + "', '" + key + "'"), name + ' is a drivable lot car with the ' + key + ' key');
  assert.ok(new RegExp("KEYNAME = \\{[^}]*" + key + ": '").test(html) && new RegExp("KEYCAR = \\{[^}]*" + key + ": '" + name + "'").test(html), name + ' key named');
  assert.ok(html.includes("if (kind === '" + key + "')"), name + ' keychain charm');
}
const iPink = html.indexOf("mkCar(g, 'Pink Sedan', 'flower')"), iLot = html.indexOf('for (const [g, name, key] of LOT_CARS) O.cars.push(mkCar(g, name, key));');
assert.ok(iPink > 0 && iLot > iPink, 'added after the Pink Sedan');
assert.ok(/return g;\n    \};/.test(html.slice(html.indexOf('const jeep = ('), html.indexOf('const equinox = ('))) && /w\.userData\.wheel = true/.test(html.slice(html.indexOf('const jeep = ('), html.indexOf('const equinox = ('))), 'the Jeep returns itself with steerable wheels');
const spots = { dice: "keyHook('dice', -63.0, OZN + 0.13, 0)", badge: "keyHook('badge', -38.5, OZN + 0.13, 0)", heart: "keyHook('heart', 78.5, ZS - 0.13, Math.PI)", horseshoe: "keyHook('horseshoe', x0 + 4.05, z + 0.19, 0)" };
for (const k in spots) assert.ok(html.includes(spots[k]), k + ' key in its own place');
assert.ok(html.includes('Math.hypot(walk.x - h.g.position.x, walk.z - h.g.position.z)'), 'taken where it hangs (the scale house is shifted after it is built)');
console.log('PASS: four more drivable lot cars (green Jeep, white Renegade, Crown Vic, Ranger pickup), keys in the break room, control room, scale house and shop');
