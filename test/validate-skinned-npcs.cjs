// Run from the test/ directory: node validate-skinned-npcs.cjs
// v1.97.177, owner: "lets tryt he models as is at first" (the NPCs). Vern, Rick, Brenda and Tammy wear Loves_Art's Low Poly Male /
// Low Poly Female (CC BY 4.0): skinned meshes on a Mixamo-style skeleton. The game's own glTF reader had no skinning at all, so
// this runs it for real on both files, then the game's own skinnedNpc() posing - standing and seated - and measures the result.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const reader = cut('const GLB_CT = {', 'function loadGlbModel('), npcSrc = cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {');
const ctx = { T, console, TextDecoder }; vm.createContext(ctx);
vm.runInContext(reader + '\n' + npcSrc + '\nthis.glbBuild = glbBuild; this.glbPose = glbPose; this.skinnedNpc = skinnedNpc; this.skinBone = skinBone; this.skinBox = skinBox; this.SKIN_POSE = SKIN_POSE;', ctx);
const MODELS = path.join('..', 'assets', 'models'), load = f => { const b = fs.readFileSync(path.join(MODELS, f)); return ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const wp = o => o.getWorldPosition(new T.Vector3());
const MALE = 'low_poly_male_loves_art.glb', FEMALE = 'low_poly_female_loves_art.glb';

// ---------------------------------------------------------------- the reader: skins and clips
for (const [f, meshes, bones] of [[MALE, 10, 66], [FEMALE, 11, 71]]) {
  const m = load(f), sk = []; m.root.traverse(o => { if (o.isSkinnedMesh) sk.push(o); });
  assert.equal(sk.length, meshes, f + ': every part is a skinned mesh (' + sk.length + ')');
  assert.ok(sk.every(o => o.skeleton === sk[0].skeleton), f + ': one skeleton shared by every part');
  assert.equal(sk[0].skeleton.bones.length, bones, f + ': ' + bones + ' joints');
  assert.ok(sk[0].skeleton.bones.every(b => b.isBone), f + ': joints are bones');
  assert.ok(sk.every(o => o.geometry.attributes.skinIndex && o.geometry.attributes.skinWeight), f + ': joint indices and weights read');
  assert.equal(m.anims.length, 1); assert.equal(m.anims[0].name, 'walking', f + ': its walk clip is read');
  const before = wp(ctx.skinBone(m.root, 'LeftFoot')).z; ctx.glbPose(m.anims[0], 0.26); m.root.updateMatrixWorld(true);
  assert.ok(Math.abs(wp(ctx.skinBone(m.root, 'LeftFoot')).z - before) > 0.1, f + ': sampling the clip moves the bones');
}
{ // an existing rigid model reads exactly as before: no bones, no skinned meshes, no clips
  const m = load('operator_vern_rig.glb'); let sk = 0, bn = 0, ms = 0; m.root.traverse(o => { if (o.isSkinnedMesh) sk++; if (o.isBone) bn++; if (o.isMesh) ms++; });
  assert.ok(ms > 20 && sk === 0 && bn === 0 && m.anims.length === 0, 'a rigid model is untouched by the skinning support (' + ms + ' meshes)');
}

// ---------------------------------------------------------------- posing
const npc = () => { const g = new T.Group(), body = new T.Group(); body.add(new T.Mesh(new T.BoxGeometry(0.4, 1, 0.3))); g.add(body); return g; };
const pose = (f, cfg) => { const g = npc(), m = load(f), R = ctx.skinnedNpc({ g }, cfg, m); g.updateMatrixWorld(true); return { g, m, R, B: n => wp(ctx.skinBone(m.root, n)), bb: ctx.skinBox(R) }; };
{ // Vern: standing, feet on the floor, arms down at his sides, facing the way the box avatars face (-Z)
  const { g, R, B, bb } = pose(MALE, { h: 1.78, pose: 'stand', colors: { clothing: 0x665e48 } });
  assert.ok(Math.abs(bb.max.y - bb.min.y - 1.78) < 0.01 && Math.abs(bb.min.y) < 0.01, 'standing: 1.78 m tall, feet on the floor (' + bb.min.y.toFixed(3) + '..' + bb.max.y.toFixed(3) + ')');
  for (const s of ['Left', 'Right']) { const h = B(s + 'Hand'), hip = B(s + 'UpLeg');
    assert.ok(h.y < hip.y + 0.1 && h.y > 0.6, s + ' hand hangs at the hip, not out in a T (' + h.y.toFixed(2) + ' m)');
    assert.ok(Math.abs(h.x) > Math.abs(hip.x) + 0.08, s + ' hand clear of the body, at its own side'); }
  assert.ok(B('LeftToeBase').z < B('LeftFoot').z, 'faces -Z, like the box avatar it replaces');
  assert.equal(g.children[0].visible, false, 'the box body is hidden'); assert.ok(g.children.includes(R), 'and the model is in its place');
}
for (const [f, h, who] of [[MALE, 1.78, 'Rick'], [FEMALE, 1.65, 'Brenda / Tammy']]) { // seated on the 0.47 m chair
  const { B, bb, R, m } = pose(f, { h, pose: 'sit', colors: { clothing: 0x3b6fb0 } }), P = ctx.SKIN_POSE;
  const hip = B('LeftUpLeg').add(B('RightUpLeg')).multiplyScalar(0.5), v = new T.Vector3(); let low = Infinity;
  m.root.traverse(o => { if (o.isSkinnedMesh) for (let i = 0; i < o.geometry.attributes.position.count; i++) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); if (Math.hypot(v.x - hip.x, v.z - hip.z) < 0.16) low = Math.min(low, v.y); } });
  assert.ok(Math.abs(low - P.seatTop) < 0.01, who + ': sits ON the seat (underside ' + low.toFixed(3) + ' m)');
  for (const s of ['Left', 'Right']) {
    const k = B(s + 'Leg'), a = B(s + 'Foot');
    assert.ok(Math.abs(a.y - P.ankle) < 0.02, who + ': ' + s + ' ankle just above the floor (' + a.y.toFixed(3) + ' m)');
    assert.ok(k.y < 0.94 && k.y > P.seatTop, who + ': ' + s + ' knee under a 0.94 m desk top, above the seat (' + k.y.toFixed(2) + ' m)');
    assert.ok(k.z < hip.z - 0.25 && a.z < hip.z - 0.25, who + ': knees and feet out in front');
  }
  assert.ok(bb.min.y > -0.05, who + ': nothing sinks into the floor (' + bb.min.y.toFixed(3) + ')');
  assert.ok(B('Head').y > 1.0 && B('Head').y < h, who + ': head where a seated person\'s is (' + B('Head').y.toFixed(2) + ' m)');
}
{ // colours: each NPC its own material, never recolouring another
  const a = pose(FEMALE, { h: 1.65, pose: 'sit', colors: { clothing: 0x8a5a9e, hair: 0x5a3a22 } }), b = pose(FEMALE, { h: 1.65, pose: 'sit', colors: { clothing: 0x4f8f5a, hair: 0xc9a25a } });
  const mat = (r, n) => { let x = null; r.m.root.traverse(o => { if (!x && o.isMesh && o.material.name === n) x = o.material; }); return x; };
  assert.equal(mat(a, 'clothing').color.getHex(), 0x8a5a9e); assert.equal(mat(b, 'clothing').color.getHex(), 0x4f8f5a);
  assert.equal(mat(a, 'hair').color.getHex(), 0x5a3a22); assert.equal(mat(b, 'hair').color.getHex(), 0xc9a25a);
  assert.notEqual(mat(a, 'clothing'), mat(b, 'clothing'), 'Brenda and Tammy do not share a material');
  let shadows = 0; a.m.root.traverse(o => { if (o.isMesh && o.castShadow) shadows++; }); assert.equal(shadows, 0, 'no shadow casting (NPCs stand still: their shadow would be an extra pass per part)');
}

// ---------------------------------------------------------------- wiring, files, credits
const table = cut('const NPC_MODELS = {', '};');
for (const [id, file, p] of [['vern', 'NPC_MALE', 'stand'], ['op', 'NPC_MALE', 'sit'], ['brenda', 'NPC_FEMALE', 'sit'], ['tammy', 'NPC_FEMALE', 'sit']]) {
  const line = table.split('\n').find(l => l.trim().startsWith(id + ':')); assert.ok(line, id + ' is in NPC_MODELS');
  assert.ok(line.includes('url: ' + file) && line.includes('skin: true') && line.includes("pose: '" + p + "'"), id + ' wears ' + file + ', ' + p);
}
assert.ok(html.includes("const NPC_MALE = '/corn-souls/assets/models/" + MALE + "', NPC_FEMALE = '/corn-souls/assets/models/" + FEMALE + "';"), 'the two model paths');
assert.ok(html.includes("  if (cfg.skin) return loadGlbModel(cfg.url, m => skinnedNpc(npc, cfg, m), 'npc:' + id);"), 'loadCharacter hands a skinned model to skinnedNpc');
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8')), credits = fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8');
for (const [id, file, title] of [['sketchfab-loves-art-low-poly-male', MALE, 'Low Poly Male'], ['sketchfab-loves-art-low-poly-female', FEMALE, 'Low Poly Female']]) {
  const e = reg.assets.find(a => a.id === id); assert.ok(e, id + ' registered');
  assert.equal(e.status, 'in-use', id + ' is in-use'); assert.equal(e.license_name, 'CC BY 4.0');
  assert.ok(e.files.includes('assets/models/' + file) && fs.existsSync(path.join(MODELS, file)), id + ': its file is in the repo');
  assert.ok(credits.includes(title) && credits.includes(e.source_url) && credits.includes('Loves_Art'), title + ' is credited in CREDITS.md');
}
console.log('the NPCs wear the Loves_Art skinned models, standing and seated: ok');
