// Run from the test/ directory: node validate-exit-signs.cjs
// v1.97.136, owner (photo: a lit EXIT sign over a man door, under its red strobe): "make the personel doors that open to the
// outside like this. obviosly only from the inside". Every exterior man door has an egress strobe on its inside face; each one
// now gets the lit EXIT sign + halo under it on that face. Runs the game's own egressStrobe + exitSignsForEgress.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const egressSrc = cut('const EGRESS = { list: [], lens: null };', '// EXIT signage:');
const signSrc = cut('// v1.97.136, owner (photo of a lit EXIT sign', 'function concreteFloor(');
const scene = new T.Scene(), SIGN = new T.MeshBasicMaterial({ color: 0xff0000 }), HALO = new T.MeshBasicMaterial();
const ctx = { T, Math, scene, O: { swingDoors: [] }, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), batteryLight: m => m,
  EXIT_SIGN: { mat: SIGN }, exitSignMat: () => SIGN,
  box: (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); scene.add(o); return o; },
  exitHalo: (w, h, x, y, z, r) => { const o = new T.Mesh(new T.PlaneGeometry(w, h), HALO); o.position.set(x, y, z); o.rotation.y = r; o.userData.halo = true; scene.add(o); } };
vm.createContext(ctx);
vm.runInContext(egressSrc + '\n' + signSrc + '\nthis.egressStrobe = egressStrobe; this.exitSignsForEgress = exitSignsForEgress; this.EGRESS = EGRESS; this.EXIT_Y = EXIT_Y;', ctx);
const door = (x, z, alongX, top) => { const g = new T.Group(); g.position.set(x, 0, z); const l = new T.Mesh(new T.BoxGeometry(alongX ? 0.99 : 0.06, top, alongX ? 0.06 : 0.99)); l.position.y = top / 2; g.add(l); scene.add(g); ctx.O.swingDoors.push({ g, x, z }); };
// four exterior doors: one in a wall along x (inside is +z), one along z (inside is -x), a tall one, one that already has a sign
door(10, 0, true, 2.21); ctx.egressStrobe(10, 0, 0, 1);
door(30, 5, false, 2.21); ctx.egressStrobe(30, 5, -1, 0);
door(50, 0, true, 2.43); ctx.egressStrobe(50, 0, 0, -1);
door(70, 0, true, 2.21); ctx.egressStrobe(70, 0, 0, 1); ctx.box(0.7, 0.3, 0.12, SIGN, 70, 2.48, 0.25);
ctx.egressStrobe(10, 0, 0, 1);   // the same door twice
assert.equal(ctx.EGRESS.list.length, 4, 'one strobe per door (a repeat call adds none)');
scene.updateMatrixWorld(true);
assert.equal(ctx.exitSignsForEgress(), 3, 'three new signs: the door that already had one keeps just that one');
const signs = scene.children.filter(o => o.isMesh && o.material === SIGN), halos = scene.children.filter(o => o.userData.halo);
assert.equal(signs.length, 4, 'one sign per exterior door'); assert.equal(halos.length, 3, 'each new sign glows');
const at = (x, z) => signs.find(s => Math.hypot(s.position.x - x, s.position.z - z) < 0.6);
{ const s = at(10, 0.25); assert.ok(s, 'door in an x wall: sign centred on it'); assert.ok(s.position.z > 0.15, 'on the inside face (+z), not the outside'); assert.equal(s.position.y, ctx.EXIT_Y, 'between the door head and the strobe');
  const st = ctx.EGRESS.list[0]; assert.ok(st.position.y - 0.085 > s.position.y + 0.15, 'under the strobe, not into it'); assert.ok(s.position.y - 0.15 > 2.21, 'above the door head');
  assert.equal(s.geometry.parameters.width, 0.7, 'faces into the room'); }
{ const s = at(29.75, 5); assert.ok(s && s.position.x < 29.85, 'door in a z wall: sign on the inside (-x) face'); assert.equal(s.geometry.parameters.depth, 0.7, 'turned to face into the room'); }
{ const s = at(50, -0.25), st = ctx.EGRESS.list[2]; assert.ok(s.position.y - 0.15 > 2.43, 'a taller door: the sign sits clear above it (' + s.position.y.toFixed(2) + ')');
  assert.ok(st.position.y - 0.085 > s.position.y + 0.15, 'and its strobe moved up to stay above the sign'); }
// in the game: built with the world, before the lights are collected; the old one-off signs are gone (one was on blank wall)
assert.ok(html.includes('buildGrainPiles(); exitSignsForEgress(); lightBuild();'), 'signs go up with the world, before lightBuild gives them their red glow');
assert.ok(!html.includes('exitSignMat(), MX1 - 0.25, DH0 + 0.35, 17.7'), 'the shop sign on blank wall (z 17.7, its door is at z -8) is gone');
assert.equal((html.match(/exitSignMat\(\)/g) || []).length, 3, 'EXIT signs come from the pass (plus the lab door inside the building)');
assert.ok(html.includes("['FERM MCC', null]") && html.includes('if (!text) return;'), 'the FERM MCC door: no OUTSIDE plate on the inside, where its EXIT sign goes');
console.log('PASS: every exterior man door gets a lit EXIT sign under its strobe, on the inside face only (centred, turned into the room, above the door head, under the strobe; tall doors lift both; no doubles)');
