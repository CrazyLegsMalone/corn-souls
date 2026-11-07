// Run from the test/ directory: node validate-models-3-0.cjs
// Guards TEST v1.97.41: the owner's Corn Souls Crew 2.5 builds ("3.0") for Player 1, Player 2, Tammy and Vern are whole GLBs on
// the Mixamo rig with every finger bone (the first-person hands are baked from the players' own hands), wired in, registered in-use
// and credited to Loves_Art under CC BY 4.0.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8')), credits = fs.readFileSync('../CREDITS.md', 'utf8');
const FILES = { player1_3_0: 'male', player2_3_0: 'female', tammy3_0: 'female', vern3_0: 'male' };
for (const f in FILES) {
  const b = fs.readFileSync('../assets/models/' + f + '.glb');
  assert.equal(b.toString('latin1', 0, 4), 'glTF'); assert.equal(b.readUInt32LE(8), b.length, f + ' is a whole GLB');
  const d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))), names = d.nodes.map(n => n.name || '');
  for (const s of ['Left', 'Right']) for (const bone of ['Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg', 'Foot'].map(x => s + x).concat(['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'].flatMap(k => [1, 2, 3].map(i => s + 'Hand' + k + i))))
    assert.ok(names.some(n => new RegExp('(^|:)' + bone + '(_\\d+)?$').test(n)), f + ' has ' + bone);
  assert.ok(d.skins.length > 0 && d.skins.every(s => s.joints.length >= 66), f + ': skinned on the full skeleton');
  assert.ok(reg.assets.some(a => a.status === 'in-use' && (a.files || []).includes('assets/models/' + f + '.glb') && a.creator === 'Loves_Art' && a.license_name === 'CC BY 4.0'), f + ' registered in-use');
  assert.ok(credits.includes('`assets/models/' + f + '.glb`'), f + ' credited');
}
assert.ok(html.includes("url: ['/corn-souls/assets/models/player1_3_0.glb', '/corn-souls/assets/models/player2_3_0.glb']"), 'players wear them');
assert.ok(html.includes("const NPC_VERN = '/corn-souls/assets/models/vern3_0.glb';") && html.includes("const NPC_TAMMY = '/corn-souls/assets/models/tammy3_0.glb';"), 'Vern and Tammy wear theirs');
console.log('PASS: 3.0 models (player1, player2, Tammy, Vern): whole GLBs on the Mixamo rig with every finger bone, wired in, registered and credited');
