// Run from the test/ directory: node validate-skin-batch.cjs
// Guards Batch 2 skinning, static NPC/avatar baking, and GPU texture sharing:
// - Repeated glbBuild(buf) on the same ArrayBuffer reuses decoded T.Texture instances via GLB_IMG_CACHE.
// - In-game NPCs (with npc.id) and non-animating player avatars (!opts.onRig) bake posed SkinnedMeshes + rigid
//   accessories down to <= 4 static T.Meshes with 0 live THREE.Skeletons while preserving posed world bounds.
// - Animating 3P player avatars (opts.onRig) deduplicate 15 skeletons -> 1 and merge flat SkinnedMeshes.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE;
let texLoads = 0;
const T = Object.create(T0, { TextureLoader: { value: class { load() { texLoads++; return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const reader = cut('const GLB_CT = {', 'function loadGlbModel(');
const npcSrc = cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {');
const playerSrc = cut('const PLAYER_SKIN = {', '// ---------- PACKAGE BOILERS');
const MODELS = path.join('..', 'assets', 'models');
const readBuf = f => { const b = fs.readFileSync(path.join(MODELS, f)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const sq1 = readBuf('squeeg1_2_0.glb'), sq2 = readBuf('squeeg2_2_0.glb');
const thenable = v => ({ then: cb => { const r = cb(v); return (r && r.then) ? r : thenable(r); }, catch: () => thenable(v) });
const ctx = {
  T, console, TextDecoder, VEST_COL: [0xff7a1a, 0xc6e41f],
  Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } },
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  fetch: url => thenable({ ok: true, arrayBuffer: () => thenable(/squeeg1|player1/.test(url) ? sq1 : sq2) })
};
vm.createContext(ctx);
vm.runInContext(reader + '\n' + npcSrc + '\n' + playerSrc + '\nthis.glbBuild = glbBuild; this.skinnedNpc = skinnedNpc; this.dressPlayerSkin = dressPlayerSkin; this.skinBox = skinBox;', ctx);

// 1. GLB_IMG_CACHE shares GPU Texture instances across all 7 player-avatar builds from the same ArrayBuffer
{
  texLoads = 0;
  const m1 = ctx.glbBuild(sq1), m2 = ctx.glbBuild(sq1), m3 = ctx.glbBuild(sq1);
  assert.equal(texLoads, 2, 'squeeg1_2_0.glb decodes its 2 baseColor textures once across 3 glbBuild calls');
  const texOf = root => { const s = new Set(); root.traverse(o => { if (o.isMesh && o.material && o.material.map) s.add(o.material.map); }); return [...s]; };
  assert.deepEqual(texOf(m1.root), texOf(m2.root), 'm1 and m2 share identical THREE.Texture instances');
  assert.deepEqual(texOf(m1.root), texOf(m3.root), 'm1 and m3 share identical THREE.Texture instances');
}

// 2. In-game NPCs (npc.id present) bake to <= 4 static meshes & 0 skeletons with identical posed bounds
for (const [f, id, pose, h] of [['vern_2_0.glb', 'vern', 'stand', 1.78], ['brenda_2_0.glb', 'brenda', 'sit', 1.65]]) {
  const buf = readBuf(f);
  const gRaw = new T.Group(); gRaw.add(new T.Group());
  const rRaw = ctx.skinnedNpc({ g: gRaw }, { h, pose }, ctx.glbBuild(buf));
  gRaw.updateMatrixWorld(true);
  const bbRaw = ctx.skinBox(rRaw), vTmp = new T.Vector3();
  rRaw.traverse(o => { if (o.isMesh && !o.isSkinnedMesh) { const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { vTmp.fromBufferAttribute(p, i); bbRaw.expandByPoint(vTmp.applyMatrix4(o.matrixWorld)); } } });

  const gBaked = new T.Group(); gBaked.add(new T.Group());
  const rBaked = ctx.skinnedNpc({ id, g: gBaked }, { h, pose }, ctx.glbBuild(buf));
  gBaked.updateMatrixWorld(true);
  const bbBaked = ctx.skinBox(rBaked);

  let sk = 0, meshes = 0, bones = 0;
  rBaked.traverse(o => { if (o.isSkinnedMesh) sk++; else if (o.isMesh) meshes++; if (o.isBone) bones++; });
  assert.equal(sk, 0, id + ': 0 SkinnedMeshes remain after baking');
  assert.equal(bones, 0, id + ': dead Bone hierarchy pruned after baking');
  assert.ok(meshes >= 2 && meshes <= 4, id + ': collapsed to ' + meshes + ' static meshes (1 vertex-colored + textured)');
  assert.ok(bbRaw.min.distanceTo(bbBaked.min) < 1e-4 && bbRaw.max.distanceTo(bbBaked.max) < 1e-4, id + ': baked bounds match posed SkinnedMesh + accessory bounds');
}

// 3. Player avatars: static/seated (!onRig) bake to 0 skeletons; animating 3P (onRig) deduplicates to 1 skeleton & <= 4 meshes
{
  const mkAv = () => { const av = new T.Group(), b = new T.Mesh(new T.BoxGeometry(0.4, 0.6, 0.3)); b.userData.body = true; av.add(b); return av; };
  const avSit = mkAv();
  ctx.dressPlayerSkin(avSit, 0xff7a1a, { sit: true });
  let sitSk = 0, sitM = 0;
  avSit.userData.rig.traverse(o => { if (o.isSkinnedMesh) sitSk++; else if (o.isMesh) sitM++; });
  assert.equal(sitSk, 0, 'seated player avatar has 0 live SkinnedMeshes');
  assert.ok(sitM >= 2 && sitM <= 4, 'seated player avatar folded into ' + sitM + ' static meshes');

  const av3p = mkAv();
  let gotSwing = null;
  ctx.dressPlayerSkin(av3p, 0xc6e41f, { onRig: (R, root, swing) => { gotSwing = swing; } });
  assert.ok(gotSwing && gotSwing.legL.b, '3P avatar receives live walk-cycle bones');
  const skels = new Set(); let skMeshes = 0, totalMeshes = 0;
  av3p.userData.rig.traverse(o => { if (o.isMesh) totalMeshes++; if (o.isSkinnedMesh) { skMeshes++; skels.add(o.skeleton); } });
  assert.equal(skels.size, 1, '3P avatar deduplicated from 15 skeletons down to 1');
  assert.ok(skMeshes <= 4 && totalMeshes <= 7, '3P avatar flat SkinnedMeshes merged (' + skMeshes + ' skinned, ' + totalMeshes + ' total)');
}
console.log('PASS: Batch 2 GLB texture sharing, skeleton deduplication, and static NPC/avatar baking checks');
