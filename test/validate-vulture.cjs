// The buzzard on the RTO stack is the owner's vulture_rig.glb: the same perch / fly-down / carry-to-the-pond / return
// state machine as before, but a real bird instead of a billboarded sprite. This suite parses the GLB, and then runs the
// game's own vulturePose() on a rig built from the export's joint origins to prove the fold and the wing beat move it.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;

// ---------------------------------------------------------------- the GLB
const glb = fs.readFileSync('../assets/models/vulture_rig.glb');
assert.equal(glb.readUInt32LE(0), 0x46546c67, 'vulture GLB magic');
let off = 12, doc = null, hasBin = false;
while (off < glb.length) {
  const len = glb.readUInt32LE(off), type = glb.readUInt32LE(off + 4), body = off + 8;
  if (type === 0x4e4f534a) doc = JSON.parse(glb.slice(body, body + len).toString('utf8'));
  else if (type === 0x004e4942) hasBin = true;
  off = body + len + ((4 - (len % 4)) % 4);
}
assert.ok(doc && hasBin, 'JSON + embedded BIN');
assert.equal(doc.nodes[doc.scenes[doc.scene || 0].nodes[0]].name, 'Vulture_Root', 'the rig root');
assert.equal(doc.nodes.length, 105, '105 nodes');
assert.equal(doc.meshes.length, 68, '68 meshes');
assert.equal((doc.materials || []).length, 6, '6 materials');
assert.equal((doc.images || []).length, 3, 'three embedded feather textures');
assert.ok((doc.images || []).every(i => i.mimeType === 'image/png'), 'all PNG');
assert.equal((doc.skins || []).length, 0, 'no skins: rigid parts, posed by joint rotation');
assert.equal((doc.animations || []).length, 0, 'no baked animations');
assert.ok(doc.nodes.filter(n => n.matrix).length > 80, 'the parts are placed with matrices');

const byName = {};
for (const n of doc.nodes) if (n.name) byName[n.name] = n;
const JOINTS = ['Joint_Shoulder_L', 'Joint_Shoulder_R', 'Joint_Elbow_L', 'Joint_Elbow_R', 'Joint_Wrist_L', 'Joint_Wrist_R',
  'Joint_Neck_Base', 'Joint_Neck_Mid', 'Joint_Head', 'Joint_Jaw', 'Joint_Hip_L', 'Joint_Hip_R', 'Grip_Target_Socket'];
for (const n of JOINTS) assert.ok(byName[n], 'the export still has ' + n);   // a re-export that renames one fails CI here
for (const n of JOINTS) {                                                    // every joint pitches about world X: the pose angles mean
  const m = byName[n].matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];   // what they say, and the wings mirror by sign
  const col = (c2, r2) => +m[c2 * 4 + r2].toFixed(3);                        // glTF matrices are column-major
  assert.deepEqual([col(0, 0), col(0, 1), col(0, 2)], [1, 0, 0], n + ' keeps world X as its own X axis');
  assert.deepEqual([col(1, 0), col(2, 0)], [0, 0], n + ' carries no yaw or roll of its own');
  assert.ok(Math.abs(col(1, 1) - col(2, 2)) < 1e-3 && Math.abs(col(1, 2) + col(2, 1)) < 1e-3, n + ' is a clean rotation about X');
}
for (const n of ['Joint_Shoulder_L', 'Joint_Shoulder_R', 'Joint_Elbow_L', 'Joint_Elbow_R', 'Joint_Wrist_L', 'Joint_Wrist_R',
  'Joint_Head', 'Joint_Jaw']) {                                              // the wing and head joints are pure translations
  const m = byName[n].matrix || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert.deepEqual([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]].map(v => +v.toFixed(3)),
    [1, 0, 0, 0, 1, 0, 0, 0, 1], n + ' is a pure translation');
}

// assembled bounds and the joint origins the game needs, walked through the matrices exactly as the reader builds it
const I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul = (a, b) => a.map(r => [0, 1, 2, 3].map(j => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j] + r[3] * b[3][j]));
const nmat = n => {
  if (!n.matrix) return I;
  const m = n.matrix;
  return [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]];
};
const ap = (mm, p) => [0, 1, 2].map(i => mm[i][0] * p[0] + mm[i][1] * p[1] + mm[i][2] * p[2] + mm[i][3]);
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], origin = {};
let beakZ = -1e9, tailZ = 1e9;
const walk = (i, parent) => {
  const n = doc.nodes[i], mm = mul(parent, nmat(n));
  if (n.name && (n.name.startsWith('Joint_') || n.name === 'Torso_Hunch' || n.name === 'Grip_Target_Socket')) origin[n.name] = [mm[0][3], mm[1][3], mm[2][3]];
  if (n.mesh !== undefined) for (const pr of doc.meshes[n.mesh].primitives) {
    const ac = doc.accessors[pr.attributes.POSITION];
    for (const cx of [ac.min[0], ac.max[0]]) for (const cy of [ac.min[1], ac.max[1]]) for (const cz of [ac.min[2], ac.max[2]]) {
      const p = ap(mm, [cx, cy, cz]);
      for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      if (n.name === 'Beak_Hook_Tip') beakZ = Math.max(beakZ, p[2]);
      if (n.name && n.name.startsWith('Tail_Feather')) tailZ = Math.min(tailZ, p[2]);
    }
  }
  for (const c of n.children || []) walk(c, mm);
};
for (const i of doc.scenes[doc.scene || 0].nodes) walk(i, I);
const span = mx[0] - mn[0], tall = mx[1] - mn[1], deep = mx[2] - mn[2];
assert.ok(Math.abs(span - 2.94) < 0.35 && Math.abs(tall - 1.17) < 0.2 && Math.abs(deep - 1.14) < 0.2,
  'assembled ' + span.toFixed(2) + ' m span x ' + tall.toFixed(2) + ' tall x ' + deep.toFixed(2) + ' deep');
assert.ok(Math.abs(mn[1] - 0.54) < 0.05, 'the talons are 0.54 below the origin, hence the socket lift');
assert.ok(Math.abs(origin.Grip_Target_Socket[1] - 0.59) < 0.05, 'Grip_Target_Socket is at y 0.59: that is what sits on the lip');
assert.ok(beakZ > 0.4 && tailZ < -0.4, 'the beak is on +Z and the tail on -Z, so the yaw angle IS the heading');
assert.ok(origin['Joint_Shoulder_L'][0] > 0 && origin['Joint_Shoulder_R'][0] < 0, 'left wing on +X, right on -X');

// ---------------------------------------------------------------- the pose, run from the game source
const src = html.slice(html.indexOf('function vultureRig('), html.indexOf('function vultureInit()'));
assert.ok(src.includes('function vultureRig') && src.includes('function vulturePose'), 'both helpers are in the game source');
const ctx = { VULT: { state: 'perch', flapT: 0, jawT: 0, joints: {} }, performance };
vm.createContext(ctx);
vm.runInContext(src, ctx);

const mk = (name, x, y, z, parent) => { const g = new T.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
const root = new T.Group();
{
  const P = origin, tc = P.Torso_Hunch;
  const torso = mk('Torso_Hunch', tc[0], tc[1], tc[2], root);
  for (const s of ['L', 'R']) {
    const sh = P['Joint_Shoulder_' + s], el = P['Joint_Elbow_' + s], wr = P['Joint_Wrist_' + s];
    const g1 = mk('Joint_Shoulder_' + s, sh[0] - tc[0], sh[1] - tc[1], sh[2] - tc[2], torso);
    const g2 = mk('Joint_Elbow_' + s, el[0] - sh[0], el[1] - sh[1], el[2] - sh[2], g1);
    const g3 = mk('Joint_Wrist_' + s, wr[0] - el[0], wr[1] - el[1], wr[2] - el[2], g2);
    const tip = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.02), new T.MeshBasicMaterial());
    tip.position.set(wr[0] > 0 ? 0.5 : -0.5, 0, 0); g3.add(tip);       // the primaries run ~0.5 m past the wrist
  }
  const nb = P.Joint_Neck_Base, nm = P.Joint_Neck_Mid, hd = P.Joint_Head, jw = P.Joint_Jaw;
  const gN = mk('Joint_Neck_Base', nb[0] - tc[0], nb[1] - tc[1], nb[2] - tc[2], torso);
  const gM = mk('Joint_Neck_Mid', nm[0] - nb[0], nm[1] - nb[1], nm[2] - nb[2], gN);
  const gH = mk('Joint_Head', hd[0] - nm[0], hd[1] - nm[1], hd[2] - nm[2], gM);
  mk('Joint_Jaw', jw[0] - hd[0], jw[1] - hd[1], jw[2] - hd[2], gH);
}
ctx.VULT.joints = ctx.vultureRig(root);
for (const k of ['Shoulder_L', 'Shoulder_R', 'Elbow_L', 'Elbow_R', 'Wrist_L', 'Wrist_R', 'Neck_Base', 'Neck_Mid', 'Head', 'Jaw'])
  assert.ok(ctx.VULT.joints[k], 'vultureRig picked up ' + k);
const box = () => { root.updateMatrixWorld(true); return new T.Box3().setFromObject(root); };

const bind = box(), bindSpan = bind.max.x - bind.min.x;
assert.ok(Math.abs(bindSpan - 2.94) < 0.1, 'bind pose spans ' + bindSpan.toFixed(2) + ' m');

let up = box();
const tipAt = (j) => { root.updateMatrixWorld(true); const v = new T.Vector3(); j.children.find(c => c.isMesh).getWorldPosition(v); return v; };

ctx.VULT.state = 'perch'; ctx.VULT.flapT = 0; ctx.vulturePose(0);
const foldSpan = box().max.x - box().min.x, fL = tipAt(ctx.VULT.joints.Wrist_L), fR = tipAt(ctx.VULT.joints.Wrist_R);
assert.ok(foldSpan < bindSpan * 0.55, 'perched, the wings fold to ' + foldSpan.toFixed(2) + ' m (bind ' + bindSpan.toFixed(2) + ')');
assert.ok(Math.abs(fL.x) < 0.4 && Math.abs(fR.x) < 0.4, 'the folded tips come in to the flanks (' + Math.abs(fL.x).toFixed(2) + ' m out)');
assert.ok(fL.z < -0.15 && fR.z < -0.15, 'and tuck back over the tail (' + fL.z.toFixed(2) + ' m)');
assert.ok(fL.y > 0.8 && fL.y < 1.45, 'holding flank height, not above the back');

ctx.VULT.state = 'carry';                                   // sin(pi * flapT): +1 on the upstroke, -1 on the downstroke
ctx.VULT.flapT = 0.5; ctx.vulturePose(0); up = box(); const uY = tipAt(ctx.VULT.joints.Wrist_L).y;
ctx.VULT.flapT = 1.5; ctx.vulturePose(0); const down = box(), dY = tipAt(ctx.VULT.joints.Wrist_L).y;
assert.ok(up.max.y - down.max.y > 0.3, 'the wing beat lifts the tips ' + (up.max.y - down.max.y).toFixed(2) + ' m');
assert.ok(uY > 1.9 && dY < 1.0, 'sweeping from ' + dY.toFixed(2) + ' m on the downstroke to ' + uY.toFixed(2) + ' m on the up');
assert.ok(Math.abs(ctx.VULT.joints.Shoulder_L.rotation.z + ctx.VULT.joints.Shoulder_R.rotation.z) < 1e-9, 'the two wings mirror');
assert.ok(Math.abs(ctx.VULT.joints.Shoulder_L.rotation.y + ctx.VULT.joints.Shoulder_R.rotation.y) < 1e-9, 'sweep mirrors too');
assert.ok(Math.abs(ctx.VULT.joints.Elbow_L.rotation.y + ctx.VULT.joints.Elbow_R.rotation.y) < 1e-9, 'elbows mirror');

ctx.VULT.state = 'perch'; ctx.VULT.jawT = 0.45; ctx.vulturePose(0);
assert.ok(ctx.VULT.joints.Jaw.rotation.x < -0.5, 'a hiss opens the beak');
ctx.VULT.jawT = 0; ctx.vulturePose(0);
assert.ok(Math.abs(ctx.VULT.joints.Jaw.rotation.x) < 1e-9, 'and it closes again');
assert.ok(ctx.VULT.joints.Neck_Base.rotation.x > 0.2 && ctx.VULT.joints.Neck_Base.rotation.x < 0.5, 'hunched when perched');
ctx.VULT.state = 'carry'; ctx.vulturePose(0);
assert.ok(ctx.VULT.joints.Neck_Base.rotation.x < 0.1, 'stretched out in flight');

// ---------------------------------------------------------------- the wiring
assert.ok(html.includes("'/corn-souls/assets/models/vulture_rig.glb'"), 'the model URL');
assert.ok(html.includes('const VULT_SCALE = 0.8'), 'placed at 0.8: a 2.35 m wingspan');
assert.ok(html.includes("root.getObjectByName('Grip_Target_Socket')") && html.includes('lift = -v.y'),
  'the grip socket is what sits on the perch, with the talons as the fallback');
assert.ok(html.includes('root.traverse(o => { o.userData.noHit = true; })'), 'the whole bird is noHit: it never blocks a raycast');
assert.ok(html.includes('if (VULT.sprite) VULT.sprite.visible = false'), 'the drawn fallback hides only once the model is in');
assert.ok(html.includes('VULT.perch = V3(S.x + 0.3, S.y + 0.45, S.z + 0.5)'), 'still perched on the RTO stack lip');
assert.ok(html.includes('Math.atan2(V.vel.x, V.vel.z)'), 'faces its heading in flight');
assert.ok(html.includes('VULT.perchYaw = Math.atan2(-S.x, -S.z)'), 'and scans the plant while perched');
assert.ok(html.includes("if (kind === 'hiss') VULT.jawT = 0.45"), 'every hiss opens the beak');
assert.ok(html.includes('alphaTest: 0.4'), 'the fallback sprite is still built');
assert.ok(html.includes("const rate = V.state === 'carry' ? 7"), 'the wing beat keeps its carrying / climbing / gliding rates');
for (const st of ['perch', 'toBody', 'grab', 'carry', 'return'])
  assert.ok(html.includes("V.state = '" + st + "'"), 'the ' + st + ' state survives');
assert.ok(html.includes('chalkOutline(b)') && html.includes('b.splashed = true'), 'the chalk outline and the pond drop are untouched');

for (const script of scripts) if (script.trim()) new vm.Script(script);
console.log("PASS: the buzzard is the owner's rig - joints fold, flap and open the beak, still perched on the RTO stack and still stealing bodies");
