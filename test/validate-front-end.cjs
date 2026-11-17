// Run from the test/ directory: node validate-front-end.cjs
// Guards the real-rate front end (TEST v1.97.87): corn -> grinding bins -> hammermills (feeder speed %, lb/min, amps, bearings,
// FWD / REV) -> slurry blender (grind / water ratio, backset %, alpha-amylase; density and mixed temperature) -> slurry tanks at
// ~186 F with their steam valves; the 807,000 gal fermenters still fill in ~9 h at ~4,350 lb/min. Runs the real plant model.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('Ethanol plant mechanics'));
const load = () => { const m = { exports: {} }; vm.runInNewContext(src, { module: m, Math, console }); return m.exports; };
const Sim = load();
const run = (s, h, each) => { for (let t = 0; t < h; t += 0.05) { Sim.step(s, 0.05 / s.speed); if (each) each(s); } };
const near = (v, want, tol, what) => assert.ok(Math.abs(v - want) <= tol, what + ': ' + v.toFixed(2) + ' (want ' + want + ' ± ' + tol + ')');

// ---- generic names only (owner: no real tag numbers)
for (const u of Sim.UNITS) assert.ok(!/\b[A-Z]{1,4}-?\d{3,4}[A-Z]?\b/.test(u.name + ' ' + u.holds), 'no plant tag in ' + u.name);
for (let i = 0; i < 4; i++) { assert.equal(Sim.UNIT['day' + i].name, 'Grinding Bin ' + (i + 1)); assert.equal(Sim.UNIT['mill' + i].rate.unit, '%'); }

// ---- a normal day at the default setpoints
const s = Sim.create(); const fills = []; let prev = s.ferm.map(f => f.state);
run(s, 24 * 5, x => x.ferm.forEach((f, i) => { if (prev[i] !== 'filling' && f.state === 'filling') f._st = x.t; if (prev[i] === 'filling' && f.state !== 'filling' && f._st) fills.push(x.t - f._st); prev[i] = f.state; }));
const B = s.blend;
near(B.lbm, 4350, 60, 'ground corn lb/min');
near(Sim.LBM(s.blend.flow) / 4, 1086, 20, 'each mill lb/min at 71%');
near(B.gpm, 1250, 40, 'slurry GPM out of the blender');
near(B.dens, 9.6, 0.15, 'slurry density lb/gal');
near(B.bsGpm / B.water, 0.55, 0.01, 'backset share of the water');
near(B.lbm / B.water, 4.8, 0.01, 'grind / water ratio');
near(Sim.GPM(s.cook.out), 1260, 60, 'slurry to the hydroheater, GPM');
assert.ok(fills.length >= 8, 'fermenters keep filling (' + fills.length + ')');
for (const h of fills) near(h, 9, 0.3, 'fermenter fill time, h');
near(Sim.GAL_BU * 0.85 * Sim.CAP.ferm, 686000, 1000, 'an 85% batch is ~686,000 gal (807,000 gal fermenter)');
near(s.st1.T, 186, 1, 'Slurry Tank 1 temperature'); near(s.st2.T, 187, 1, 'Slurry Tank 2 temperature');
assert.ok(s.st1.steam > 30 && s.st1.steam < 90, 'Slurry Tank 1 steam valve open part way (' + s.st1.steam.toFixed(0) + '%)');
assert.ok(B.mixT > 150 && B.mixT < 180, 'flour + backset + hot cook water mix to ~168 F before steam (' + B.mixT.toFixed(0) + ')');
for (const m of s.mills) { near(m.amps, 346, 10, 'mill amps'); assert.ok(m.bearT > 95 && m.bearT < 112, 'bearings warm under load'); assert.ok(m.dir === 'FWD' || m.dir === 'REV'); }
assert.equal(s.alerts.length, 0, 'no alarms at the defaults');
let eth = 0; run(s, 48, x => { eth += x.out.eth; });
near(eth / (48 / 0.05) / s.blend.flow, 2.75, 0.2, 'about 2.75 gal of ethanol per bushel');
near(eth / (48 / 0.05) * 8760 / 1e6, 112, 6, 'about 112 million gallons a year');

// ---- a mill stopped and restarted: amps drop, the rotation alternates, the rest keep grinding
{ const x = Sim.create(); const d0 = x.mills[0].dir; x.sp.mill0.rate = 0; run(x, 1);
  assert.equal(x.mills[0].amps, 0, 'stopped mill draws nothing'); assert.equal(x.mills[0].lbm, 0);
  near(x.blend.lbm, 3 * 1086, 40, 'three mills grind three quarters');
  x.sp.mill0.rate = 71; run(x, 0.2); assert.notEqual(x.mills[0].dir, d0, 'restarted mill runs the other way'); }

// ---- the blender runs at the real plant's mix (no controls for it yet - owner)
assert.ok(!Sim.UNIT.blend.ctls && !Sim.UNIT.blend.rate && !Sim.UNIT.blend.lvl, 'no blender controls yet');
assert.equal(s.blend.q, 1, 'the real mix is a good mix'); assert.equal(Sim.status(s, 'blend')[0], 'good');

// ---- a grinding bin running low raises its alarm
{ const x = Sim.create(); x.sp.day1.lvl = 0; x.day[1].L = 12; x.day[1].filling = false; run(x, 0.5);
  assert.ok(x.alerts.some(a => a.unit === 'day1' && /low level/.test(a.msg)), 'low level alarm on Grinding Bin 2'); }

// ---- the panels read in the plant's units
for (const want of ["['Feed', lbm(m.rate)]", "['Motor', m.on ? Math.round(m.amps) + ' A · ' + m.dir : 'Stopped']", "['Slurry density', B.dens ? B.dens.toFixed(2) + ' lb/gal' : '—']",
  "['Backset in', n0(B.bsGpm) + ' GPM']", "['Steam valve', s.st1.steam.toFixed(0) + '%']", "label: 'Corn ground', color: '#f4c430', f: o => n0(Sim.LBM(o.corn)) + ' lb/min'"])
  assert.ok(html.includes(want), 'panel shows ' + want);
assert.ok(!/'bu\/h'\]|\+ ' bu\/h'\], \['Pumped|Slurry flow', n0/.test(html), 'slurry and mash flows read in GPM, not bu/h');

// ---- v1.97.88: connected as on the plant's screens - the water side of the slurry and Tin Bins 3 & 4
{ const x = Sim.create(); let minC = 100, maxC = 0, minT = 100, short = 0;
  run(x, 24 * 6, y => { minC = Math.min(minC, y.cwt.L); maxC = Math.max(maxC, y.cwt.L); minT = Math.min(minT, y.tst.L); if (y.waterShort) short++; });
  assert.ok(minC > 10 && maxC < 95 && minT > 10, 'cook water and thin stillage tanks hold their own over 6 days (cook water ' + minC.toFixed(0) + '-' + maxC.toFixed(0) + '%, thin stillage min ' + minT.toFixed(0) + '%)');
  assert.equal(short, 0, 'the blender never runs short of water at the normal rate');
  near(x.blend.bsGpm + x.blend.cwGpm, x.blend.water, 0.5, 'backset + cook water = the water the blender needs');
  near(x.cwh.T, 202, 2, 'cook water heater outlet');
  assert.ok(x.tst.in > 300 && x.mft.in >= 0, 'thin stillage comes from the beer column side');
  for (const id of ['tst', 'tsp', 'mft', 'mfp', 'cwt', 'cwp', 'cwh', 'scalper']) assert.ok(Sim.UNIT[id] && !Sim.UNIT[id].lvl && !Sim.UNIT[id].rate && !Sim.UNIT[id].temp, id + ' is a unit with no controls');
  // the Cook Water Tank runs dry: backset makes up the water first, then the mills slow down and say why
  x.sp.beer.lvl = 100; run(x, 0.5); x.cwt.L = 0; x.mft.L = 0; x.tst.L = 0; run(x, 0.2);   // beer well held full: no column feed, so no thin stillage
  assert.ok(x.waterShort, 'no water: short'); assert.equal(x.mills[0].limit, 'nowater'); assert.ok(Sim.LBM(x.blend.flow) < 4000, 'the mills slow down');
  assert.equal(Sim.status(x, 'blend')[0], 'bad'); assert.equal(Sim.status(x, 'cwt')[0], 'bad'); }
{ const x = Sim.create(); run(x, 24 * 6);
  near(x.tb[0].L, 80, 2, 'Tin Bin 3 filled with the spare receiving'); near(x.tb[1].L, 80, 2, 'Tin Bin 4 too');
  x.sp.recv.rate = 0; x.sp.rail.rate = 0; let rec = 0; run(x, 24 * 2, y => { if (y.reclaim) rec++; });
  assert.ok(rec > 0 && x.tb[0].L < 80, 'no trucks: Tin Bins 3 & 4 refill Tin Bins 1 & 2');
  assert.ok(x.silo[0].L > 20, 'so Tin Bins 1 & 2 do not run dry (' + x.silo[0].L.toFixed(0) + '%)'); }
for (const want of ["O.fTbFill = [", "O.fReclaim = [", "O.fCookW = line(", "O.fBackset = line(", "O.fMeth = line(", "['THIN STILLAGE TANK', 0xb9a27a, 'tst', 'tsp']", "nameplate('COOK WATER HEATER'"])
  assert.ok(html.includes(want), 'built and connected in 3D: ' + want);
assert.ok(html.includes("nameplate('SCALPER'"), 'the scalper is labelled');
assert.ok(!/nameplate\('[A-Z]{1,4}-\d/.test(html) && html.includes("const [tag, name] = text.includes('|') ? text.split('|') : [null, text];"), 'nameplates carry no tag numbers');

console.log('PASS validate-front-end: real rate (~4,350 lb/min, ~1,250 GPM slurry, 9 h fermenter fill), mills, the blender at the real mix, grinding bin alarm, plant units, backset / cook water / meth feed connected, Tin Bins 3 & 4');
