// Run from the test/ directory: node validate-mower-shed.cjs
// v1.97.152, owner: "remove shelf on south wall of lawn mower shed". The storage shed by the yeast cooler is the lawn mower shed
// (the zero-turn mower parks in its east half, O.shedMower): its south wall (Z1) carries the man door at the SE corner and the
// 2 ft x 4 ft window, and it used to carry the third arm of a U of shelves - four boards on four posts - across the west half.
// That arm is gone, the west wall and north side runs stay, and the south wall's door and window are untouched.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const a = html.indexOf('// ---------- STORAGE SHED'), b = html.indexOf('// ---------- GRAIN PROBE');
assert.ok(a > 0 && b > a, 'the storage shed block is in the plant build');
const shed = html.slice(a, b);
const runs = shed.match(/^    shelfRun\([^;]*;/gm) || [];
assert.equal(runs.length, 2, 'two shelf runs are left, not three');
assert.ok(runs.some(r => r.includes('shelfRun(X0 + 0.1, X0 + 0.7, Z0 + 0.1, Z1 - 0.1);')), 'the west wall run is still there (it runs the depth of the shed along the west wall)');
assert.ok(runs.some(r => r.includes('shelfRun(X0 + 0.7, half - 0.2, Z0 + 0.1, Z0 + 0.6);')), 'and the north side run');
assert.ok(!shed.includes('Z1 - 0.6') && !shed.includes('shelfRun(X0 + 0.7, half - 0.2, Z1'), 'nothing hangs on the south wall any more');
assert.ok(!/U-shaped/i.test(shed) && !/both side walls/i.test(shed), 'and no comment still claims a U (or a run on both side walls)');
// the south wall itself is untouched: the man door at the SE corner, its step, and the window west of it
assert.ok(shed.includes('const DX = X1 - 0.75, DW = 0.92, DH = 2.0, WX = DX - 2.2;'), 'the man door and window are still in the south wall');
assert.ok(shed.includes('box(0.61, 1.22, 0.04, mat(0xf2f3f4), WX, 1.07 + 0.61, Z1 + 0.06); box(0.5, 1.1, 0.045, mat(0x8fb0c4), WX, 1.07 + 0.61, Z1 + 0.07);'), 'the 2 ft x 4 ft window is still on it');
assert.ok(shed.includes('(O.swingDoors = O.swingDoors || []).push({ g, rot: 0, dir: 1, x: DX, z: Z1, open: 0 });'), 'and the man door still opens');
// still the mower shed: the zero-turn is parked in the east half, and its roll-up is the plant's one door design
assert.ok(shed.includes('const mw = new T.Group(); mw.position.set(X1 - 1.6, FL, cz); mw.rotation.y = Math.PI;'), 'the mower is still parked in the east half');
assert.ok(shed.includes('O.shedMower = { g: mw, X0, X1, Z0, Z1, door: shedDoor };'), 'and still registered as the shed mower');
assert.ok(shed.includes('const shedDoor = rollUpDoor(X1, cz, false, RD, RH,'), 'its east roll-up is untouched');
console.log('PASS: the lawn mower shed keeps its west wall and north side shelves and its mower, the south wall shelf is gone, and the man door and window on that wall are untouched');
