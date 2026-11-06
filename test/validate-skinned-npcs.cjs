// Run from the test/ directory: node validate-skinned-npcs.cjs
// v1.97.177, owner: "lets tryt he models as is at first" (the NPCs). Vern, Rick, Brenda and Tammy wear Loves_Art's Low Poly Male /
// Low Poly Female (CC BY 4.0): skinned meshes on a Mixamo-style skeleton. The game's own glTF reader had no skinning at all, so
// this runs it for real on both files, then the game's own skinnedNpc() posing - standing and seated - and measures the result.
// v1.97.180: Brenda wears the owner's Crew Wardrobe build (brenda_2_0.glb) instead: 16 skins rather than 1, plus four rigid
// accessories parented to bones, so the reader is exercised for multi-skin files and the seated checks run on her too.
// v1.97.182: Tammy gets hers too (tammy_2_0.glb: 15 skins, six rigid accessories, 21 parts).
// v1.97.184: Vern and Rick get theirs (vern_2_0 / rick_2_0: 14 skins each, four/five rigid accessories). With that, all four NPCs
// wear their own wardrobe builds - the plain male and female files stay as the base files the builds were made from, and are still
// read here and still credited - and the recolour machinery is exercised only by the base male, since no NPC is repainted in game.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE;
const T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });   // no DOM images in node (Brenda's build has two embedded maps)
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const reader = cut('const GLB_CT = {', 'function loadGlbModel('), npcSrc = cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {');
const ctx = { T, console, TextDecoder, Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } }; vm.createContext(ctx);
vm.runInContext(reader + '\n' + npcSrc + '\nthis.glbBuild = glbBuild; this.glbPose = glbPose; this.skinnedNpc = skinnedNpc; this.skinBone = skinBone; this.skinBox = skinBox; this.SKIN_POSE = SKIN_POSE;', ctx);
const MODELS = path.join('..', 'assets', 'models'), load = f => { const b = fs.readFileSync(path.join(MODELS, f)); return ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const wp = o => o.getWorldPosition(new T.Vector3());
const MALE = 'low_poly_male_loves_art.glb', FEMALE = 'low_poly_female_loves_art.glb', BRENDA = 'brenda_2_0.glb', TAMMY = 'tammy_2_0.glb', RICK = 'rick_2_0.glb', VERN = 'vern_2_0.glb';

// ---------------------------------------------------------------- the reader: skins and clips
for (const [f, meshes, bones, skins, clipChannels] of [[MALE, 10, 66, 1, true], [FEMALE, 11, 71, 1, true], [BRENDA, 16, 71, 16, false], [TAMMY, 15, 71, 15, false], [RICK, 14, 66, 14, false], [VERN, 14, 66, 14, false]]) {
  const m = load(f), sk = []; m.root.traverse(o => { if (o.isSkinnedMesh) sk.push(o); });
  assert.equal(sk.length, meshes, f + ': ' + meshes + ' skinned parts (' + sk.length + ')');
  const skels = new Set(sk.map(o => o.skeleton));
  assert.equal(skels.size, skins, f + ': ' + skins + ' skeleton(s) (' + skels.size + ')');
  if (skins === 1) assert.ok(sk.every(o => o.skeleton === sk[0].skeleton), f + ': one skeleton shared by every part');
  assert.ok([...skels].every(s => s.bones.length === bones), f + ': ' + bones + ' joints each');
  assert.ok([...skels].every(s => s.bones.every(b => b.isBone)), f + ': joints are bones');
  assert.ok(sk.every(o => o.geometry.attributes.skinIndex && o.geometry.attributes.skinWeight), f + ': joint indices and weights read');
  assert.equal(m.anims.length, 1); assert.equal(m.anims[0].name, 'walking', f + ': its walk clip is read');
  if (clipChannels) {
    const before = wp(ctx.skinBone(m.root, 'LeftFoot')).z; ctx.glbPose(m.anims[0], 0.26); m.root.updateMatrixWorld(true);
    assert.ok(Math.abs(wp(ctx.skinBone(m.root, 'LeftFoot')).z - before) > 0.1, f + ': sampling the clip moves the bones');
  } else {   // Brenda's wardrobe export carries the clip but no channels in it
    assert.equal(m.anims[0].channels.length, 0, f + ': the wardrobe export left its walk clip empty, so there is nothing to sample (the NPCs never play one)');
  }
}
{ // v1.97.180/182/184: the wardrobe builds are not shaped like the plain files - many skins, plus rigid accessories hung on
  // bones that have to follow them (spectacles, earrings, hats, a hair tie, a beard). All four are checked the same way.
  for (const [f, who, parts, rigidCount, named, tri] of [
    [BRENDA, 'Brenda', 20, 4, ['hair_tie', 'glasses', 'earrings'], [7000, 9000]],
    [TAMMY, 'Tammy', 21, 6, ['bun', 'hair_tie', 'glasses', 'earrings'], [7000, 7400]],
    [RICK, 'Rick', 19, 5, ['cowboy_hat', 'hat_band', 'glasses', 'lens'], [6400, 7000]],
    [VERN, 'Vern', 18, 4, ['beard', 'hard_hat', 'glasses', 'safety_lens'], [5700, 6300]]]) {
    const m = load(f), byName = new Map(), rigid = []; let drawn = 0, tris = 0;
    m.root.traverse(o => { if (o.name) byName.set(o.name, o); if (o.isMesh) { drawn++; const g = o.geometry; tris += Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3); if (!o.isSkinnedMesh) rigid.push(o); } });
    assert.equal(drawn, parts, who + ': ' + (parts - rigidCount) + ' skinned parts + ' + rigidCount + ' accessory meshes (' + drawn + ')');
    assert.equal(rigid.length, rigidCount, who + ': ' + rigidCount + ' of them are plain (unskinned) meshes');
    for (const o of rigid) {
      let a = o.parent, onBone = false; while (a) { if (a.isBone) { onBone = true; break; } a = a.parent; }
      assert.ok(onBone, who + ': every accessory hangs off a bone, so it rides the head or the wrist with the skeleton underneath');
    }
    for (const n of named) assert.ok(byName.has(n), who + ': ' + n + ' is in the file (the rest are unnamed in the export)');
    assert.ok(tris > tri[0] && tris < tri[1], who + ': ' + tris + ' triangles');
  }
}
{ // an existing rigid model reads exactly as before: no bones, no skinned meshes, no clips
  const m = load('operator_vern_rig.glb'); let sk = 0, bn = 0, ms = 0; m.root.traverse(o => { if (o.isSkinnedMesh) sk++; if (o.isBone) bn++; if (o.isMesh) ms++; });
  assert.ok(ms > 20 && sk === 0 && bn === 0 && m.anims.length === 0, 'a rigid model is untouched by the skinning support (' + ms + ' meshes)');
}

// ---------------------------------------------------------------- posing
const npc = () => { const g = new T.Group(), body = new T.Group(); body.add(new T.Mesh(new T.BoxGeometry(0.4, 1, 0.3))); g.add(body); return g; };
const pose = (f, cfg) => { const g = npc(), m = load(f), R = ctx.skinnedNpc({ g }, cfg, m); g.updateMatrixWorld(true); return { g, m, R, B: n => wp(ctx.skinBone(m.root, n)), bb: ctx.skinBox(R) }; };
{ // Vern: standing, feet on the floor, arms down at his sides, facing the way the box avatars face (-Z)
  const { g, R, B, bb } = pose(VERN, { h: 1.78, pose: 'stand' });
  assert.ok(Math.abs(bb.max.y - bb.min.y - 1.78) < 0.01 && Math.abs(bb.min.y) < 0.01, 'standing: 1.78 m tall, feet on the floor (' + bb.min.y.toFixed(3) + '..' + bb.max.y.toFixed(3) + ')');
  for (const s of ['Left', 'Right']) { const h = B(s + 'Hand'), hip = B(s + 'UpLeg');
    assert.ok(h.y < hip.y + 0.1 && h.y > 0.6, s + ' hand hangs at the hip, not out in a T (' + h.y.toFixed(2) + ' m)');
    assert.ok(Math.abs(h.x) > Math.abs(hip.x) + 0.08, s + ' hand clear of the body, at its own side'); }
  assert.ok(B('LeftToeBase').z < B('LeftFoot').z, 'faces -Z, like the box avatar it replaces');
  assert.equal(g.children[0].visible, false, 'the box body is hidden'); assert.ok(g.children.includes(R), 'and the model is in its place');
}
for (const [f, h, who] of [[RICK, 1.78, 'Rick'], [BRENDA, 1.65, 'Brenda'], [TAMMY, 1.65, 'Tammy']]) { // seated on the 0.47 m chair
  const { B, bb, R, m } = pose(f, { h, pose: 'sit' }), P = ctx.SKIN_POSE;
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
{ // colours: no NPC is recoloured in game (all four wear their wardrobe colours from the files); the recolour machinery in
  // skinnedNpc() still works and is checked on the base male so it cannot silently rot while nobody uses it.
  const mat = (r, n) => { let x = null; r.m.root.traverse(o => { if (!x && o.isMesh && o.material.name === n) x = o.material; }); return x; };
  const a = pose(MALE, { h: 1.78, pose: 'sit', colors: { clothing: 0x665e48 } }), b = pose(MALE, { h: 1.78, pose: 'sit', colors: { clothing: 0x3b6fb0 } });
  assert.equal(mat(a, 'clothing').color.getHex(), 0x665e48); assert.equal(mat(b, 'clothing').color.getHex(), 0x3b6fb0);
  assert.notEqual(mat(a, 'clothing'), mat(b, 'clothing'), 'the base male still recolours, each instance on its own material');
  let shadows = 0; a.m.root.traverse(o => { if (o.isMesh && o.castShadow) shadows++; }); assert.equal(shadows, 0, 'no shadow casting (NPCs stand still: their shadow would be an extra pass per part)');
  // the owner's wardrobe colours, straight out of the files: nothing the game does may change them. Brenda and Rick share the same
  // green top (#3e6b45) in different files; Tammy's is navy; Vern's top and trousers are textured, so there is no flat colour to pin.
  for (const [f, who, hex] of [[BRENDA, 'Brenda', 0x3e6b45], [TAMMY, 'Tammy', 0x1f3552], [RICK, 'Rick', 0x3e6b45]]) {
    const file = load(f), r = pose(f, { h: who === 'Rick' ? 1.78 : 1.65, pose: 'sit', colors: { clothing: 0x8a5a9e } });
    assert.equal(mat({ m: file }, 'top').color.getHex(), hex, who + ': the file itself carries the wardrobe colour');
    assert.equal(mat(r, 'top').color.getHex(), hex, who + ': and posing leaves it alone');
  }
  { const file = load(VERN), r = pose(VERN, { h: 1.78, pose: 'stand', colors: { clothing: 0x8a5a9e } });
    assert.ok(mat({ m: file }, 'top').map && mat(r, 'top').map, 'Vern: his top is textured, so nothing can recolour it'); }
}

// ---------------------------------------------------------------- wiring, files, credits
const table = cut('const NPC_MODELS = {', '};');
for (const [id, file, p] of [['vern', 'NPC_VERN', 'stand'], ['op', 'NPC_RICK', 'sit'], ['brenda', 'NPC_BRENDA', 'sit'], ['tammy', 'NPC_TAMMY', 'sit']]) {
  const line = table.split('\n').find(l => l.trim().startsWith(id + ':')); assert.ok(line, id + ' is in NPC_MODELS');
  assert.ok(line.includes('url: ' + file) && line.includes('skin: true') && line.includes("pose: '" + p + "'"), id + ' wears ' + file + ', ' + p);
}
for (const [name, file] of [['NPC_VERN', VERN], ['NPC_RICK', RICK], ['NPC_BRENDA', BRENDA], ['NPC_TAMMY', TAMMY]])
  assert.ok(html.includes("const " + name + " = '/corn-souls/assets/models/" + file + "';"), name + ' points at ' + file);
assert.ok(!html.includes('NPC_MALE') && !html.includes('NPC_FEMALE'), 'the plain male and female are no longer wired anywhere: all four NPCs wear their own builds');
assert.ok(!/colors:/.test(table), 'no NPC is repainted in game: every wardrobe colour is in its own file');
assert.ok(/brenda:\s*\{[^}]*dy: 0.1524/.test(table) && /tammy:\s*\{[^}]*dy: 0.1524/.test(table), 'Brenda and Tammy sit 6 inches (0.1524 m) higher');
assert.ok(!/vern:\s*\{[^}]*dy:/.test(table) && !/op:\s*\{[^}]*dy:/.test(table), 'Vern and Rick are not moved');
assert.ok(html.includes("  if (cfg.skin) return loadGlbModel(cfg.url, m => skinnedNpc(npc, cfg, m), 'npc:' + id);"), 'loadCharacter hands a skinned model to skinnedNpc');
const reg = JSON.parse(fs.readFileSync(path.join('..', 'assets', 'registry.json'), 'utf8')), credits = fs.readFileSync(path.join('..', 'CREDITS.md'), 'utf8');
for (const [id, file, title] of [['sketchfab-loves-art-low-poly-male', MALE, 'Low Poly Male'], ['sketchfab-loves-art-low-poly-female', FEMALE, 'Low Poly Female'], ['sketchfab-loves-art-low-poly-female-brenda-2-0', BRENDA, 'Low Poly Female — Brenda 2.0'], ['sketchfab-loves-art-low-poly-female-tammy-2-0', TAMMY, 'Low Poly Female — Tammy 2.0'], ['sketchfab-loves-art-low-poly-male-rick-2-0', RICK, 'Low Poly Male — Rick 2.0'], ['sketchfab-loves-art-low-poly-male-vern-2-0', VERN, 'Low Poly Male — Vern 2.0']]) {
  const e = reg.assets.find(a => a.id === id); assert.ok(e, id + ' registered');
  assert.equal(e.status, 'in-use', id + ' is in-use'); assert.equal(e.license_name, 'CC BY 4.0');
  assert.ok(e.files.includes('assets/models/' + file) && fs.existsSync(path.join(MODELS, file)), id + ': its file is in the repo');
  assert.ok(credits.includes(title) && credits.includes(e.source_url) && credits.includes('Loves_Art'), title + ' is credited in CREDITS.md');
}
for (const [id, file, who] of [['sketchfab-loves-art-low-poly-female-brenda-2-0', BRENDA, 'Brenda'], ['sketchfab-loves-art-low-poly-female-tammy-2-0', TAMMY, 'Tammy'], ['sketchfab-loves-art-low-poly-male-rick-2-0', RICK, 'Rick'], ['sketchfab-loves-art-low-poly-male-vern-2-0', VERN, 'Vern']]) {
  const e = reg.assets.find(a => a.id === id);
  assert.ok(/modified|recoloured/i.test(e.modifications) && /no endorsement/i.test(e.required_notice), who + '\'s entry says the file was modified and carries the no-endorsement notice');
  assert.ok(credits.includes(file) && /Modifications: recoloured/i.test(credits), 'and CREDITS.md says what was changed and where ' + who + ' wears it');
}
console.log('the NPCs wear the Loves_Art skinned models (all four in their own wardrobe builds), standing and seated: ok');
