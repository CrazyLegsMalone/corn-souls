// Run from the test/ directory: node validate-vulture.cjs
// The bird on the RTO stack (the VULT perch / fly-down / grab / carry-to-the-pond / return state machine) is micaelsampaio's crow
// since v1.97.51 (owner: "replace vulture with the crow"), drawn at the old vulture's size. This suite reads crow.glb with the
// game's own reader and runs the game's own crowPose() on it: the wings fold back on the perch, beat in flight (mirrored), half
// open for the grab, the head throws up on every caw - and the wiring that puts it on the stack.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE;
const T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
const src = [cut('const GLB_CT = {', 'function loadGlbModel('), cut('// ---------- SKINNED NPCs', 'function loadNpcModels() {'),
  cut('const CAX = {', 'const RAT_GLB'), cut('function crowPose(', 'function vultureInit(')].join('\n');
const ctx = { T, console, TextDecoder, performance: { now: () => 0 }, VULT: {}, Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.glbBuild = glbBuild; this.critRig = critRig; this.crowPose = crowPose; this.skinBox = skinBox;', ctx);

const b = fs.readFileSync(path.join('..', 'assets', 'models', 'critters', 'crow.glb'));
const doc = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
assert.match(doc.asset.extras.author, /micaelsampaio/); assert.match(doc.asset.extras.license, /CC-BY-4\.0/);
assert.equal(doc.skins.length, 1, 'one skeleton');
const { root } = ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
const V = ctx.VULT; V.joints = ctx.critRig(root, ['spine1', 'spine2', 'head', 'right_wing', 'left_wing', 'right_leg', 'left_leg']);
for (const k of ['head', 'right_wing', 'left_wing', 'right_leg', 'left_leg']) assert.ok(V.joints.b[k], 'crow has ' + k);
const span = () => { const bb = ctx.skinBox(root); return [bb.max.x - bb.min.x, bb.max.y, bb.min.y]; };
const bind = span(); assert.ok(Math.abs(bind[0] - 2.19) < 0.05, 'spread wings span ' + bind[0].toFixed(2) + ' m (the old vulture was 2.35)');
Object.assign(V, { state: 'perch', flapT: 0, jawT: 0 }); ctx.crowPose(0);
const fold = span(); assert.ok(fold[0] < bind[0] * 0.6, 'perched, the wings fold back to ' + fold[0].toFixed(2) + ' m across');
V.state = 'carry'; V.flapT = 0.5; ctx.crowPose(0); const up = span();
V.flapT = 1.5; ctx.crowPose(0); const down = span();
assert.ok(up[1] - down[1] > 0.3, 'the wing beat lifts the tips ' + (up[1] - down[1]).toFixed(2) + ' m');
assert.ok(down[0] > up[0] + 0.5, 'and sweeps them out wide on the downstroke (' + up[0].toFixed(2) + ' -> ' + down[0].toFixed(2) + ' m)');
const qR = V.joints.b.right_wing.quaternion, qL = V.joints.b.left_wing.quaternion;
assert.ok(Math.abs(qR.w - qL.w) < 0.05, 'the two wings mirror');
V.state = 'grab'; ctx.crowPose(0); const grab = span(); assert.ok(grab[0] < bind[0] && grab[0] > fold[0], 'grabbing: half open (' + grab[0].toFixed(2) + ' m)');
V.state = 'perch'; V.jawT = 0; ctx.crowPose(0); const h0 = V.joints.b.head.quaternion.clone();
V.jawT = 0.45; ctx.crowPose(0); assert.ok(V.joints.b.head.quaternion.angleTo(h0) > 0.3, 'a caw throws the head up');

// ---------------------------------------------------------------- the wiring
assert.ok(html.includes("critModel('crow', root => {"), 'the crow model');
assert.ok(html.includes('const CROW_SCALE = 1.0;'), 'at the old vulture size');
assert.ok(html.includes('  if (V.rig) crowPose(dt);'), 'posed every frame');
assert.ok(html.includes('if (VULT.sprite) VULT.sprite.visible = false'), 'the drawn fallback hides only once the model is in');
assert.ok(html.includes('VULT.perch = V3(S.x + 0.3, S.y + 0.45, S.z + 0.5)'), 'still perched on the RTO stack lip');
assert.ok(html.includes('Math.atan2(V.vel.x, V.vel.z)'), 'faces its heading in flight');
assert.ok(html.includes("if (kind === 'hiss') VULT.jawT = 0.45"), 'every caw throws the head');
assert.ok(html.includes("if (kind === 'hiss') {   // v1.97.51: the crow caws"), 'and it caws');
assert.ok(html.includes("const rate = V.state === 'carry' ? 7"), 'the wing beat keeps its carrying / climbing / gliding rates');
for (const st of ['perch', 'toBody', 'grab', 'carry', 'return']) assert.ok(html.includes("V.state = '" + st + "'"), 'the ' + st + ' state survives');
assert.ok(!html.includes('vulture_rig.glb'), 'the vulture model is no longer loaded');
console.log('PASS: the crow on the RTO stack (micaelsampaio, CC BY 4.0, 2.19 m wings): folds on the perch, mirrored wing beat, half open to grab, caws');
