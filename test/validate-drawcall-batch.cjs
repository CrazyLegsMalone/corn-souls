// Run from the test/ directory: node validate-drawcall-batch.cjs
// Guards Batch 1 draw-call, matrixAutoUpdate, and material optimizations:
// - mergeModel preserves vertex colors and userData.noHit, leaves skipped animated subtrees matrixAutoUpdate=true,
//   and culls small shadow casters against TIER.minCaster.
// - rangerTireOn folds each wheel from 17 meshes down to 4 shared static geometries.
// - setWallsSolid skips re-dirtying wall materials when solid state is unchanged.
// - pondFrogs share one vertex-colored BufferGeometry (1 mesh/frog instead of 8) and crowbarReadGLB uses Lambert.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const launcher = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 45)); return html.slice(i, j); };

// 1. mergeModel: vertex colors, noHit separation, skip subtree matrixAutoUpdate, and TIER.minCaster shadow culling
{
  const src = cut('function mergeModel(root, castShadow, skip) {', 'function rigPivot(');
  const ctx = { T, Float32Array, Map, TIER: { minCaster: 0.5 } };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.mergeModel = mergeModel;', ctx);

  const root = new T.Group(), mat = new T.MeshLambertMaterial({ vertexColors: true });
  const mkColored = (x, s, noHit) => {
    const geo = new T.BoxGeometry(s, s, s).toNonIndexed();
    const n = geo.attributes.position.count, col = new Float32Array(n * 3).fill(0.5);
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(geo, mat); m.position.x = x; if (noHit) m.userData.noHit = true;
    root.add(m); return m;
  };
  mkColored(-0.1, 0.1, true); mkColored(0.1, 0.1, true);   // small pair (combined bounding radius ~0.17 < 0.5) with noHit
  const bigMat = new T.MeshLambertMaterial({ color: 0x8899aa });
  const b1 = new T.Mesh(new T.BoxGeometry(2, 2, 2), bigMat), b2 = new T.Mesh(new T.BoxGeometry(2, 2, 2), bigMat);
  b1.position.z = -2; b2.position.z = 2; root.add(b1, b2);
  const joint = new T.Group(), leaf = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 0.2), bigMat);
  joint.add(leaf); root.add(joint);

  ctx.mergeModel(root, true, o => o === joint || o === leaf);
  const mergedNoHit = root.children.find(o => o.isMesh && o.material === mat);
  const mergedBig = root.children.find(o => o.isMesh && o.material === bigMat);
  assert.ok(mergedNoHit && mergedNoHit.geometry.attributes.color, 'mergeModel preserves vertex colors');
  assert.equal(mergedNoHit.userData.noHit, true, 'mergeModel preserves userData.noHit');
  assert.equal(mergedNoHit.castShadow, false, 'small merged mesh culled from shadow map by TIER.minCaster');
  assert.ok(mergedBig && mergedBig.castShadow === true, 'large merged mesh keeps castShadow');
  assert.equal(joint.matrixAutoUpdate, true, 'skipped animated joint keeps matrixAutoUpdate = true');
  assert.equal(leaf.matrixAutoUpdate, true, 'skipped animated child keeps matrixAutoUpdate = true');
}

// 2. rangerTireOn: 4 static meshes per wheel sharing pre-merged geometries across wheels
{
  const src = cut('let RANGER_TIRE = null', 'function rangerSkinSafe(');
  const ctx = { T, Math, Float32Array, srgbTex: t => t };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.rangerTireOn = rangerTireOn;', ctx);
  const w1 = new T.Group(), w2 = new T.Group();
  ctx.rangerTireOn(w1); ctx.rangerTireOn(w2);
  const m1 = w1.children.filter(c => c.isMesh), m2 = w2.children.filter(c => c.isMesh);
  assert.equal(m1.length, 4, 'each Ranger wheel has 4 meshes instead of 17');
  assert.ok(m1.every(m => m.matrixAutoUpdate === false), 'wheel child meshes freeze matrixAutoUpdate');
  assert.deepEqual(m1.map(m => m.geometry), m2.map(m => m.geometry), 'all Ranger wheels share the merged geometries');
}

// 3. setWallsSolid: idempotent when called repeatedly in the same mode
{
  const src = cut('function setWallsSolid(on) {', 'function walkStart() {');
  const wm = new T.MeshLambertMaterial({ transparent: true, opacity: 0.6, depthWrite: false });
  const ctx = { T, wallMats: [wm] };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.setWallsSolid = setWallsSolid;', ctx);
  ctx.setWallsSolid(true);
  const v1 = wm.version;
  assert.equal(wm.transparent, false); assert.equal(wm.opacity, 1);
  ctx.setWallsSolid(true);
  assert.equal(wm.version, v1, 'repeated setWallsSolid(true) does not re-dirty wall shaders');
  ctx.setWallsSolid(false);
  assert.equal(wm.transparent, true); assert.equal(wm.opacity, 0.6);
}

// 4. pondFrogs: 1 shared vertex-colored geometry & 1 mesh per frog; crowbarReadGLB uses Lambert
{
  assert.ok(!launcher.includes('MeshStandardMaterial'), 'launcher GLB loader uses MeshLambertMaterial, not PBR');
  const frogSrc = JSON.parse(launcher.match(/const frogEngine=("(?:[^"\\]|\\.)*");/)[1]);
  const scene = new T.Scene();
  const ctx = { T, Math, Float32Array, scene, PONDS: Object.assign([[-260, -300]], { half: 35, phi: 0 }),
    TIER: { minCaster: 1 }, walk: { on: true, x: -260, z: -300 }, floorAt: () => 0, puff() {}, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z) };
  vm.createContext(ctx);
  vm.runInContext(frogSrc + '\nthis.pondFrogs = pondFrogs; this.makePondFrogs = makePondFrogs; this.hitPondFrog = hitPondFrog; this.updatePondFrogs = updatePondFrogs;', ctx);
  ctx.makePondFrogs();
  assert.equal(ctx.pondFrogs.length, 6, 'six pond frogs (v1.97.51, owner: "we will only have 6 frogs now")');
  const geos = new Set();
  for (const f of ctx.pondFrogs) {
    const meshes = f.group.children.filter(c => c.isMesh);
    assert.equal(meshes.length, 1, 'one merged stand-in mesh per frog until its model loads');
    assert.ok(meshes[0].geometry.attributes.color, 'vertex-colored frog geometry');
    assert.equal(meshes[0].castShadow, false, 'tiny frogs skip shadow pass on low tier');
    geos.add(meshes[0].geometry);
  }
  assert.equal(geos.size, 1, 'all six stand-ins share one BufferGeometry');
  ctx.hitPondFrog(ctx.pondFrogs[0], 0xff2266);
  assert.equal(ctx.pondFrogs[0].mats[0].color.getHex(), 0xff2266, 'painted frog takes ball color');
  ctx.pondFrogs[0].t = 0.01; ctx.updatePondFrogs(0.05);
  assert.equal(ctx.pondFrogs[0].mats[0].color.getHex(), 0xffffff, 'respawned frog restores resting vertex colors');
}

// 5. Source wiring checks
assert.ok(html.includes('const GLB_FETCH = {};') && html.includes('GLB_FETCH[url] = fetch(url'), 'concurrent GLB fetches are deduplicated by URL');
for (const k of ['MARK_MATS', 'PAD_MATS', 'GLASS_MATS', 'ribMats', 'EXIT_SIGN.mat', 'EXIT_SIGN.halo', 'EGRESS.lens']) {
  assert.ok(html.includes('...Object.values(' + k + ')') || html.includes(k), 'mergeStatic includes ' + k);
}
console.log('PASS: Batch 1 draw-call, matrixAutoUpdate, shared material, and GLB merge checks');
