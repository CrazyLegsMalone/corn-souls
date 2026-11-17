// Run from the test/ directory: node validate-distillation.cjs
// Guards TEST v1.97.90 (owner: "let's do distillation", with the plant's Beer Stripper, Rectifier, Mole Sieve A and Mole Sieve B screens):
// the beer column under vacuum, rectifier, side stripper, 190 proof condenser + reflux, 8 sieve bottles cycling, regen and 200 proof,
// connected as on the screens, generic names only and no new controls.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('Ethanol plant mechanics'));
const m = { exports: {} }; vm.runInNewContext(src, { module: m, Math, console }); const Sim = m.exports;
const ids = ['bbp', 'ss', 'ssp', 'rect', 'rbp', 'fusel', 'cond190', 'reflux', 'vac', 'rfp', 'sfp', 'vapz', 'ms1', 'ms2', 'ms3', 'ms4', 'ms5', 'ms6', 'ms7', 'ms8', 'regen', 'rgp', 'fv200', 'pp200'];
for (const id of ids) {
  const u = Sim.UNIT[id]; assert.ok(u && u.st === 'dist', id + ' is a distillation unit');
  assert.ok(!u.lvl && !u.temp && !u.rate, id + ' has no controls yet');
  assert.ok(!/\d{4}/.test(u.name), id + ' has a generic name (no tag numbers)');
  assert.ok(html.includes("case '" + id + "'"), id + ' has a panel');
}
assert.deepEqual([Sim.UNIT.col.temp.def, Sim.UNIT.col.temp.good.join()], [180, '176,185'], 'beer column runs under vacuum, ~180 F bottom');
const s = Sim.create(); for (let i = 0; i < 24 * 30; i++) Sim.step(s, 1 / 30);
const D = s.dist; assert.ok(D.on, 'distillation running');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, msg + ' (' + a.toFixed(2) + ' vs ' + b + ')');
const g = D.p200Gpm; assert.ok(g > 150, '200 proof GPM');
near(D.drawGpm / g, 233 / 221, 0.02, '190 draw vs 200 product as on the screens'); near(D.refluxGpm / D.drawGpm, 1.55, 0.02, 'reflux ratio');
near(D.regenGpm / g, 41 / 221, 0.01, 'regen back to the rectifier'); near(D.feedGpm / g, 1.3, 0.01, '190 proof feed to the sieves');
near(D.rbGpm / g, 0.905, 0.01, 'rectifier bottoms to the side stripper'); near(s.col.T, 180, 1, 'beer column bottom');
assert.equal(D.bottles.length, 8);
assert.deepEqual(D.bottles.filter(b => b.unit === 'A').map(b => b.n).join(), '1,2,3,7'); assert.deepEqual(D.bottles.filter(b => b.unit === 'B').map(b => b.n).join(), '4,5,6,8');
const seen = {}; for (let i = 0; i < 120; i++) { Sim.step(s, 1 / 60); for (const u of ['A', 'B']) assert.equal(D.bottles.filter(b => b.unit === u && b.st === 'ON').length, 2, 'two bottles of each unit on line'); D.bottles.forEach(b => { seen[b.st] = 1; }); }
assert.deepEqual(Object.keys(seen).sort().join(), 'DEPRESS,ON,REGEN,REPRESS', 'the bottles cycle ON / DEPRESS / REGEN / REPRESS');
// side stripper bottoms go to the cook water tank, or the whole stillage tank while it's high
s.cwt.L = 30; Sim.step(s, 0.01); assert.equal(D.ssTo, 'cwt'); s.cwt.L = 80; Sim.step(s, 0.01); assert.equal(D.ssTo, 'wst');
s.power = true; Sim.step(s, 0.1); assert.ok(!s.dist.on && s.dist.p200Gpm === 0, 'stops in an outage'); assert.equal(Sim.status(s, 'ms1')[0], 'bad');
// 3D: everything built and piped as on the screens
const blk = html.slice(html.indexOf('// ---------- DISTILLATION (v1.97.90), connected'), html.indexOf('// ---------- EVAPORATORS 1-8'));
assert.ok(blk.length > 5000, 'the distillation block');
for (const want of ["column(BCX, BCZ, 2.0, 24, 'col'", "column(RCX, RCZ, 1.7, 28, 'rect'", "column(SSX, SSZ, 1.0, 16, 'ss'", "'cond190'", "'reflux', true", "'regen', true", "'fv200'", "'vapz'",
  'O.dist.ev2', 'O.dist.bcVap', 'O.dist.ssVap', 'O.dist.rb', 'O.dist.ssb', 'O.dist.still', 'O.dist.ovhd', 'O.dist.cnd', 'O.dist.reflux', 'O.dist.draw', 'O.dist.fusel', 'O.dist.sfeed', 'O.dist.hdr', 'O.dist.p200v', 'O.dist.rgv', 'O.dist.rgr'])
  assert.ok(blk.includes(want), 'built: ' + want);
for (const id of ids) assert.ok(blk.includes("'" + id + "'") || id.startsWith('ms'), id + ' is clickable in 3D');
assert.ok(!/\b\d{4}\b/.test((blk.match(/nameplate\('[^']*'/g) || []).join()), 'no tag numbers on the nameplates');
assert.ok(html.includes("[-48, 2.0, DZ0 + 1.5], [-48, 2.0, 49.2]]"), 'flash vapor from cook goes into the side stripper bottom');
assert.ok(html.includes("[-34.5, 18, 52.6]];   // v1.97.90"), 'the beer feed goes into the beer column');
assert.ok(html.includes('const p200 = [[-70.2, 1.2, 58.15]') && html.includes('[-73.4, 7, 57.3]];   // v1.97.90'), '200 proof from the product pump, 190 proof to the sieve feed pump');
console.log('PASS: distillation connected as on the plant screens (beer column, rectifier, side stripper, condenser + reflux, 8 sieve bottles cycling, regen, 200 proof), generic names, no controls');
