// Run from the test/ directory: node validate-vehicle-cabins.cjs
// v1.97.105: hollow cabins. Every parked / drivable vehicle's top half is a real cabin: a lower body with a footwell, door
// panels, frames (pillars) round the window openings, a roof slab, tinted see-through glass in one mesh, a dash with lit
// gauges, a steering wheel, seats. The drivable cars' first-person view sits at the driver's eye from that cabin, and the
// steering wheel turns with the front wheels. The silver F-150 is gone. This runs the game's own cabin() over every
// vehicle's real spec (pulled out of the source) with three.js, and checks the wiring.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf('    // ---------- HOLLOW CABINS (v1.97.105)'), b = html.indexOf("    // five employees' vehicles parked in stalls");
assert.ok(a > 0 && b > a, 'the cabin helper is in the parking-lot block, ahead of the vehicles');
const MATS = {}, mat = c => MATS[c] || (MATS[c] = new T.MeshLambertMaterial({ color: c }));
const ctx = { T, Math, mat, batteryLight: m => { m.userData.batteryLight = true; return m; } };
vm.createContext(ctx); vm.runInContext(html.slice(a, b) + '\nthis.cabin = cabin; this.VGLASS = VGLASS; this.insetPoly = insetPoly; this.clipPoly = clipPoly; this.polyArea = polyArea;', ctx);

// the geometry helpers
assert.ok(Math.abs(ctx.polyArea([[0, 0], [2, 0], [2, 1], [0, 1]]) - 2) < 1e-9, 'area');
{ const q = ctx.insetPoly([[0, 0], [2, 0], [2, 1], [0, 1]], 0.1); assert.ok(Math.abs(q[0][0] - 0.1) < 1e-9 && Math.abs(q[0][1] - 0.1) < 1e-9 && Math.abs(q[2][0] - 1.9) < 1e-9, 'inset pulls every edge in'); }
{ const c = ctx.clipPoly([[-1, -1], [3, -1], [3, 0.5], [-1, 0.5]], [[0, 0], [2, 0], [2, 1], [0, 1]]); assert.ok(Math.abs(Math.abs(ctx.polyArea(c)) - 1) < 1e-9, 'clip keeps only the overlap'); }

// every vehicle's real spec, straight out of the source
const calls = [...html.matchAll(/cabin\((C|g|V\.g), (\{ W.*?\})\);/g)];
assert.equal(calls.length, 9, 'nine vehicles have hollow cabins: Gladiator, Equinox, Silverado (red + black lifted), crossover, Renegade, Crown Vic, 90s Ranger, Denali, Pink Sedan');
const nameOf = i => { const before = html.slice(0, calls[i].index), m = [...before.matchAll(/const (\w+) = \((?:col|si)|\/\/ a brand-new pink (Kia)/g)].pop(); return m[1] || m[2]; };
const glassCols = new Set([...html.match(/const GLASS_COLS = new Set\(\[([^\]]*)\]\)/)[1].split(',').map(x => parseInt(x.trim(), 16))]);
for (let i = 0; i < calls.length; i++) {
  const name = nameOf(i), before = html.slice(0, calls[i].index), W = +[...before.matchAll(/\bW = ([\d.]+)/g)].pop()[1];
  const spec = vm.runInNewContext('(' + calls[i][2] + ')', { W, col: 0x888888, paint: undefined, LOW: -0.07, top: 1.22, L: 5.5, Y0: 0.5 });
  const g = new T.Group(), r = ctx.cabin(g, spec), dy = spec.dy || 0;
  const F = spec.gh[0], A = spec.gh[1], R = spec.gh[spec.gh.length - 2], D = spec.gh[spec.gh.length - 1];
  // the glass: one transparent mesh the crowbar code knows as glass, inside the body's width
  const glass = g.children.filter(o => o.material === ctx.VGLASS);
  assert.equal(glass.length, 1, name + ': all its glass is one mesh (one draw call)');
  assert.ok(ctx.VGLASS.transparent && ctx.VGLASS.opacity < 0.7 && glassCols.has(ctx.VGLASS.color.getHex()), 'see-through tint, a colour the crowbar / burn code treats as glass');
  glass[0].geometry.computeBoundingBox(); const gb = glass[0].geometry.boundingBox;
  assert.ok(gb.max.x <= W / 2 + 1e-6 && gb.min.x >= -W / 2 - 1e-6, name + ': glass stays inside the body');
  assert.ok(glass[0].geometry.attributes.uv, name + ': glass has UVs (the cracked-glass texture needs them)');
  assert.equal(glass[0].renderOrder, 0, name + ': glass sorts by distance with the other see-through things (forced last, it drew over the ammonia fog in front of it)');
  // side windows split at the pillars: each side has (pillars + 1) panes
  const sideTris = (() => { const p = glass[0].geometry.attributes.position.array; let n = 0; for (let k = 0; k < p.length; k += 9) if (Math.abs(p[k]) > W / 2 - 0.2 && Math.abs(p[k] - p[k + 3]) < 1e-6 && Math.abs(p[k] - p[k + 6]) < 1e-6) n++; return n; })();
  assert.ok(sideTris >= 2 * ((spec.bp || []).length + 1), name + ': side windows on both sides, split at the pillars (' + sideTris + ' triangles)');
  // frames: two side frames with window holes
  const holed = g.children.filter(o => o.geometry && o.geometry.parameters && o.geometry.parameters.shapes && o.geometry.parameters.shapes.holes && o.geometry.parameters.shapes.holes.length);
  assert.equal(holed.length, 2, name + ': a frame each side with the window openings cut out');
  // the driver: left side (+x), inside the cabin, under the roof, above the floor, behind the windshield
  const [ex, ey, ez] = r.eye;
  assert.ok(ex > 0.2 && ex < W / 2 - 0.15, name + ': driver sits on the left (+x)');
  assert.ok(ez < F[0] - 0.4 && ez > D[0], name + ': eye between the windshield and the back glass');
  const roofY = A[1] + (R[1] - A[1]) * (A[0] - ez) / (A[0] - R[0]) + dy;
  assert.ok(ey < roofY - 0.1 && ey > Math.min(F[1], D[1]) + dy, name + ': eye under the roof (' + ey.toFixed(2) + ' < ' + roofY.toFixed(2) + ') and above the belt');
  assert.deepEqual(g.userData.eye, r.eye); assert.equal(g.userData.sw, r.sw);
  // the steering wheel: in front of the driver, below the eye, turning on its own axis
  const sw = r.sw, swp = sw.parent.position;
  assert.ok(swp.z > ez + 0.2 && swp.z < ez + 0.7 && swp.y < ey - 0.15 && Math.abs(swp.x - ex) < 1e-9, name + ': steering wheel in front of the driver');
  assert.ok(Math.abs(sw.rotation.y - Math.PI) < 1e-9, name + ": wheel flipped so the shared 'rotation.z = -steer * 3' turns it the way you steer");
  // the dash: ahead of the wheel, clear of the windshield glass
  const dash = g.children.filter(o => o.geometry && o.geometry.type === 'BoxGeometry' && o.material === mat(0x232528) && o.geometry.parameters.width > W - 0.3)[0];
  assert.ok(dash, name + ': has a dash'); const dp = dash.geometry.parameters, dTop = dash.position.y + dp.height / 2, dFront = dash.position.z + dp.depth / 2, dRear = dash.position.z - dp.depth / 2;
  assert.ok(dRear > swp.z, name + ': dash behind the wheel (from the driver)');
  const wsAt = z => F[1] + dy + (A[1] - F[1]) * (F[0] - z) / (F[0] - A[0]);
  assert.ok(wsAt(dFront) > dTop + 0.01, name + ': dash top stays under the windshield glass');
  // a lit gauge strip, facing the driver
  assert.ok(g.children.some(o => o.material && o.material.userData.batteryLight && o.position.z < dRear + 0.01 && o.position.x === ex), name + ': lit gauges on the driver side');
  // seats behind the driver's eye
  const seats = g.children.filter(o => o.material === mat(0x2c2e33) && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width < 0.7);
  assert.ok(seats.length >= 6 && seats.every(o => o.position.z < ez + 0.5), name + ': front seats (cushion, back, headrest) at the driver');
  // the footwell: a floor well below the belt, so the seats and wheel sit down in the car, not on its roofline
  const low = g.children.find(o => o.geometry && o.geometry.parameters && o.geometry.parameters.shapes && !o.geometry.parameters.shapes.holes.length && o.material === (spec.paint || mat(spec.col)) && (() => { o.geometry.computeBoundingBox(); return o.geometry.boundingBox.max.x - o.geometry.boundingBox.min.x > W - 0.01; })());
  assert.ok(low, name + ': lower body'); const lp = low.geometry.parameters.shapes.getPoints();
  assert.ok(lp.some(p => p.y < Math.min(F[1], D[1]) + dy - 0.3 && p.x < F[0] && p.x > D[0]), name + ': its top has the cabin well cut into it');
}

// v1.97.106: the crowbar breaks only the window it hits
{ const i0 = html.indexOf('// One window at a time (v1.97.106)'), i1 = html.indexOf('function breakGlass(V, mine) {');
  assert.ok(i0 > 0 && i1 > i0, 'per-window smashing sits right before the old whole-vehicle breakGlass');
  const sent = [], BROKEN = new T.MeshLambertMaterial({ color: 0xaabbcc, transparent: true, side: T.DoubleSide }), cars = [];
  const sx = { T, Math, V3: (x, y, z) => new T.Vector3(x, y, z), netSend: m => sent.push(m), glassSmash() {}, puff() {}, brokenGlassMat: () => BROKEN, get BROKEN_GLASS() { return BROKEN; },
    isGlass: m => !!m && (m === BROKEN || m === ctx.VGLASS), O: { cars }, VBOXES: [], breakGlass: () => { throw new Error('the whole car broke'); } };
  vm.createContext(sx); vm.runInContext(html.slice(i0, i1) + '\nthis.breakPane = breakPane; this.smashAt = smashAt; this.smashNet = smashNet; this.unbreakPanes = unbreakPanes;', sx);
  const make = () => { const i = calls.findIndex((c, k) => nameOf(k) === 'Kia'), W = 1.86, spec = vm.runInNewContext('(' + calls[i][2] + ')', { W, paint: undefined });
    const g = new T.Group(); ctx.cabin(g, spec); g.updateMatrixWorld(true); const V = { g }; sx.VBOXES.push(V); const car = { g, broken: false }; cars.push(car);
    return { g, V, car, m: g.children.find(o => o.material === ctx.VGLASS), spec }; };
  const { g, V, car, m, spec } = make(), panes = m.userData.panes;
  assert.ok(panes.filter(P => P.kind === 'side').length === 4 && panes.some(P => P.kind === 'windshield') && panes.some(P => P.kind === 'back'), 'Pink Sedan: four side panes (front + rear door, both sides), windshield, back glass');
  assert.equal(panes.reduce((q, P) => q + P.n, 0), m.geometry.attributes.position.count, 'the panes cover all the glass');
  const ray = new T.Raycaster(), hitAt = (o, d) => { ray.set(o, d); return ray.intersectObjects(g.children, false)[0]; };
  const ws0 = (() => { const P = panes.find(P => P.kind === 'windshield'); return Array.from(m.geometry.attributes.position.array.slice(P.s * 3, (P.s + P.n) * 3)); })();
  // driver's front door window, from outside on the left (+x)
  const h1 = hitAt(new T.Vector3(3, 1.18, 0.3), new T.Vector3(-1, 0, 0));
  assert.equal(h1.object, m, 'the swing lands on the glass'); assert.equal(sx.smashAt(V, h1, true), true, 'it smashes');
  const broke = panes.filter(P => P.broken); assert.equal(broke.length, 1, 'only the window that was hit breaks'); assert.equal(broke[0].kind, 'side');
  const wsNow = (() => { const P = panes.find(P => P.kind === 'windshield'); return Array.from(m.geometry.attributes.position.array.slice(P.s * 3, (P.s + P.n) * 3)); })();
  assert.deepEqual(wsNow, ws0, 'the windshield is untouched');
  assert.equal(m.userData.broken.renderOrder, 0, 'the cracked panes too');
  assert.ok(m.userData.broken && m.userData.broken.material === BROKEN && m.userData.broken.parent === g, 'the smashed pane shows cracked in a second mesh on the car (two glass draw calls at most)');
  assert.equal(sent.at(-1).pane, panes.indexOf(broke[0]), 'the other player is told which pane'); assert.equal(car.broken, true, 'a smashed window lets you into a drivable car without keys');
  const h2 = hitAt(new T.Vector3(3, 1.18, 0.3), new T.Vector3(-1, 0, 0));
  assert.notEqual(h2.object, m, 'the broken pane no longer stops a ray as intact glass'); assert.equal(sx.smashAt(V, h2, true), false, 'hitting it again does nothing more');
  // the windshield, from the front
  const h3 = hitAt(new T.Vector3(0.3, 1.15, 3), new T.Vector3(0, -0.12, -1).normalize());
  assert.equal(h3.object, m); assert.equal(sx.smashAt(V, h3, true), true); assert.equal(panes.find(P => P.kind === 'windshield').broken, true, 'a hit on the windshield breaks the windshield');
  assert.equal(panes.filter(P => P.broken).length, 2, 'and nothing else');
  // the paint: just a dent
  const h4 = hitAt(new T.Vector3(3, 0.6, 1.8), new T.Vector3(-1, 0, 0)); assert.notEqual(h4.object, m); assert.equal(sx.smashAt(V, h4, true), false, 'a hit on the body breaks no glass');
  // repair puts every pane back
  sx.unbreakPanes(m); assert.ok(panes.every(P => !P.broken), 'repair: all panes whole again');
  assert.equal(hitAt(new T.Vector3(3, 1.18, 0.3), new T.Vector3(-1, 0, 0)).object, m, 'and the glass stops the ray again');
  // the other player's smash lands on the same pane of the same car
  const two = make(); sx.smashNet({ i: sx.VBOXES.indexOf(two.V), pane: 3 }); assert.deepEqual(two.m.userData.panes.map(P => !!P.broken), two.m.userData.panes.map((P, k) => k === 3), 'remote: just that pane');
}
assert.ok(html.includes("if (smashAt(V, hit, true)) return; if (hit.object.material === BROKEN_GLASS) { gunClick(260, 0.04, 0.1); return; } break;"), 'tool swings smash only what they hit');
assert.ok(html.includes("} else if (m.t === 'cb') { smashNet(m);"), 'network: per-pane smash');
assert.ok(html.includes('if (o.isMesh && o.userData.panes) unbreakPanes(o);'), 'a full repair restores the panes');

// wiring
const lot = html.slice(html.indexOf("    // five employees' vehicles parked in stalls"), html.indexOf('  // ---------- ENERGY CENTER block'));
assert.ok(!/W \+ 0\.02, (glass|glassM|mat\(glass\)|0x4a6275)\)/.test(lot), 'no stuck-on glass bands left on the vehicles');
assert.ok(!/f150|F-150 SuperCrew|'silver F-150'|beaker/.test(html), 'the silver F-150, its key and keychain are gone');
assert.ok(html.includes("const KEYCAR = { cross: 'black Silverado', mustard: 'yellow crossover', flower: 'Pink Sedan' };"), 'three drivable cars with keys');
assert.ok(html.includes("return { g: outer, inner: g, eye: g.userData.eye || null, sw: g.userData.sw || null,"), 'mkCar picks up the driver seat and wheel');
assert.ok(html.includes('wheels: best.wheels, sw: best.sw || null, driver: null,'), 'getting in hands the car its steering wheel');
assert.ok(html.includes('if (c.sw) c.sw.rotation.z = 0;'), 'parked with the wheel straight');
{ const s = html.slice(html.indexOf('function utvCam(dt) {'), html.indexOf('function walkCam() {'));
  assert.ok(s.includes('if (CAR_ON && CAR_ON.eye) {') && s.includes('.applyMatrix4(CAR_ON.inner.matrixWorld)'), "first person in a car: the camera sits at the cabin's driver eye, riding with the body"); }
console.log('PASS: hollow cabins on all nine vehicles (see-through glass in one mesh, frames, footwell, dash, gauges, wheel, seats), driver-seat camera, F-150 gone, crowbar breaks one window at a time');
