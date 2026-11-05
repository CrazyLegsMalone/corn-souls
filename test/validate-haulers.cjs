// Run from the test/ directory: node validate-haulers.cjs
// v1.97.166: the owner's eight grain haulers (assets/models/grain_haulers/) bring the corn in. Loads the real files with the game's
// own GLB reader (now with vertex colours) and runs the game's haulerTruck / haulerPose / haulerUpdate: turned to drive along +x
// and centred, all ten wheels, the bed tipping back on its rear hinge with the ram on its front and the gate swinging out, corn
// pouring and the load gone after; wheels turning with the ground covered; a guest playing the host's dump; the colour in the
// two-player truck sync; the shorter collision box; the dump stop that puts its tail over the pit.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), launcher = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const COLS = ['black', 'blue', 'green', 'pink', 'red', 'white', 'yellow', 'yellpink'], dir = path.join(__dirname, '..', 'assets', 'models', 'grain_haulers');
const ctx = { T, Math, console, TextDecoder, DataView, JSON, Uint8Array, Float32Array, Uint16Array, Uint32Array, Int8Array, Int16Array, scene: new T.Scene(), vehicles: [], NET: { conn: null, host: false },
  mat: c => new T.MeshLambertMaterial({ color: c }), mergeGroup() {}, cornArtMat: () => new T.MeshLambertMaterial(), loadGlbModel() {} };
vm.createContext(ctx);
vm.runInContext(cut('const GLB_CT', '// Shared model fetch') + cut('// ---------- GRAIN HAULERS (v1.97.166)', 'const spawnQueue = [];') +
  '\nthis.glbBuild = glbBuild; this.HAULER = HAULER; this.haulerTruck = haulerTruck; this.haulerPose = haulerPose; this.haulerUpdate = haulerUpdate; this.truck = truck;', ctx);
const H = ctx.HAULER;
// the files, read by the game's reader, in their own colours
assert.deepEqual([...H.cols], COLS, 'eight colours');
for (const [i, c] of COLS.entries()) { const f = path.join(dir, 'grain_hauler_' + c + '.glb'); assert.ok(fs.existsSync(f), c + ' is in the repo');
  const b = fs.readFileSync(f), r = ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); let vc = 0, meshes = 0; r.root.traverse(o => { if (o.isMesh) { meshes++; if (o.material.vertexColors && o.geometry.attributes.color) vc++; } });
  assert.ok(meshes >= 15 && vc === meshes, c + ': every part painted with its vertex colours (they came out white before)'); H.proto[i] = r.root; }
{ const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'registry.json'), 'utf8')), e = reg.assets.find(a => a.id === 'first-party-grain-haulers');
  assert.ok(e && e.status === 'in-use' && COLS.every(c => e.files.includes('assets/models/grain_haulers/grain_hauler_' + c + '.glb')), 'registered, all eight'); }
// a corn truck is a hauler (its colour as asked), the tankers are not
const g = ctx.truck('corn', 3); assert.ok(g.userData.hauler && g.userData.look === 3, 'a corn delivery is one of the owner\'s haulers, in the colour asked for');
assert.ok(!ctx.truck('eth').userData.hauler, 'ethanol tankers stay as they were');
{ const seen = new Set(); for (let k = 0; k < 200; k++) seen.add(ctx.truck('corn').userData.look); assert.equal(seen.size, 8, 'left to chance: all eight colours turn up'); }
// turned and centred: drives along +x, 15.2 m, its middle on the truck's origin
g.updateMatrixWorld(true);
{ const bb = new T.Box3().setFromObject(g); assert.ok(Math.abs(bb.max.x - 7.6) < 0.1 && Math.abs(bb.min.x + 7.6) < 0.1 && Math.abs(bb.max.z - 1.25) < 0.05, 'along +x, 15.2 m long, centred (' + bb.min.x.toFixed(2) + '..' + bb.max.x.toFixed(2) + ')');
  const cab = new T.Box3().setFromObject(g.userData.hauler.wheels[0].parent.parent); assert.ok(cab.max.x > 5, 'the tractor is at the front (+x)'); }
assert.deepEqual([...g.userData.vbox], [0, 7.6, 1.3], 'its own collision box (half length 7.6, not the old 21 m truck\'s 10.6)');
const U = g.userData.hauler; assert.equal(U.wheels.length, 10, 'ten wheels'); assert.ok(U.bed && U.gate && U.ram && U.load && U.pour, 'bed, gate, ram, load and pour');
// the dump
const wp = o => o.getWorldPosition(new T.Vector3());
const rest = new T.Box3().setFromObject(U.bed);
ctx.haulerPose(g, 0); g.updateMatrixWorld(true); assert.ok(U.load.visible && !U.pour.visible && U.bed.rotation.x === 0, 'at rest: loaded, bed down');
ctx.haulerPose(g, 1.3); g.updateMatrixWorld(true);
{ const up = new T.Box3().setFromObject(U.bed), hinge = wp(U.bed);
  assert.ok(up.max.y > rest.max.y + 4, 'the bed tips up (front ' + up.max.y.toFixed(1) + ' m)'); assert.ok(hinge.x < -6.5, 'on its rear hinge (at the back)');
  const front = new T.Vector3(0, 0, 10.82).applyMatrix4(U.bed.matrixWorld), ramTip = new T.Vector3(0, 1, 0).applyMatrix4(U.ram.matrixWorld);
  assert.ok(front.distanceTo(ramTip) < 0.15, 'the ram reaches the bed\'s front (' + front.distanceTo(ramTip).toFixed(2) + ' m off)');
  assert.ok(U.gate.rotation.x > 0.9 && U.pour.visible && wp(U.pour).x < -7.6, 'the gate swings open and corn pours out the back');
  ctx.haulerPose(g, 1.6); assert.ok(!U.load.visible, 'the load is gone by 1.5 s'); }
ctx.haulerPose(g, 2.7); g.updateMatrixWorld(true); assert.ok(Math.abs(U.bed.rotation.x) < 1e-9 && U.gate.rotation.x < 1e-9 && !U.pour.visible && Math.abs(U.ram.scale.y - U.ram0) < 0.05, 'back down after');
assert.ok(!U.load.visible, 'and empty, driving away');
// the game: corn deliveries stop with the tail over the pit; the dump drives haulerPose; the shorter box is used for bumping into you
assert.ok(html.includes("[x, GDZ + (g.userData.hauler ? HAULER.DUMP_AHEAD : 0), 'dump']") && html.includes('DUMP_AHEAD: 8.4'), 'a hauler stops 8.4 m on, so its tail (7.6 m back) pours into the pit');
assert.ok(html.includes('    if (v.g.userData.hauler) haulerPose(v.g, t);   // v1.97.166') && html.includes('if (v.g.userData.hauler) haulerPose(v.g, 2.7);'), 'the host\'s dump runs it, and settles it after');
assert.ok(html.includes("vehHitOne(vehicles[i].g, vehicles[i].g.userData.vbox || VBOX.truck, 'semi')"), 'collision uses the hauler\'s own box');
assert.ok(html.includes("haulerLoad();       // the owner's grain haulers (v1.97.166)") && html.includes("stepSafe('haulers', () => haulerUpdate(dt));"), 'loaded with the world, updated every frame');
// wheels turn with the ground covered; a guest plays the host's dump
{ const v = { g, kind: 'corn', dumping: false, t: 0 }; ctx.vehicles.push(v); g.position.set(0, 0, 0); g.rotation.y = 0; ctx.haulerUpdate(0.016); const w0 = U.wheels[0].rotation.x;
  g.position.x += 0.98; ctx.haulerUpdate(0.016); assert.ok(Math.abs(U.wheels[0].rotation.x - w0 - 2) < 1e-6, 'a metre forward turns the 0.49 m wheels two radians');
  ctx.NET.conn = { open: true }; ctx.NET.host = false; v.dumping = true; v.t = 1.0; ctx.haulerUpdate(0.1); assert.ok(U.bed.rotation.x < -0.4, 'the guest sees the host\'s dump');
  v.dumping = false; ctx.haulerUpdate(0.1); assert.ok(Math.abs(U.bed.rotation.x) < 1e-9, 'and it settles when the host\'s is done'); }
// two players see the same truck: the colour rides the launcher's truck sync
assert.ok(launcher.includes('+!!v.loading,v.g.userData.look==null?-1:v.g.userData.look];') && launcher.includes('const g=truck(a[1],a[11]);'), 'the host sends which hauler, the guest builds that one');
// the vertex colour reader keeps plain materials plain
assert.ok(html.includes("mat = base.userData.vc || (base.userData.vc = Object.assign(base.clone(), { vertexColors: true }));"), 'vertex colours on a copy of the material, made once');
console.log('PASS: grain haulers (8 colours, vertex-coloured by the game\'s reader; turned to +x and centred, 10 wheels; bed tips on its rear hinge with the ram on its front, gate out, corn pours, empty after; wheels roll; the guest sees the dump and the same colour; own collision box; tail over the pit)');
