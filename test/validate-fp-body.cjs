// Run from test/: node validate-fp-body.cjs
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const cut = (start, end) => {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'missing game source: ' + start);
  return html.slice(a, b);
};
const lib = { window: {}, console };
vm.runInNewContext([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(m => m[1]).find(s => s.includes('window.THREE=eu')), lib);
const Three = lib.window.THREE;
const T = Object.create(Three, { TextureLoader: { value: class { load() { return new Three.Texture(); } } } });
const readModel = name => {
  const b = fs.readFileSync('../assets/models/' + name);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const models = ['squeeg1_2_0.glb', 'squeeg2_2_0.glb'].map(readModel);
const thenable = value => ({
  then(fn) { const result = fn(value); return result && result.then ? result : thenable(result); },
  catch() { return this; }
});
const walk = { on: true, x: 10, y: 2, z: 27, floor: 2, pitch: -1.2, yaw: 0.7 };
const NET = { conn: null, host: true };
const storage = new Map();
const scene = new T.Scene(), hudScene = new T.Scene();
const camera = new T.PerspectiveCamera(42, 1005 / 411, 0.2, 9000);
const hudCam = new T.PerspectiveCamera(42, 1005 / 411, 0.01, 5);
const fpGun = { g: new T.Group(), stock: new T.Group(), pump: new T.Group(), mag: new T.Group(), setRounds() {} };
fpGun.g.add(fpGun.stock, fpGun.pump, fpGun.mag); hudScene.add(fpGun.g);
fpGun.stock.add(new T.Mesh(new T.BoxGeometry(), new T.MeshLambertMaterial()));
const TOOLS = { wrench: { L: 0.55 }, crowbar: { L: 0.95 } };
const heldG = {};
for (const name of ['hand', 'washer', 'wrench', 'crowbar', 'ext']) {
  const item = heldG[name] = new T.Group();
  hudScene.add(item);
}
const SR = { carry: null, g: new T.Group() };
const ctx = {
  T, console, TextDecoder, performance: { now: () => 100 }, walk, NET, SR, VEST_COL: [0xff7a1a, 0xc6e41f],
  scene, hudScene, fpGun, camera, TOOLS, heldG, held: 'gun', heldDead: null, SQ_K: 1.68 / 1.8, clock: 1,
  TUNE: { fogNear: 120, fogFar: 900 }, EYE: 1.57, POWER: { fov: 0 },
  gun: fpGun.g, aimK: 0, aimWant: false, reloadT: 0, reloadTo: 'paint', reloadFill: true, pumpT: 0,
  ensureHud: () => hudScene,
  hudMat: () => new T.MeshBasicMaterial(),
  toolMat: () => new T.MeshBasicMaterial(),
  crowbarSlot: () => new T.Group(),
  gunKick: 0, sgTilt: 0, sgLast: null, sgBob: 0, swipe: 0, idleT: 0, MAG: 6, mags: { paint: 4 }, ammo: 'paint',
  wash: { t: 0 }, updateWasher() {}, gunClick() {}, onLadder: () => !!walk.ladder,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
  makeCharacter() {
    const av = new T.Group(), box = new T.Mesh(new T.BoxGeometry(0.4, 0.6, 0.3));
    box.userData.body = true; av.add(box); return av;
  },
  buildShotgun: () => ({ g: new T.Group() }),
  toolItem: (k, av) => { const g = new T.Group(); av.add(g); return g; },
  mat: color => new T.MeshLambertMaterial({ color }),
  Blob: class {},
  URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
  fetch: url => thenable({ ok: true, arrayBuffer: () => thenable(models[url.includes('squeeg1') ? 0 : 1]) })
};
scene.fog = new T.Fog(0);
vm.createContext(ctx);
const launcher = fs.readFileSync('index.html', 'utf8');
const [, crowbarAnchor, crowbarReplacement] = launcher.match(/const fp='([^']+)';[\s\S]*?html=html\.replace\(fp, "([^"]+)"\);/);
const makeToolSource = cut('function makeTool(k)', 'function toolItem(');
assert.ok(makeToolSource.includes(crowbarAnchor));
vm.runInContext([
  cut('function hudPart(', '\n'),
  makeToolSource.replace(crowbarAnchor, crowbarReplacement),
  cut('const GLB_CT = {', 'function loadGlbModel('),
  cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {'),
  cut('const PLAYER_SKIN = {', '// ---------- PACKAGE BOILERS'),
  cut('function walkCam() {', 'function focusUnit('),
  cut('const HIP = {', '// EVERY first-person item'),
  cut('function buildFpHands(', 'let fpHands = null'),
  cut('let fpHands = null', '// ---------- LESION TOOLBOX'),
  'this.test = { FP_BODY, FP_WAIST, VIEW, setView, walkCam, updateSelfAv, updateGun, toggleFpBody, dressPlayerSkin, makeTool, get hands() { return fpHands; } };'
].join('\n'), ctx);
const { FP_BODY, FP_WAIST, VIEW, setView, walkCam, updateSelfAv, updateGun, toggleFpBody, dressPlayerSkin } = ctx.test;
for (const name of Object.keys(TOOLS)) {
  heldG[name].removeFromParent();
  heldG[name] = ctx.test.makeTool(name);
}

function bootsInView(meshes) {
  const v = new T.Vector3();
  camera.updateMatrixWorld(true);
  return meshes.reduce((count, m) => {
    const { index, attributes } = m.geometry;
    for (let i = 0, n = (index || attributes.position).count; i < n; i++) {
      m.getVertexPosition(index ? index.getX(i) : i, v).applyMatrix4(m.matrixWorld);
      if (v.y > walk.y + 0.20) continue;
      v.project(camera);
      if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && Math.abs(v.z) < 1) count++;
    }
    return count;
  }, 0);
}

for (let slot = 0; slot < 2; slot++) {
  NET.conn = slot ? {} : null; NET.host = !slot;
  const other = new T.Group();
  dressPlayerSkin(other, ctx.VEST_COL[slot], { onRig() {} });
  walkCam();
  const av = VIEW.av, visible = av.userData.fpMeshes.filter(m => m.visible);
  assert.equal(VIEW.key, 'v' + slot);
  assert.ok(av.visible && av.userData.rig);
  assert.ok(Math.abs(av.position.x - walk.x - Math.sin(walk.yaw) * FP_BODY.back) < 1e-9);
  assert.ok(Math.abs(av.position.z - walk.z - Math.cos(walk.yaw) * FP_BODY.back) < 1e-9);
  assert.equal(av.position.y, walk.y);
  assert.equal(FP_WAIST.constant, walk.y + FP_BODY.waist);
  assert.deepEqual(Array.from(FP_WAIST.normal.toArray()), [0, -1, 0]);
  const otherMaterials = new Set();
  other.traverse(o => { if (o.isSkinnedMesh) otherMaterials.add(o.material); });
  for (const m of visible) {
    assert.ok(!otherMaterials.has(m.material), 'clipping stays local');
    assert.equal(m.material.clippingPlanes[0], FP_WAIST);
    assert.equal(m.material.clipShadows, false);
    assert.equal(m.material.transparent, false, 'one colour pass per mesh');
    assert.equal(m.material.side, ctx.T.FrontSide, 'v1.97.30: first person draws the outside faces only (the inside faces of the double-sided model drew a dark dome over the legs)');
  }
  const casters = visible.filter(m => m.castShadow);
  assert.equal(casters.length, 1);
  updateGun(0);
  assert.equal(ctx.test.hands.length, 2);
  assert.ok(visible.length + casters.length + ctx.test.hands.length <= 6, 'world + shadow + HUD draw budget');
  scene.updateMatrixWorld(true);
  assert.ok(bootsInView(visible) > 20, 'both player models show boots when looking down');
  walk.x += 0.06;
  walkCam();
  assert.ok(VIEW.legs.some(l => Math.abs(l.cur) > 0), 'the on-foot cycle drives the same skinned legs');
  walk.pitch = 0;
  walkCam();
  assert.ok(FP_WAIST.constant < walk.y, 'horizontal view clips the body from colour only');
  assert.ok(casters[0].castShadow);
  walk.pitch = -1.2;
  setView(true); updateSelfAv();
  assert.equal(VIEW.av, av, 'third person reuses the same model');
  assert.ok(av.visible && VIEW.items.gun.visible && av.userData.fpMeshes.every(m => m.visible && !m.castShadow && !m.material.clippingPlanes));
  assert.ok(av.userData.fpMeshes.every(m => m.material.side === ctx.T.DoubleSide), 'third person puts the double-sided material back');
  setView(false); updateSelfAv();
  assert.ok(!Object.values(VIEW.items).some(m => m.visible));
  for (const state of ['dead', 'drive', 'mow', 'ride', 'pass', 'ladder']) {
    walk[state] = true; updateSelfAv();
    assert.equal(av.visible, false, state + ' hides first-person legs');
    walk[state] = false;
  }
}
assert.equal(toggleFpBody(), false); updateSelfAv(); updateGun(0);
assert.equal(storage.get('cs_fpbody'), '0');
assert.equal(VIEW.av.visible, false);
assert.ok(ctx.test.hands.every(h => !h.parent));
assert.equal(toggleFpBody(), true);

updateGun(0);
const [right, left] = ctx.test.hands;
assert.equal(right.parent, fpGun.stock);
assert.equal(left.parent, fpGun.pump);
assert.equal(right.material, left.material);
assert.equal(right.geometry.attributes.color.count, 252);
const before = left.getWorldPosition(new T.Vector3());
ctx.pumpT = 0.5; updateGun(0);
assert.ok(before.distanceTo(left.getWorldPosition(new T.Vector3())) > 0.07, 'support hand follows the pump stroke');
ctx.pumpT = 0; ctx.reloadT = 0.32; updateGun(0);
assert.ok(left.position.z > 0.3, 'support hand reaches the side magazine');
ctx.reloadT = 0; ctx.aimK = 1; ctx.aimWant = true; updateGun(0);
assert.equal(right.parent, fpGun.stock);
assert.equal(fpGun.stock.visible, true);
assert.equal(fpGun.stock.children[0].visible, false);
fpGun.g.updateMatrixWorld(true);
const v = new T.Vector3();
for (const hand of [right, left]) {
  let points = 0;
  for (let i = 0; i < hand.geometry.attributes.position.count; i++) {
    v.fromBufferAttribute(hand.geometry.attributes.position, i).applyMatrix4(hand.matrixWorld).project(hudCam);
    if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && Math.abs(v.z) < 1) points++;
  }
  assert.ok(points > 0, 'hand stays in the HUD frustum while aiming');
}
for (const name of ['wrench', 'crowbar', 'ext', 'hand']) {
  ctx.held = name; updateGun(0);
  const item = name === 'hand' ? null : heldG[name];
  assert.equal(right.parent, item);
  assert.equal(left.parent, item);
  if (name in TOOLS) {
    const [primary, support] = item.userData.gripPoints;
    assert.ok(right.position.equals(primary) && left.position.equals(support));
    assert.ok(primary.distanceTo(support) > 0.08, 'hands occupy different points on the handle');
    for (const hand of [right, left]) {
      hand.getWorldPosition(v).project(hudCam);
      assert.ok(Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && Math.abs(v.z) < 1, name + ' grip is in view at rest');
    }
    const before = left.getWorldPosition(new T.Vector3());
    ctx.swipe = 0.25; updateGun(0);
    assert.ok(left.getWorldPosition(new T.Vector3()).distanceTo(before) > 0.05, 'support hand follows tool swing');
    assert.ok(right.position.equals(primary) && left.position.equals(support), 'swing maintains both grip points');
    ctx.swipe = 0;
  }
}
assert.equal(heldG.hand.visible, false, 'empty hands stay hidden on foot');
hudScene.add(SR.g); SR.carry = 'me'; updateGun(0);
assert.ok([right, left].every(h => h.parent === SR.g));
ctx.heldDead = {}; updateGun(0);
assert.ok([right, left].every(h => !h.parent), 'corpse carry leaves the HUD hands off');
ctx.heldDead = null; SR.carry = null; ctx.held = 'gun'; NET.conn = null;
updateGun(0);
assert.notEqual(ctx.test.hands[0], right, 'changing player slots rebuilds the sleeve colour');
assert.ok(html.includes("['🧍 Body in first person: '") && html.includes('renderer.localClippingEnabled = true'));
console.log('PASS: first-person body, both rigs and boots, local clipping, six-draw budget, held poses and toggle');
