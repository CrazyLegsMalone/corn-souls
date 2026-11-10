// Run from the test/ directory: node validate-fp-arms.cjs
// Guards TEST v1.97.67: Drillimpact's "PSX First Person Arms" as the empty hand (owner: "can you make it work with the player models
// matching skin tone"). The trimmed rig ships with its credit; the arms show with the empty hand standing on foot in first person,
// relax / guard while aiming / jab left and right on fire (a light hit on the living) / grab when X picks something up, and they are
// tinted by the player's own Squeeg hand colour over the texture's average.
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
// the model: skinned, the clips the game plays, names a three.js binding can read
const b = fs.readFileSync(path.join(root, 'assets/models/fp/arms.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
assert.ok(b.length < 1100000, 'trimmed (' + b.length + ' bytes)');
const pr = d.meshes[0].primitives[0];
assert.ok(pr.attributes.JOINTS_0 !== undefined && pr.attributes.WEIGHTS_0 !== undefined && pr.attributes.TEXCOORD_0 !== undefined && d.skins.length === 1 && d.images.length === 1, 'one skinned, textured mesh');
const clips = d.animations.map(a => a.name);
for (const n of ['relax', 'guard_draw', 'guard_idle', 'jab_L', 'jab_R', 'grab_R']) assert.ok(clips.includes(n), 'clip ' + n);
assert.ok(!clips.some(n => /knife|finger/.test(n)), 'the knife and finger-gun sets are dropped');
assert.ok(d.nodes.every(n => !n.name || !n.name.includes('.')), 'no dotted node names');
const cam = d.nodes.find(n => n.name === 'camera'), rt = d.nodes.find(n => n.name === 'root');
assert.ok(cam && rt && Math.abs(rt.translation[1] + cam.translation[1] - 1.743) < 0.002, 'its camera bone is 1.743 m up (FPA.camY)');
assert.match(d.asset.extras.author, /Drillimpact/);
assert.ok(fs.existsSync(path.join(root, 'scripts/slim_fp_arms.py')), 'the trim script is kept');
// credits
assert.ok(/PSX First Person Arms”\*\* — by \*\*Drillimpact\*\*/.test(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8')), 'credited');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets.find(a => a.id === 'itch-drillimpact-psx-first-person-arms');
assert.ok(reg && reg.status === 'in-use' && reg.files.includes('assets/models/fp/arms.glb'), 'registered');
// the game
const blk = html.slice(html.indexOf('// ---------- FIRST-PERSON ARMS'), html.indexOf('function makeHand() {'));
assert.ok(blk.length > 3000, 'the arms block');
assert.ok(/url: '\/corn-souls\/assets\/models\/fp\/arms\.glb'/.test(blk));
assert.ok(/k: Math\.tan\(21 \* Math\.PI \/ 180\) \/ Math\.tan\(30 \* Math\.PI \/ 180\), camY: 1\.743/.test(blk), 'drawn as the rig\'s ~60 degree lens on the 42 degree HUD camera');
assert.ok(/g\.rotation\.y = Math\.PI; g\.scale\.set\(FPA\.k, FPA\.k, 1\);/.test(blk), 'turned to face -z, squeezed across the view');
assert.ok(/m\.color\.setRGB\(Math\.min\(3, s\[0\] \/ FPA\.avg\[0\]\)/.test(blk), 'tint = the player\'s hand colour / the texture average');
assert.ok(html.includes("if (keep.has(bb)) { const S = o.userData.skinSum; S[0] += c.r; S[1] += c.g; S[2] += c.b; S[3]++; }"), 'the player model\'s hand colour is measured as its hand bakes');
assert.ok(html.includes("if (geos[0].userData.skin && typeof FP_SKIN !== 'undefined') FP_SKIN[slot] = geos[0].userData.skin;"), 'per player slot (host / guest model)');
assert.ok(html.includes("if (typeof fpArmsStep === 'function') fpArmsStep(dt, fp && held === 'hand' && !seated && SR.carry !== 'me');"), 'shown with the empty hand, on foot, in first person (not seated, not carrying the radio)');
assert.ok(html.includes("if (held === 'hand' && !walk.ride && !walk.pass && fpArmsPunch()) return true;"), 'fire punches');
assert.ok(html.includes("|| (typeof FPA !== 'undefined' && FPA.g && FPA.g.visible);   // (v1.97.67: the first-person arms)"), 'the HUD pass draws them');
assert.ok(html.includes("for (const k of ['critterPick', 'takeTool', 'takeKey', 'takeExtinguisher', 'pickChute']) { const f = root.Plant3D[k];") && html.includes("if (r) { try { fpArmsGrab(); } catch (e) {} } return r;"), 'a grab when X takes something (the pick-up calls play it; the X line the TEST shell patches is untouched)');
assert.ok(html.includes("m.k === 'hand' ? '👊 The other player punched you'"), 'the other player is told they were punched');
// the clip logic, run for real with stand-in clips
{ const vm = require('vm');
  const mkClip = L => ({ channels: [{ obj: { quaternion: { copy() {}, slerpQuaternions() {} }, position: { copy() {}, lerpVectors() {} } }, path: 'rotation', times: [0, L], values: [0, 0, 0, 1, 0, 0, 0, 1], step: false }] });
  const hits = [], sent = [], ctx = { Math, console, held: 'hand', aimWant: false, sgBob: 0, NET: { conn: null, host: true }, VEST_COL: ['a', 'b'], fpModelHands: [null, null], buildModelHands() {}, fpTexPixels: () => null, fpLin: x => x,
    glbPose() {}, atkStart() {}, netSend: m => sent.push(m), VIEW: {}, ensureHud: () => ({ add() {} }), loadGlbModel() {}, T: {}, document: undefined };
  vm.createContext(ctx);
  vm.runInContext(blk.replace('function punchHit() {', 'function punchHit_real() {') + '\nfunction punchHit() { HITS.push(FPA.cur); }\nthis.FPA = FPA; this.fpArmsPunch = fpArmsPunch; this.fpArmsStep = fpArmsStep; this.fpArmsGrab = fpArmsGrab;', Object.assign(ctx, { HITS: hits }));
  const F = ctx.FPA; Object.assign(F, { state: 'ready', g: { visible: false, position: { set() {} } }, clips: { relax: mkClip(2), guard_draw: mkClip(0.6), guard_idle: mkClip(2.2), jab_L: mkClip(1), jab_R: mkClip(1), grab_R: mkClip(0.7) } });
  const run = s => { for (let t = 0; t < s; t += 1 / 30) ctx.fpArmsStep(1 / 30, true); };
  run(0.5); assert.equal(F.cur, 'relax', 'hands down at rest'); assert.equal(F.g.visible, true);
  assert.equal(ctx.fpArmsPunch(), true); assert.equal(F.cur, 'jab_L'); assert.ok(sent.some(m => m.t === 'atk'), 'the swing shows on the other screen');
  run(0.3); assert.deepEqual(hits.slice(), ['jab_L'], 'it lands about 0.42 of the way in');
  ctx.fpArmsPunch(); run(0.6); assert.equal(F.cur, 'jab_R', 'a press during one queues the other hand'); run(0.4); assert.equal(hits.length, 2);
  run(1.5); assert.equal(F.cur, 'relax', 'and back to rest');
  ctx.aimWant = true; run(0.1); assert.equal(F.cur, 'guard_draw', 'aiming raises a guard'); run(1); assert.equal(F.cur, 'guard_idle', 'and holds it');
  ctx.aimWant = false; run(0.2); assert.equal(F.cur, 'relax');
  ctx.fpArmsGrab(); assert.equal(F.cur, 'grab_R', 'X: reach and grab'); run(1); assert.equal(F.cur, 'relax');
  ctx.fpArmsStep(0.1, false); assert.equal(F.g.visible, false, 'hidden with anything else in hand');
}
console.log('PASS: first-person arms (PSX rig, the empty hand: relax, guard, jab L/R that land, grab; tinted to the player model\'s skin; credited)');
