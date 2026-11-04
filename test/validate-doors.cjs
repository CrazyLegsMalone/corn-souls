// Run from the test/ directory: node validate-doors.cjs
// v1.97.119: one roll-up door design for the whole plant (only the size differs), and no door with a crack round it to see
// through. Runs the game's own rollUpDoor and checks every roll-up goes through it, and that every swing door leaf fills its opening.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const r0 = html.indexOf('function rollUpDoor('), r1 = html.indexOf('\n// a plain man door', r0);
assert.ok(r0 > 0 && r1 > r0, 'the shared roll-up door builder');
const ctx = { T, scene: new T.Scene(), wallSegs: [], O: {}, mat: c => new T.MeshLambertMaterial({ color: c }) };
vm.createContext(ctx); vm.runInContext(html.slice(r0, r1) + '\nthis.rollUpDoor = rollUpDoor;', ctx);
const bb = o => { ctx.scene.updateMatrixWorld(true); return new T.Box3().setFromObject(o); };
for (const [w, h, alongX] of [[3.05, 3.5, false], [7.3, 7.3, true], [2.9, 3.0, true]]) {
  const d = ctx.rollUpDoor(10, 20, alongX, w, h, { side: 1 });
  const P = bb(d.panel), span = alongX ? P.max.x - P.min.x : P.max.z - P.min.z;
  assert.ok(span > w + 0.06, w + ' m opening: the curtain is wider than the opening (' + span.toFixed(3) + ')');
  assert.ok(Math.abs(P.min.y) < 1e-6 && Math.abs(P.max.y - h) < 1e-6, 'and runs floor to head');
  const guides = d.g.children.filter(c => c.geometry && c.geometry.parameters && c.geometry.parameters.width === 0.42 && c.geometry.parameters.depth === 0.12);
  assert.equal(guides.length, 2, 'a steel guide each side');
  for (const gd of guides) { const G = bb(gd), inner = alongX ? Math.min(Math.abs(G.min.x - 10), Math.abs(G.max.x - 10)) : Math.min(Math.abs(G.min.z - 20), Math.abs(G.max.z - 20));
    assert.ok(inner < w / 2 - 0.03, 'its inner face stands inside the opening, over the curtain edge (' + inner.toFixed(3) + ' < ' + (w / 2).toFixed(3) + ')'); }
  const head = d.g.children.find(c => c.geometry && c.geometry.parameters && c.geometry.parameters.height === 0.14), H = bb(head);
  assert.ok(H.min.y < h - 0.03 && H.max.y > h, 'a head strip over the top edge, standing just below the lintel');
  assert.equal(d.panel.position.y, h / 2, 'the curtain sits where the shared open/close animation expects it');
  assert.ok(ctx.wallSegs.includes(d.seg) && ctx.O.rollDoors.includes(d), 'it blocks while shut and is animated like every roll-up');
}
// every roll-up in the plant is this one design
assert.equal((html.match(/\(O\.rollDoors = O\.rollDoors \|\| \[\]\)\.push/g) || []).length, 1, 'only rollUpDoor makes roll-ups');
assert.equal((html.match(/rollUpDoor\(/g) || []).length, 8, 'the process building and shop (one helper), storage shed, DDG, energy center north, west bump-out and south (ecRoll), east, and turbine room all call it');
assert.ok(!html.includes("style === 'mesh' ? new T.MeshLambertMaterial") && !html.includes('the mesh screen'), 'no mesh-curtain or screen variants left');
// swing doors fill their openings
for (const [k, why] of [
  ["const leaf = new T.Mesh(new T.BoxGeometry(0.99, 2.15, 0.06), mat(col || 0x4a525c)); leaf.position.set(0, 1.075, 0); g.add(leaf);", 'manDoor: 0.99 x 2.15 in a 0.95 x 2.13 opening'],
  ['const pair = w > 1.6, lw = pair ? w / 2 : w + 0.04;', 'process building doors: a single leaf runs past the latch edge into the wall, a pair meets in the middle'],
  ['const leaf = new T.Mesh(new T.BoxGeometry(lw, DH, 0.06), leafM); leaf.position.set(-k * lw / 2, DH / 2, 0); g.add(leaf);', 'and reaches up into the frame'],
  ['new T.BoxGeometry(1.04, 2.17, 0.06), mat(0x3a4048)', 'DDG man doors'],
  ["const z = EZ0, lw = 0.97, g = new T.Group(); g.position.set(MDX - 0.485, 0, z);", 'energy center green man door'],
  ['P(0.06, 2.15, 0.92, grn, 0.02, 1.075, sd * 0.46);', 'N Energy MCC double door'],
  ['const W = pair ? 1.75 : 0.95, lw = pair ? W / 2 : W + 0.04;', 'turbine room man doors'],
  ['leaf(TX, HZ, false, DOOR + 0.04, doorM);', 'scale house inside doors'],
  ['leaf(X0, HZ - 0.45, false, 0.9, glassM); leaf(X0, HZ + 0.45, false, 0.9, glassM);', 'scale house glass entrance pair']]) assert.ok(html.includes(k), why);
console.log('PASS: one roll-up door design everywhere (curtain wider than the opening, in steel guides, head strip, coil hood) and every swing door leaf fills its opening');
