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
const far = ([x, z]) => Math.hypot(x - -675, z - -99) > 344 + 60 && Math.hypot(x - -603, z - 429) > 150 && Math.hypot(x - -451, z - 309) > 150 && x > 120;   /* v1.97.53: out east of the plant, which ends near x 70 */
for (const p of herd.concat(flock)) assert.ok(far(p), 'away from the corn circle, the ponds and the plant: ' + p);
const cx = a => [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length], hc = cx(herd), fc = cx(flock);
assert.ok(Math.hypot(hc[0] - fc[0], hc[1] - fc[1]) > 250, 'sheep in a different field from the cows');
for (const p of herd.concat(flock)) assert.ok(Math.hypot(p[0] - -30, p[1] - 0) < 420, 'close enough to the plant to come across (v1.97.53: "I don\'t see the sheep or cows"): ' + p);
assert.ok(/loadSubstation\(\); loadAnimals\(\);/.test(html) && html.includes("stepSafe('animals', () => animalsStep(dt))"), 'loaded and stepped');
assert.ok(html.includes('const DOG_SPOT = [-246.5, 5.0, Math.PI / 2];') && !html.includes("NPCS.find(n => n.id === 'vern')"), 'the dog sits west of the rail spur, out of the receiving lanes (v1.97.57: "Move dog it\'s in way of the grain haulers")');
// v1.97.57: "Give cows and sheep collision and sound" - two circles per animal straight away (not after the collider list is built), moos and baas
assert.ok(/function animalModel\(k, x, z, yaw\) \{\n  const a = [^\n]*\n  const B = ANIMAL_BODY\[k\]; if \(B\) for \(const s of \[-1, 1\]\) \{ const c = \[[^\n]*a\.cols\.push\(c\); animalCol\(c\); \}/.test(html), 'colliders go in as the herd is placed');
assert.ok(html.includes("function animalCol(c) { extraCols.push(c); if (typeof colliders !== 'undefined' && colliders) colliders.push(c); }"), 'into the live collider list too');
assert.ok(html.includes("herdCall(HERD.cow.list.map(a => [a.x, a.z]), 'cow')") && html.includes("herdCall(HERD.sheep.list.map(a => [a.x, a.z]), 'sheep')"), 'cows moo, sheep baa, from where they are now');
// v1.97.61: "You can't make skeletons for them?" - cow, sheep and dog are rigged (scripts/rig_animal_glb.py) and alive
const BONES = ['root', 'body', 'neck', 'head', 'tail', 'fl_up', 'fl_low', 'fr_up', 'fr_low', 'bl_up', 'bl_low', 'br_up', 'br_low'];
for (const a of ['cow', 'sheep', 'dog']) {
  const b = fs.readFileSync('../assets/models/animals/' + a + '.glb'), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))), at = d.meshes[0].primitives[0].attributes;
  assert.ok(at.JOINTS_0 !== undefined && at.WEIGHTS_0 !== undefined && d.skins && d.skins.length === 1, a + ' is skinned');
  assert.deepEqual(d.skins[0].joints.map(i => d.nodes[i].name), BONES, a + ' has the 13 bones');
  assert.ok(d.skins[0].joints.every(i => !d.nodes[i].rotation && !d.nodes[i].scale), a + ': bones un-rotated at rest (the game turns them about their own axes)');
  assert.equal(d.accessors[at.JOINTS_0].count, d.accessors[at.POSITION].count); assert.match(d.asset.extras.modifications, /rigged for Corn Souls/);
}
assert.ok(fs.existsSync('../scripts/rig_animal_glb.py'), 'the rigging script is kept');
assert.ok(html.includes('animalCalls(dt); herdStep(dt);') && /if \(pd > 160\) continue; animalThink\(a, H, dt, pd\); animalPose\(a, H, dt, pd\);/.test(html), 'the herd is stepped, near animals only');
assert.ok(/a\.cols\[i\]\[0\] = a\.x \+ Math\.sin\(a\.yaw\) \* B\[0\] \* s;/.test(html), 'colliders follow the animal');
{ // run the wander logic for ten minutes: everyone stays in the pen and they do not walk through each other
  const src = html.slice(html.indexOf('const ANIMAL_BONES ='), html.indexOf('function animalModel(')) + html.slice(html.indexOf('const angWrap ='), html.indexOf('function animalPose('));
  const walk = { x: 1e4, z: 1e4 }, { HERD, animalThink } = new Function('walk', src + '; return { HERD, animalThink };')(walk);
  for (const [k, tab] of [['cow', herd], ['sheep', flock]]) { const H = HERD[k];
    for (const [x, z, yaw] of tab) H.list.push({ k, x, z, yaw, st: H.rest, t: 1 + Math.random() * 5, tx: x, tz: z, ph: 0, v: 0, hd: 0, sit: 0, lk: 0, sw: 0 });
    H.c = cx(tab); let moved = 0, minGap = 99, walked = 0;
    const start = H.list.map(a => [a.x, a.z]);
    for (let i = 0; i < 600 * 30; i++) { for (const a of H.list) { animalThink(a, H, 1 / 30, 1e4); if (a.st === 'walk') walked++; assert.ok(Math.hypot(a.x - H.c[0], a.z - H.c[1]) < H.r + 1.5, k + ' stays in its pen'); }
      for (const a of H.list) for (const o of H.list) if (a !== o) minGap = Math.min(minGap, Math.hypot(a.x - o.x, a.z - o.z)); }
    H.list.forEach((a, i) => { if (Math.hypot(a.x - start[i][0], a.z - start[i][1]) > 1) moved++; assert.ok(Number.isFinite(a.x + a.z + a.yaw + a.ph)); });
    assert.ok(moved >= 2 && walked > 300, k + 's wander (' + moved + ' moved)'); assert.ok(minGap > H.gap * 0.45, k + 's keep apart (closest ' + minGap.toFixed(2) + ' m)');
  }
}
const step = html.slice(html.indexOf('function animalsStep('), html.indexOf('function animalsStep(') + 2600);
assert.ok(/c\.state === 'hide'/.test(step) && /O\.shedManDoor\.open > 0\.1/.test(step) && /M\.door\.open > 0\.15/.test(step), 'cat waits for either shed door');
assert.ok(/titleEl\.isConnected/.test(step), 'not set off behind the title screen');
assert.ok(/catYowl\(\)/.test(step) && /c\.state = 'gone'/.test(step), 'yowls, runs, and is gone for the session');
assert.ok(html.includes('O.shedManDoor = O.swingDoors[O.swingDoors.length - 1];'), 'the shed man door is known to the cat');
assert.ok(/density: 0\.00206,/.test(html), 'grass tufts halved (and halved again in v1.97.64)');
assert.ok(/!rd\.awake && now - rd\.born > 60\)/.test(html), 'buzzard after one minute');
console.log('PASS: farm animals (cows east of the employee lot, sheep south of the diagonal road, dog by the rail spur, colliders, moos and baas, shed cat jump scare), cow / sheep / dog rigged and wandering, grass halved, buzzard at 1 min');
