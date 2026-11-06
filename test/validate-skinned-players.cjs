// Run from the test/ directory: node validate-skinned-players.cjs
// v1.97.185: the players stop wearing the rigid operator rig. Player 1 wears squeeg1 (male), Player 2 wears squeeg2 (female) -
// the owner's Crew Wardrobe builds of Loves_Art's Low Poly Male / Female (CC BY 4.0), posed standing (arms down, feet on the floor)
// with no walk cycle yet. This pins the two files, the wiring, and the credits; validate-power-outage-machines.cjs runs the actual
// dressPlayerSkin() posing in a vm.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const S1 = 'squeeg1_2_0.glb', S2 = 'squeeg2_2_0.glb';
function glbJson(f) {
  const b = fs.readFileSync(path.join(root, 'assets/models', f));
  assert.equal(b.toString('latin1', 0, 4), 'glTF'); assert.equal(b.readUInt32LE(4), 2); assert.equal(b.readUInt32LE(8), b.length, f + ' is a whole GLB');
  return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
}
for (const [f, joints, skinned, rigid, tri] of [[S1, 66, 15, 1, [6000, 6400]], [S2, 71, 15, 3, [7300, 7700]]]) {
  const d = glbJson(f);
  assert.ok(d.skins.every(s => s.joints.length === joints), f + ': ' + joints + ' joints per skin, ' + d.skins.length + ' skins');
  const nodes = d.nodes, sk = nodes.filter(n => 'mesh' in n && 'skin' in n), rg = nodes.filter(n => 'mesh' in n && !('skin' in n));
  assert.equal(sk.length, skinned, f + ': ' + skinned + ' skinned parts'); assert.equal(rg.length, rigid, f + ': ' + rigid + ' rigid accessory/accessories');
  let tris = 0; for (const m of d.meshes) for (const pr of m.primitives) { const i = pr.indices; tris += (i === undefined ? d.accessors[pr.attributes.POSITION].count : d.accessors[i].count) / 3; }
  assert.ok(tris > tri[0] && tris < tri[1], f + ': ' + tris + ' triangles');
  assert.equal(d.animations.length, 1); assert.equal(d.animations[0].channels.length, 0, f + ': empty walk clip');
  const parent = {}; nodes.forEach((n, k) => (n.children || []).forEach(c => parent[c] = k));
  for (let i = 0; i < nodes.length; i++) {   // every rigid accessory rides a bone
    if (!('mesh' in nodes[i]) || ('skin' in nodes[i])) continue;
    let j = i, ok = false; while (j !== undefined) { if (nodes[j].name && nodes[j].name.startsWith('mixamorig:')) { ok = true; break; } j = parent[j]; }
    assert.ok(ok, f + ': accessory node ' + i + ' hangs off a bone');
  }
}
// wiring
assert.ok(html.includes("const PLAYER_SKIN = {") && html.includes("url: ['/corn-souls/assets/models/squeeg1_2_0.glb', '/corn-souls/assets/models/squeeg2_2_0.glb']") && html.includes('h: [1.78, 1.65]'), 'P1 wears squeeg1 at 1.78 m, P2 wears squeeg2 at 1.65 m');
assert.ok(html.includes('slot = vest === VEST_COL[1] ? 1 : 0'), 'the vest colour picks the slot');
assert.equal((html.match(/dressPlayerSkin\(/g) || []).length, 8, 'one definition + seven avatars (the two players, four seated, and the idle Player 2 at the smoking area)');
assert.ok(html.includes('function loadPlayerSkin(slot, cb)') && html.includes('glbBuild(S.bytes[slot])'), 'raw bytes are cached and glbBuild runs per avatar (no skeleton sharing)');
assert.ok(!html.includes('squeeg-model.js') && !html.includes('squeegAvatar'), 'the legacy PSX squeeg-model.js inline is gone');
// v1.97.190: Player 2 waits idle at the smoking area until somebody joins
assert.ok(html.includes('function idlePlayer2()') && html.includes('av.position.set(147, 0, -80)') && html.includes('av.rotation.y = Math.PI / 2'), 'idle Player 2 stands on the smoking pad, facing west toward the plant');
assert.ok(html.includes('dressPlayerSkin(av, VEST_COL[1], {})') && html.includes('O.idleP2 = idlePlayer2();'), 'she wears squeeg2 and is put there at init');
assert.ok(html.includes('if (O.idleP2) O.idleP2.visible = false;') && html.includes('if (O.idleP2) O.idleP2.visible = true;'), 'hidden when Player 2 joins, back when they leave');
// registered and credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')), credits = fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8');
for (const [id, f, title] of [['sketchfab-loves-art-low-poly-male-squeeg1-2-0', S1, 'Low Poly Male — squeeg1 2.0'], ['sketchfab-loves-art-low-poly-female-squeeg2-2-0', S2, 'Low Poly Female — squeeg2 2.0']]) {
  const e = reg.assets.find(a => a.id === id); assert.ok(e, id + ' registered');
  assert.equal(e.status, 'in-use'); assert.equal(e.license_name, 'CC BY 4.0');
  assert.ok(e.files.includes('assets/models/' + f) && /no endorsement/i.test(e.required_notice), f + ' in-use, modified, no endorsement');
  assert.ok(credits.includes(title) && credits.includes(f), title + ' credited');
}
console.log('PASS: the players wear their own wardrobe builds (P1 squeeg1 male 1.78 m, P2 squeeg2 female 1.65 m), posed standing; registered and credited');
