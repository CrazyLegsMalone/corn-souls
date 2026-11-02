// Run from the test/ directory: node validate-ground-layers.cjs
// One table decides the vertical order of everything flat that lies on the site. It has to stay strictly ordered,
// because since v1.97.80 removed the slope term from the polygon offset (a slope factor walked floors out of the depth
// range at distance) the HEIGHT is what decides the depth test between two overlays. The dirt yard used to sit 1.1 cm
// ABOVE the asphalt with the same depth pull, so every road that crossed it disappeared up close and fought it at
// range: the cross road between the process building and the energy center, the middle road, the loop's inner half,
// the tank farm's gravel loop and the lane dashes.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');

// ---------------------------------------------------------------- the table itself
const tbl = html.slice(html.indexOf('const GLAYER = {'), html.indexOf('const GY = k =>'));
assert.ok(tbl.length > 60, 'the layer table is in the game');
const rows = [...tbl.matchAll(/(\w+): \[([\d.]+), (-?\d+)\]/g)].map(m => ({ k: m[1], y: +m[2], bias: +m[3] }));
assert.equal(rows.length, 6, 'six ground layers: ' + rows.map(r => r.k).join(', '));
assert.equal(rows.map(r => r.k).join(','), 'grass,dirt,dirtroad,asphalt,paint,pad', 'bottom to top: grass under dirt under gravel under asphalt under markings under concrete');
for (let i = 1; i < rows.length; i++) {
  assert.ok(rows[i].y - rows[i - 1].y >= 0.005, rows[i].k + ' clears ' + rows[i - 1].k + ' by at least 5 mm (' + rows[i - 1].y + ' -> ' + rows[i].y + ')');
  assert.ok(rows[i].bias < rows[i - 1].bias, rows[i].k + ' is pulled further forward in the depth buffer than ' + rows[i - 1].k + ' (' + rows[i - 1].bias + ' -> ' + rows[i].bias + ')');
}
assert.ok(html.includes('const GY = k => GLAYER[k][0];') && html.includes('const GB = k => GLAYER[k][1];'),
  'the height and the depth pull are read from that one table');
assert.ok(html.includes('polygonOffsetFactor: 0, polygonOffsetUnits: GB(kind)'),
  'and every ground material takes its pull from it, with no slope term (a slope factor runs away at distance)');
assert.ok(!/polygonOffsetFactor: back \? 16/.test(html), 'the old slope term is gone for good');

// ---------------------------------------------------------------- the roads are above the yard, not under it
assert.ok(html.includes("groundMat('dirt', false, EXR - WXR, SZR - NROAD), (EXR + WXR) / 2, GY('dirt'),"),
  'the big dirt yard is on the dirt layer - not 1.1 cm above the roads that cross it');
assert.ok(html.includes("holeySlab(TFX - TFW / 2, TFZ - TFD / 2, TFX + TFW / 2, TFZ + TFD / 2, GY('dirt'),"),
  'and so is the tank farm dirt, so its own gravel loop sits on top of it');
assert.ok(html.includes("groundMat(kind, false, rw, rd2), (x0 + x1) / 2, GY(kind), (z0 + z1) / 2, null)"),
  'every road in the grid takes its height from its own layer');
assert.ok(html.includes("groundMat('dirtroad', false, EXR - MXR, 7.6), (MXR + EXR) / 2, GY('dirtroad'), CZR, null)"),
  'the cross road between the process building (south wall z 44) and the energy center (z 73-149) is a road layer, above the yard');
assert.ok(html.includes("GY('paint'),"), 'lane dashes are the paint layer, above the asphalt they mark');
assert.ok(html.includes("padMat(c), x, GY('pad'), z, null)") && html.includes('m.polygonOffsetUnits = GLAYER.pad[1];'),
  'concrete pads keep the top layer and their own forward-pulled material');
assert.ok(html.includes("y === GY('asphalt') ? groundMat('asphalt', false, L, w) : m"), 'the highway strips take the asphalt layer too');
assert.ok(html.includes("pos.push(P[i].x + n.x * w / 2, GY('dirtroad'),"), 'and the Ranger dust track is a dirt road like the rest');

// ---------------------------------------------------------------- and no overlay is left with a hand-written height
for (const stale of ['(EXR + WXR) / 2, 0.035,', '(MXR + EXR) / 2, 0.024,', 'RDPX, 0.024,', 'TOWER.x, 0.028,',
  '-610, 0.031,', 'WXR - GDX, 0.024,', '(z0 + z1) / 2, 0.024,', 'WXR, 0.024,', 'x, 0.08, z, null)']) {
  assert.ok(!html.includes(stale), 'no ground overlay keeps a magic height: ' + stale);
}

// ---------------------------------------------------------------- it holds up as code, not just as text
{   // the two helpers really do read the table
  const ctx = { GLAYER: {} };
  for (const r of rows) ctx.GLAYER[r.k] = [r.y, r.bias];
  vm.createContext(ctx);
  vm.runInContext('const GY = k => GLAYER[k][0]; const GB = k => GLAYER[k][1]; this.y = GY; this.b = GB;', ctx);
  assert.equal(ctx.y('asphalt'), rows.find(r => r.k === 'asphalt').y, 'GY returns the layer height');
  assert.equal(ctx.b('grass'), 8, 'GB returns the layer pull (grass is pushed back)');
  assert.equal(ctx.b('pad'), -16, 'and the concrete pads are pulled forward the most');
}

console.log('PASS: one ground layer table (grass < dirt < dirtroad < asphalt < paint < pad), height and depth pull in lockstep, every overlay takes both from it - so the cross road between the process building and the energy center is above the dirt yard again');
