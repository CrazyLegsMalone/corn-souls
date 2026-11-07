// Run from the test/ directory: node validate-critter-models.cjs
// Guards TEST v1.97.51: micaelsampaio's Low Poly Animals (Frog, Frogglet, Crow, Fish + the fly), CC BY 4.0, split one rigged
// animal per file. Six pond frogs (four colourings) kick on the hop and gape on the croak; the frogglet is the lizard, flat on the
// floor or belly-to-the-wall while it climbs; pigeons are down to six; fish leap out of the ponds and land back in them; flies
// buzz over carcasses. Runs the game's own reader and pose code on the real files.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), shell = fs.readFileSync('index.html', 'utf8');
const reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8')), credits = fs.readFileSync('../CREDITS.md', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE, T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const DIR = path.join('..', 'assets', 'models', 'critters');
// ---- the files
const SIZE = { frog1: 0.16, frog2: 0.16, frog3: 0.16, frog4: 0.16, frogglet: 0.3, fish: 0.45, fly: 0.03, crow: 1.27 };
for (const k in SIZE) {
  const b = fs.readFileSync(path.join(DIR, k + '.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.equal(b.readUInt32LE(8), b.length, k + ' whole GLB');
  assert.match(d.asset.extras.author, /micaelsampaio/); assert.match(d.asset.extras.license, /CC-BY-4\.0/);
  assert.equal(d.skins.length, 1, k + ' keeps its skeleton'); assert.ok(b.length < 150000, k + ' small');
  assert.ok(reg.assets.some(a => a.status === 'in-use' && a.creator === 'micaelsampaio' && a.files.includes('assets/models/critters/' + k + '.glb')), k + ' registered');
  assert.ok(credits.includes('`assets/models/critters/' + k + '.glb`'), k + ' credited');
}
assert.ok(credits.includes('**micaelsampaio**'), 'creator named in CREDITS.md');
// ---- the reader + the lizard pose on the real frogglet
const ctx = { T, console, TextDecoder, performance: { now: () => 0 }, critters: null, Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } };
vm.createContext(ctx);
vm.runInContext([cut('const GLB_CT = {', 'function loadGlbModel('), cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {'), cut('const CAX = {', 'const RAT_GLB'),
  cut('const LZ_Q = ', '// v1.97.92: one ground probe')].join('\n') + '\nthis.glbBuild = glbBuild; this.critRig = critRig; this.lizPose = lizPose; this.set = c => { critters = c; };', ctx);
const load = k => { const b = fs.readFileSync(path.join(DIR, k + '.glb')); return ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)).root; };
const root = load('frogglet'), g = new T.Group(), pivot = new T.Group(); pivot.add(root); g.add(pivot);
g.userData.liz = { pivot, rig: ctx.critRig(root, ['spine', 'head', 'tail1', 'tail2', 'left_arm', 'right_arm', 'left_leg', 'right_leg']), last: g.position.clone(), h: [1, 0], ph: 0 };
assert.ok(g.userData.liz.rig.b.tail1 && g.userData.liz.rig.b.tail2, 'frogglet has its two tail bones');
const c = { g, state: 'climb' }; ctx.set([c]);
g.rotation.y = Math.PI / 2;   // wall facing +x (normal +x)
g.position.set(0, 1, 0); g.updateMatrixWorld(true); g.userData.liz.last.copy(g.position); g.position.y += 0.02; ctx.lizPose(0.04);   // crawling up
g.updateMatrixWorld(true);
const up = new T.Vector3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(new T.Quaternion())), head = new T.Vector3(0, 0, 1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
assert.ok(up.x > 0.95, 'on the wall its back faces out of the wall (' + up.toArray().map(v => v.toFixed(2)) + ')');
assert.ok(head.y > 0.95, 'and its head points the way it climbs (up)');
c.state = 'run'; g.userData.liz.last.copy(g.position); g.position.z += 0.02; ctx.lizPose(0.04); g.updateMatrixWorld(true);
const up2 = new T.Vector3(0, 1, 0).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
assert.ok(up2.y > 0.95, 'on the floor it lies flat, back up');
const q0 = g.userData.liz.rig.b.tail1.quaternion.clone(); g.userData.liz.last.copy(g.position); g.position.z += 0.03; ctx.lizPose(0.05);
assert.ok(g.userData.liz.rig.b.tail1.quaternion.angleTo(q0) > 0.01, 'the tail swings as it runs');
// ---- frogs: six, in the TEST shell's frog engine, with the models
const frogSrc = JSON.parse(shell.match(/const frogEngine=("(?:[^"\\]|\\.)*");/)[1]);
assert.ok(frogSrc.includes('const POND_FROG_N=6,') && frogSrc.includes('for(let i=0;i<POND_FROG_N;i++){'), 'six pond frogs');
assert.ok(frogSrc.includes("critModel('frog'+(i%4+1),root=>pondFrogDress(frog,body,root))"), 'wearing the four frog models');
assert.ok(frogSrc.includes("rigTurn(R,'mouth',CAX.x,POND_FROG_GAPE") && frogSrc.includes("rigTurn(R,'right_left',CAX.x,POND_FROG_KICK*j)"), 'gape on the croak, kick on the hop');
// ---- pigeons, steps
assert.ok(html.includes('birds = Array.from({ length: 6 }, () => { const b = makeBird();'), 'six pigeons');
assert.ok(html.includes("stepSafe('fish', () => fishStep(dt)); stepSafe('flies', () => fliesStep(dt)); stepSafe('lizPose', () => lizPose(dt));"), 'fish, flies and the lizard pose are stepped');
// ---- fish: every leap starts and ends in open water
{
  const P = [[-603, 429], [-451, 309]]; P.phi = Math.atan(0.756); P.half = 67.4; P.water = -0.35;
  const fx = { T, Math, console, PONDS: P, walk: { on: true, x: -603, z: 429 }, wfxSplash() {}, wfxRing() {}, tsnd: {}, rigRest() {}, rigTurn() {}, CAX: {}, document: undefined };
  vm.createContext(fx);
  vm.runInContext(cut('const FISH = {', '// ---------- FLIES') + cut('function inPond(x, z, half)', '\n') + '\nthis.FISH = FISH; this.fishStep = fishStep; this.inPond = inPond;', fx);
  for (let i = 0; i < 4; i++) fx.FISH.list.push({ pond: i % 2, g: new T.Group(), rig: {}, t: 0, k: -1 });
  let leaps = 0, maxY = -9;
  for (let n = 0; n < 4000; n++) { const was = fx.FISH.list.map(f => f.k); fx.fishStep(0.05); fx.FISH.list.forEach((f, i) => { if (was[i] < 0 && f.k >= 0) leaps++; if (f.k >= 0) { maxY = Math.max(maxY, f.g.position.y); assert.ok(fx.inPond(f.g.position.x, f.g.position.z), 'a leaping fish stays over its pond'); } }); }
  for (const f of fx.FISH.list) if (f.k < 0) assert.equal(f.g.visible, false, 'out of sight between leaps');
  assert.ok(leaps > 10, 'they keep leaping (' + leaps + ' in 200 s)'); assert.ok(maxY > 0.2 && maxY < 1.4, 'clear of the water, up to ' + maxY.toFixed(2) + ' m');
}
assert.ok(html.includes("critModel('fly', root =>") && html.includes('function flyTargets()'), 'flies over carcasses');
assert.ok(html.includes("if (rd.taken") === false && html.includes('for (const rd of bodies) if (!rd.taken'), 'a body the crow took has no flies');
console.log('PASS: rigged critters (micaelsampaio, CC BY 4.0): six frogs on the models, frogglet lizard flat on floor and wall with a swinging tail, six pigeons, fish leaping in the ponds, flies over carcasses');
