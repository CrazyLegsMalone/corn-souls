// Run from the test/ directory: node validate-fp-arms-hold.cjs
// Guards TEST v1.97.73: the PSX first-person arms hold the shotgun, the tools, the extinguisher and the boom box too (owner: "Psx arms").
// updateFpHands() still places one target per hand where the baked hands went (so a swing, recoil, aiming and the magazine reach
// carry it); fpHoldArm() bends the real rig to it - fingers closed by the grab clips, the hand turned to the target's frame, the
// elbow bent toward a point below, the arm stretched a little and then the shoulder slid forward when the grip is a long way out.
// Runs the game's own GLB reader and the arm code on the real arms.glb with real three.js.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE, T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 40)); return html.slice(i, j); };
// ---- the wiring
const blk = cut('// ---------- THE ARMS HOLD THINGS TOO', 'function makeHand() {');
assert.ok(html.includes("    if (typeof FPH !== 'undefined') FPH.on = false; return;\n  }"), 'no hands up: the hold is off');
assert.ok(html.includes("  const hold = typeof fpHoldReady === 'function' && fpHoldReady();   // v1.97.73: the PSX arms take hold; these targets say where\n  if (typeof FPH !== 'undefined') FPH.on = hold;\n  if (hold) { for (const hand of fpHands) hand.removeFromParent(); [right, left] = FPH.px; }"), 'the baked hands step aside and their targets are placed instead');
assert.ok(html.includes("  const isModel = hold || !!right.userData.model,"), 'targets are placed with the model-hand frame (y along the handle, z up the forearm)');
assert.ok(html.includes("  updateFpHands(fp, e);\n  if (typeof fpHoldStep === 'function') fpHoldStep(dt);   // v1.97.73: bend the PSX arms to where the hands go\n}"), 'bent every frame, after the targets move');
assert.ok(html.includes("if (typeof fpArmsStep === 'function') fpArmsStep(dt, fp && held === 'hand' && !seated && SR.carry !== 'me');"), 'the empty hand still runs its own clips');
assert.ok(/FPA\.prev = 'hold'; FPA\.bl = 0; FPA\.cur = 'relax';/.test(blk), 'putting an item away blends from the hold into relax');
// ---- run it on the real rig
const ctx = { T, console, TextDecoder, performance: { now: () => 0 }, document: {}, PERF: { glb: {} },
  Blob: class { constructor(p) { this.size = p && p[0] ? p[0].length : 0; } }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  VEST_COL: ['a', 'b'], NET: { conn: null, host: true }, fpModelHands: [null, null], buildModelHands() {}, fpTexPixels: () => null, fpLin: x => x,
  FP_MHAND: { elbow: [[0.34, -0.5, -0.05], [-0.45, -0.42, -0.15]] }, held: 'gun', aimWant: false, sgBob: 0, atkStart() {}, netSend() {}, VIEW: {} };
vm.createContext(ctx);
vm.runInContext([cut('const GLB_CT = {', 'function loadGlbModel('), cut('// ---------- FIRST-PERSON ARMS', 'function makeHand() {')].join('\n') +
  '\nthis.glbBuild = glbBuild; this.FPA = FPA; this.FPH = FPH; this.fpHoldReady = fpHoldReady; this.fpHoldStep = fpHoldStep; this.fpArmsStep = fpArmsStep; this.glbPose = glbPose;', ctx);
const b = fs.readFileSync(path.join('..', 'assets', 'models', 'fp', 'arms.glb')), r = ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
const F = ctx.FPA, H = ctx.FPH, hud = new T.Scene(), G = new T.Group();
G.add(r.root); G.rotation.y = Math.PI; G.scale.set(F.k, F.k, 1); hud.add(G);
for (const a of r.anims) F.clips[a.name] = a;
const seen = new Set(); for (const a of r.anims) for (const c of a.channels) if (!seen.has(c.obj)) { seen.add(c.obj); F.bones.push(c.obj); F.snapQ.push(new T.Quaternion()); F.snapP.push(new T.Vector3()); }
Object.assign(F, { r, g: G, state: 'ready', skinSlot: 0 });
assert.equal(ctx.fpHoldReady(), true, 'ready once the rig is in');
assert.ok(H.fist[0].length >= 15 && H.fist[1].length >= 15, 'every finger and thumb bone of both hands has its curl');
// a right-hand target and a left-hand target, in HUD space, framed like updateFpHands() frames them
const by = r.byName, item = new T.Group(); hud.add(item);
const place = (i, pos, u, elbow) => {   // y = u (the handle, toward the thumb), z toward the elbow, as grip() builds it
  const px = H.px[i]; item.add(px); px.position.fromArray(pos);
  const U = new T.Vector3().fromArray(u).normalize(), Fz = new T.Vector3().fromArray(elbow).sub(px.position); Fz.addScaledVector(U, -Fz.dot(U)).normalize();
  px.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(U, Fz), U, Fz));
};
const check = (i, label) => {   // the fist's frame, from the posed bones, against the target
  hud.updateMatrixWorld(true); const s = i ? 'L' : 'R', f = H.frame[i], hm = by['hand_' + s].matrixWorld;
  const at = new T.Vector3().copy(f.o).applyMatrix4(hm), want = H.px[i].getWorldPosition(new T.Vector3());
  // compare in the arms' own space (before the squeeze across the view), where the frame was measured
  const gi = G.matrixWorld.clone().invert(), a2 = at.clone().applyMatrix4(gi), w2 = want.clone().applyMatrix4(gi);
  const y = new T.Vector3(0, 1, 0).applyQuaternion(f.q).transformDirection(new T.Matrix4().multiplyMatrices(gi, hm));
  const yw = new T.Vector3(0, 1, 0).transformDirection(new T.Matrix4().multiplyMatrices(gi, H.px[i].matrixWorld));
  return { d: a2.distanceTo(w2), dot: y.dot(yw), label };
};
// 1. the shotgun at the hip: right fist on the stock, left on the pump - both reached, handles through the fists
item.position.set(0, 0, 0);
place(0, [0.09, -0.17, -0.33], [0, 0.35, -1], [0.3, -0.75, -0.15]);
place(1, [0.07, -0.15, -0.62], [0, 0.1, -1], [-0.3, -0.75, -0.15]);
ctx.FPH.on = true; ctx.fpHoldStep(1 / 30);
for (const c of [check(0, 'stock'), check(1, 'pump')]) {
  assert.ok(c.d < 0.01, c.label + ': the fist lands on its grip (' + c.d.toFixed(4) + ' m off)');
  assert.ok(c.dot > 0.98, c.label + ': the handle runs through it the way the grip faces (' + c.dot.toFixed(3) + ')');
}
assert.equal(G.visible, true, 'the arms are up');
// 2. a long way out (a pole tool held far forward): stretched and the shoulder forward, the hand still on it
const sh0 = by.upper_arm_L.position.clone();
place(1, [0.1, -0.05, -0.85], [0, 1, -0.3], [-0.3, -0.75, -0.15]);
ctx.fpHoldStep(1 / 30); const far = check(1, 'far grip');
assert.ok(far.d < 0.01, 'far out: the hand still reaches (' + far.d.toFixed(4) + ' m)');
assert.ok(by.forearm_L.position.length() > H.rest[1][1].length() * 1.05, 'the arm got longer');
assert.ok(by.upper_arm_L.position.distanceTo(sh0) > 0.01, 'and the shoulder came forward');
assert.ok(by.forearm_L.position.length() <= H.rest[1][1].length() * H.stretch + 1e-6, 'never more than ' + H.stretch + 'x');
// 3. the elbow points down, not across the view
hud.updateMatrixWorld(true);
const elbow = by.forearm_L.getWorldPosition(new T.Vector3()), wrist = by.hand_L.getWorldPosition(new T.Vector3()), shoulder = by.upper_arm_L.getWorldPosition(new T.Vector3());
assert.ok(elbow.y < Math.min(wrist.y, shoulder.y) + 0.02, 'the elbow hangs below the shoulder-to-wrist line');
// 4. a target across the body, too far to the side (the magazine reach): the shoulder doesn't swing across the view
place(1, [0.42, -0.18, -0.43], [0, 1, 0], [-0.3, -0.75, -0.15]);
ctx.fpHoldStep(1 / 30); hud.updateMatrixWorld(true);
const sh2 = by.upper_arm_L.getWorldPosition(new T.Vector3());
assert.ok(sh2.x < -0.1, 'the left shoulder stays on the left (' + sh2.x.toFixed(3) + ')');
assert.ok(sh2.y < -0.09, 'and below the eye');
// 5. a one-handed item: the free arm goes down out of view
H.px[1].removeFromParent(); ctx.fpHoldStep(1 / 30); hud.updateMatrixWorld(true);
assert.ok(by.hand_L.getWorldPosition(new T.Vector3()).y < -0.45, 'the free left hand is down out of view');
assert.ok(check(0, 'one hand').d < 0.01, 'the right still holds');
// 6. back to the empty hand: the clips blend out of the hold pose
assert.equal(F.prev, 'hold'); assert.equal(F.bl, 0); assert.equal(F.cur, 'relax');
ctx.held = 'hand'; ctx.FPH.on = false; ctx.fpArmsStep(0.05, true);
assert.ok(F.bl > 0 && F.bl < 1, 'part way through the blend');
for (let k = 0; k < 10; k++) ctx.fpArmsStep(0.05, true);
assert.equal(F.bl, 1, 'and done');
assert.ok(Math.abs(by.forearm_L.position.length() - H.rest[1][1].length()) < 1e-4, 'the arms are their own length again');
console.log('PASS: PSX arms hold things (shotgun and grips reached with the handle through the fist, stretch then shoulder, elbows down, the magazine reach stays sensible, a free arm out of view, blend back to the empty hand)');
