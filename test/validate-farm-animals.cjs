// Run from the test/ directory: node validate-farm-animals.cjs
// Guards TEST v1.97.49: ranaaunhaider12's Low poly animals pack (CC BY 4.0), elephant left out. Cow, sheep, dog and cat are their
// own flat-colour GLBs; a few cows and a flock of sheep stand in open grass well away from the plant, the corn circle and the ponds,
// the dog stands by Vern, and the cat is the shed jump scare (hidden until a shed door first opens with you at it, then it bolts out
// that door, once). Also in this build: grass tufts halved and the buzzard comes for a body after one minute.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8')), credits = fs.readFileSync('../CREDITS.md', 'utf8');
for (const a of ['cow', 'sheep', 'dog', 'cat']) {
  const f = 'assets/models/animals/' + a + '.glb', b = fs.readFileSync('../' + f);
  assert.equal(b.toString('latin1', 0, 4), 'glTF'); assert.equal(b.readUInt32LE(8), b.length, a + ' is a whole GLB');
  const d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.ok(d.meshes[0].primitives[0].attributes.COLOR_0 !== undefined, a + ' keeps its vertex colours');
  assert.match(JSON.stringify(d.asset.extras || {}), /CC-BY-4\.0/, a + ' keeps the pack licence in asset.extras');
  assert.ok(reg.assets.some(r => r.status === 'in-use' && (r.files || []).includes(f) && r.creator === 'ranaaunhaider12' && r.license_name === 'CC BY 4.0'), a + ' registered in-use');
  assert.ok(credits.includes('`' + f + '`'), a + ' credited');
}
assert.ok(!fs.existsSync('../assets/models/animals/elephant.glb'), 'no elephant');
const arr = name => JSON.parse(html.match(new RegExp('const ' + name + ' = (\\[\\[.*?\\]\\]);'))[1]);
const herd = arr('COW_HERD'), flock = arr('SHEEP_FLOCK');
assert.ok(herd.length >= 3 && flock.length >= 4, 'a few cows and a flock of sheep');
const far = ([x, z]) => Math.hypot(x - -675, z - -99) > 344 + 60 && Math.hypot(x - -603, z - 429) > 150 && Math.hypot(x - -451, z - 309) > 150 && Math.hypot(x - 0, z - 30) > 300;
for (const p of herd.concat(flock)) assert.ok(far(p), 'away from the corn circle, the ponds and the plant: ' + p);
const cx = a => [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length], hc = cx(herd), fc = cx(flock);
assert.ok(Math.hypot(hc[0] - fc[0], hc[1] - fc[1]) > 300, 'sheep in a different field from the cows');
assert.ok(/loadSubstation\(\); loadAnimals\(\);/.test(html) && html.includes("stepSafe('animals', () => animalsStep(dt))"), 'loaded and stepped');
assert.ok(html.includes("NPCS.find(n => n.id === 'vern')"), 'the dog stands by Vern');
const step = html.slice(html.indexOf('function animalsStep('), html.indexOf('function animalsStep(') + 2600);
assert.ok(/c\.state === 'hide'/.test(step) && /O\.shedManDoor\.open > 0\.1/.test(step) && /M\.door\.open > 0\.15/.test(step), 'cat waits for either shed door');
assert.ok(/titleEl\.isConnected/.test(step), 'not set off behind the title screen');
assert.ok(/catYowl\(\)/.test(step) && /c\.state = 'gone'/.test(step), 'yowls, runs, and is gone for the session');
assert.ok(html.includes('O.shedManDoor = O.swingDoors[O.swingDoors.length - 1];'), 'the shed man door is known to the cat');
assert.ok(/density: 0\.004125,/.test(html), 'grass tufts halved');
assert.ok(/!rd\.awake && now - rd\.born > 60\)/.test(html), 'buzzard after one minute');
console.log('PASS: farm animals (cows NE, sheep SE across the rails, dog by Vern, shed cat jump scare), grass halved, buzzard at 1 min');
