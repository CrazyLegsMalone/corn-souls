// Run from the test/ directory: node validate-pivot.cjs
// v1.97.97: the center pivot's tower tires roll round the circle (axles along the arm), and the towers are solid -
// three round footprints per tower that turn with the arm, plus the center tower.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
assert.ok(html.includes("const w = P(new T.CylinderGeometry(0.75, 0.75, 0.45, 10).rotateZ(Math.PI / 2), tire, x1, 0.75, k * 1.7); O.pivot.wheels.push({ m: w, r: x1 });"),
  'tower tires: axle along the arm (rotateZ), fore and aft on the gearbox beam');
assert.ok(!html.includes('CylinderGeometry(0.75, 0.75, 0.45, 10).rotateX(Math.PI / 2), tire'), 'the sideways-rolling tires are gone');
assert.ok(html.includes('for (const w of P.wheels) w.m.rotation.x += da * w.r / 0.75;'), 'and they roll at the speed their tower travels');
assert.ok(html.includes('extraCols.push(c); O.pivot.cols.push(c);') && html.includes('{ const c = [cx, cz, 1.7]; extraCols.push(c); }'), 'every tower and the center tower are colliders');
const pc = html.slice(html.indexOf('function pivotCols() {'), html.indexOf('function updatePivot(dt) {'));
const ctx = { Math, O: { pivot: null } }; vm.createContext(ctx); vm.runInContext(pc + '\nthis.pivotCols = pivotCols;', ctx);
const cols = [[0, 0, 0.7], [0, 0, 0.85]]; cols[0].lx = 100; cols[0].lz = 0; cols[1].lx = 100; cols[1].lz = 1.7;
ctx.O.pivot = { cx: -675, cz: -99, g: { rotation: { y: 0 } }, cols };
ctx.pivotCols(); assert.deepEqual([cols[0][0], cols[0][1]], [-575, -99], 'arm at rest: the tower is 100 m out along +x');
ctx.O.pivot.g.rotation.y = -Math.PI / 2; ctx.pivotCols();
assert.ok(Math.abs(cols[0][0] + 675) < 1e-9 && Math.abs(cols[0][1] - 1) < 1e-9, 'a quarter turn later the footprint has moved round with it');
assert.ok(Math.abs(cols[1][0] - (-675 - 1.7)) < 1e-9, 'fore/aft footprints stay on the beam line');
assert.ok(html.includes('  pivotCols();\n') && html.includes('    pivotCols();'), 'updated every frame the arm turns, and once when it is built');
console.log('validate-pivot: OK');
