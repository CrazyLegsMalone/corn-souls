// Run from the test/ directory: node validate-chiller.cjs
// Guards TEST v1.97.77 (owner: "In that open space where you deleted the wall goes a chiller"): a water-cooled packaged chiller in the
// room east of the ferm alley, where the wall came out in v1.97.75.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('Ethanol plant mechanics'));
const m = { exports: {} }; vm.runInNewContext(src, { module: m, Math, console }); const Sim = m.exports, s = Sim.create();
assert.ok(Sim.UNIT.chill && Sim.UNIT.chill.name === 'Chiller' && Sim.UNIT.chill.st === 'ferm', 'a fermentation unit');
assert.equal(Sim.status(s, 'chill')[0], 'good'); s.power = true; assert.equal(Sim.status(s, 'chill')[0], 'bad', 'and down in an outage');
const blk = html.slice(html.indexOf('// ---------- CHILLER (v1.97.77'), html.indexOf('// Beer leaves a fermenter through the drain'));
assert.ok(blk.length > 2000, 'the chiller block');
const c = blk.match(/const CX0 = (-?[\d.]+), CZ0 = (-?[\d.]+), L = ([\d.]+)/); assert.ok(c);
const [x, z, L] = c.slice(1).map(Number);
// the room: the alley wall line x -7.6 to the east face x 4.6, the shop's north wall z -37.1 to the Ferm MCC room z -29.8
assert.ok(x - L / 2 - 0.4 > -7.6 && x + L / 2 + 0.95 < 4.6, 'fits between the alley and the east face (starter cabinet included)');
assert.ok(z - 1.0 > -37.1 && z + 1.15 < -32.4, 'against the north wall, leaving the aisle to the east double door and the MCC door clear');
assert.ok(blk.includes("nameplate('CHILLER',"), 'labelled');
assert.ok(/extraCols\.push\(\[CX0 - 1\.5, CZ0, 1\.25\], \[CX0 \+ 1\.1, CZ0, 1\.25\], \[CX0 \+ L \/ 2 \+ 0\.65, CZ0, 0\.7\]\);/.test(blk), 'solid to walk into');
assert.ok(blk.includes("O.chill = [") && html.includes("if (O.chill) { const on = !POWER_OUTAGE.on && !sim.power; O.chill.forEach(f => { f.rate = on ? 0.6 : 0; }); O.chillLight.material.color.setHex(on ? 0x3ddc84 : 0xff4d4d); }"),
  'chilled water flows and the run light is green while there is power, red in an outage');
console.log('PASS: chiller in the opened room east of the ferm alley (fits, clear aisle, solid, labelled, chilled water lines, runs with power)');
