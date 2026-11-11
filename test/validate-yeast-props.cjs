// Run from the test/ directory: node validate-yeast-props.cjs
// Guards TEST v1.97.76 (owner: "We need to finish cool and fermentation. We need 2 yeast prop tanks and blend tank" - blend tank =
// "Yeast/enzyme mix for props"; "Next to ferm 1 across from the mash cooler plate exchangers should be the blend tank. South of that
// the yeast prop tanks"). Runs the real plant sim for days of plant time; checks the 3D build and wiring by source.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('Ethanol plant mechanics'));
const load = () => { const m = { exports: {} }; vm.runInNewContext(src, { module: m, Math, console }); return m.exports; };
const Sim = load();
const run = (s, h, each) => { for (let t = 0; t < h; t += 0.05) { Sim.step(s, 0.05 / s.speed); if (each) each(s); } };
// ---- the units
for (const [id, nm] of [['yb', 'Blend Tank'], ['yp0', 'Yeast Prop Tank 1'], ['yp1', 'Yeast Prop Tank 2']]) {
  assert.ok(Sim.UNIT[id] && Sim.UNIT[id].name === nm && Sim.UNIT[id].st === 'ferm', nm + ' is a fermentation unit');
}
assert.equal(JSON.stringify(Sim.UNIT.yp0.temp.good), '[88,93]', 'props grow best at 88-93 F');
// ---- normal running: every fermenter that finishes filling has had a full-strength prop pitched, no alerts, same output as before
{ const s = Sim.create(); s.yeastT = 38;
  const done = [], alerts = []; let eth = 0, ev = [], prev = s.prop.map(p => p.state);
  run(s, 250, s => { eth += s.out.eth * 0.05;
    s.ferm.forEach((f, i) => { if (f.state === 'fermenting' && f.t < 0.06 && !done.some(d => d.i === i && s.t - d.t < 1)) done.push({ i, t: s.t, pitched: f.pitched, y: f.yeast }); });
    s.prop.forEach((p, i) => { if (p.state !== prev[i]) ev.push([s.t, i, p.state]); prev[i] = p.state; });
    while (s.alerts.length) alerts.push(s.alerts.shift().msg); });
  assert.ok(done.length >= 25, 'fermenters keep cycling (' + done.length + ' fills)');
  assert.ok(done.every(d => d.pitched && d.y > 0.99), 'every one pitched with full-strength yeast');
  assert.deepEqual(alerts, [], 'no alerts');
  assert.ok(Math.abs(eth / 250 - 4670) < 250, 'ethanol about what the plant made before the props (' + (eth / 250).toFixed(0) + ' gal/h)');
  const states = new Set(ev.map(e => e[2])); for (const k of ['filling', 'propping', 'ready', 'pitching', 'cleaning', 'empty']) assert.ok(states.has(k), 'props go through ' + k);
  assert.ok(new Set(ev.map(e => e[1])).size === 2, 'both prop tanks take turns');
  assert.ok(s.prop.every(p => p.bu <= Sim.CAP.prop + 1e-6), 'never over-full'); }
// ---- yeast from a warm cooler is weaker, and so is the fermentation
{ const s = Sim.create(); s.yeastT = 70; run(s, 120);
  assert.ok(s.yb.q < 0.7, 'a warm cooler makes a weak batch (' + s.yb.q.toFixed(2) + ')');
  assert.ok(s.ferm.filter(f => f.pitched && f.state === 'fermenting').every(f => f.yeast < 0.7), 'and the fermenters get weak yeast'); }
// ---- no yeast at all: the fermenter ferments slowly, and you are told
{ const s = Sim.create(); run(s, 5);
  const alerts = []; s.prop.forEach(p => Object.assign(p, Sim.newProp()));
  // keep both props empty and the blend tank from starting one
  run(s, 30, s => { s.prop.forEach(p => { if (p.state !== 'empty') Object.assign(p, Sim.newProp()); }); s.yb.state = 'mixing'; s.yb.t = 0; while (s.alerts.length) alerts.push(s.alerts.shift().msg); });
  const raw = s.ferm.find(f => f.state === 'fermenting' && !f.pitched);
  assert.ok(raw, 'a fermenter went on without yeast');
  assert.ok(alerts.some(m => /no yeast pitched/.test(m)), 'with an alert: ' + alerts[0]);
  assert.equal(Sim.status(s, 'f' + s.ferm.indexOf(raw))[0], 'bad');
  const kSlow = Sim.F.yeastK(0), kOk = Sim.F.yeastK(1); assert.ok(kSlow < 0.35 && kOk === 1, 'unpitched ferments at ' + kSlow + 'x'); }
// ---- run the front end harder: the two props overlap so they keep up
{ const s = Sim.create(); for (let i = 0; i < 4; i++) s.sp['mill' + i].rate = 550; const done = [];
  run(s, 200, s => s.ferm.forEach((f, i) => { if (f.state === 'fermenting' && f.t < 0.06 && !done.some(d => d.i === i && s.t - d.t < 1)) done.push({ i, t: s.t, p: f.pitched }); }));
  assert.ok(done.slice(-6).every(d => d.p), 'at 550 bu/h a mill, every fermenter is still pitched'); }
// ---- 3D: where they stand, what they are wired to
assert.ok(html.includes("yb: [-11.6, -36.4, 1.5, 2, 2.1], yp0: [-11.6, -31.4, 2.5, 5.6], yp1: [-11.6, -26.3, 2.5, 5.6],"), 'blend tank next to Ferm 1, the props south of it, solid to walk into');
const blk = html.slice(html.indexOf('// ---------- YEAST PROPS + BLEND TANK'), html.indexOf('// Beer leaves a fermenter through the drain'));
assert.ok(blk.includes("nameplate('BLEND TANK',") && blk.includes("nameplate('YEAST PROP ' + (i + 1),"), 'nameplates (no tag numbers)');
assert.ok(/O\.yb = tank\(YX, BZ, BR, BH, green, 0xd9c79a, 'yb', \{ level: 0\.8, flat: true, y: BY \}\);/.test(blk), 'the blend tank stands on legs');
assert.ok((blk.match(/pumpModel\('small'/g) || []).length === 2, 'a blend pump and a transfer pump per prop');
assert.ok(blk.includes("spinners.push({ o: ag, axis: 'y', k: 'prop', i });") && blk.includes("spinners.push({ o: ag, axis: 'y', k: 'ybm' });"), 'agitators');
assert.ok(html.includes("if (O.cooler) sim.yeastT = O.cooler.T;"), 'the yeast cooler temperature reaches the blend tank');
assert.ok(html.includes("f.rate = ((fillIdx === i ? sim.liq.out - (sim.propSide || 0) : 0) + (sim.pitchTo === i ? sim.pitchRate : 0)) / N;"), 'the fill line carries the mash and the pitch');
assert.ok(html.includes("props: { k: ['prop', 'props', 'prop tank', 'prop tanks', 'yeast prop', 'propagation', 'blend tank', 'pitch', 'pitched'], say: () => propSay()"), 'Rick can tell you about them');
// the alley's east wall is open where they stand
assert.ok(html.includes("    wall(FXE, Z1 + FR, FXE, -37.1, PH, wm, [], { trim: true });\n    wall(FXE, -29.8, FXE, -23.7, PH, wm, [], { trim: true });"));
console.log('PASS: yeast props + blend tank (every fermenter pitched at normal rates with no change in output; warm cooler = weak yeast; no prop = slow ferm + alert; the props overlap when the front end runs harder; placed by Ferm 1 across from the coolers)');
