// Seating geometry: a seated character is anchored at the PELVIS. These rigs put the hip joint 0.62 m above their feet, so
// anchoring the root (the feet) at the seat height left every seated worker floating ~0.6 m above the chair - and the tech
// counters were solid 1 m boxes, so their folded knees went straight through them. This suite proves both numbers.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8').replaceAll('\r\n', '\n');

// ---------------------------------------------------------------- the chair and the anchor, from the source
assert.ok(html.includes('P(0.5, 0.08, 0.5, ch, 0, 0.43, 0)'), 'the chair slab is centred at 0.43, so its TOP is the documented 0.47');
assert.ok(html.includes('const seatY = 0.49;'), 'the pelvis sits 2 cm above the 0.47 seat surface');
assert.ok(html.includes("const hip = root.getObjectByName('Leg_Upper_L');"), "the anchor measures the rig's own hip joint");
assert.ok(html.includes('base = seatY - hipY;'), 'and drops the feet by that much so the PELVIS lands on the seat');
assert.ok(!/position\.set\(cfg\.dx \|\| 0, \(cfg\.pose === 'sit' \? seatY/.test(html), 'the old root-at-seatY anchor is gone');
assert.ok(html.includes('let base = -bb.min.y;'), 'standing models still get their feet on the floor');
for (const s of ['L', 'R'])
  assert.ok(html.includes("rig['leg' + s].rotation.x = -1.15;") && html.includes("rig['knee' + s].rotation.x = 1.15;"),
    'the thigh folds forward but slopes down, so the feet still reach near the floor (' + s + ')');

const m2 = html.match(/ZS = SCZ_OUT - 4\.5, FY = ([\d.]+)/);
const FY = m2 ? parseFloat(m2[1]) : 0.3;                                  // raised scale-house floor
const THIGH_A = 1.15, seatY = 0.49, SEAT_TOP = 0.47;

// ---------------------------------------------------------------- the rigs: hip, thigh and shin lengths
const I = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul = (a, c) => a.map(r => [0, 1, 2, 3].map(j => r[0] * c[0][j] + r[1] * c[1][j] + r[2] * c[2][j] + r[3] * c[3][j]));
const nmat = n => {
  if (!n.matrix) return I;
  const m = n.matrix;
  return [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]];
};
const rigs = [];
for (const f of ['boardop_rick_rig.glb', 'brenda_scalehouse_rig.glb', 'tammy_scalehouse_rig.glb']) {
  const b = fs.readFileSync('../assets/models/' + f);
  assert.equal(b.readUInt32LE(0), 0x46546c67, f + ' magic');
  let off = 12, doc = null;
  while (off < b.length) {
    const len = b.readUInt32LE(off), type = b.readUInt32LE(off + 4), body = off + 8;
    if (type === 0x4e4f534a) doc = JSON.parse(b.slice(body, body + len).toString('utf8'));
    off = body + len + ((4 - (len % 4)) % 4);
  }
  const y = {};
  const walk = (i, parent) => {
    const n = doc.nodes[i], mm = mul(parent, nmat(n));
    if (n.name) y[n.name] = mm[1][3];
    for (const c of n.children || []) walk(c, mm);
  };
  for (const i of doc.scenes[doc.scene || 0].nodes) walk(i, I);
  for (const k of ['Leg_Upper_L', 'Leg_Lower_L', 'Boot_Steel_ToeCap_L'])
    assert.ok(y[k] !== undefined, f + ' has ' + k + ' (characterRig reparents it)');
  rigs.push({ f, hip: y.Leg_Upper_L, thigh: y.Leg_Upper_L - y.Leg_Lower_L, shin: y.Leg_Lower_L - y.Boot_Steel_ToeCap_L });
}

// ---------------------------------------------------------------- the seated pose, measured
const thighAvg = rigs.reduce((a, r) => a + r.thigh, 0) / rigs.length;
for (const { f, hip, thigh, shin } of rigs) {
  const rootY = seatY - hip;                                             // what loadCharacter() now sets
  const pelvis = FY + rootY + hip;                                       // absolute height of the hip joints
  assert.ok(Math.abs(pelvis - (FY + seatY)) < 1e-9, f + ': the pelvis lands at seatY (' + pelvis.toFixed(2) + ' m)');
  assert.ok(pelvis > FY + SEAT_TOP - 0.01 && pelvis < FY + SEAT_TOP + 0.06, f + ': on the seat, not above it');
  const knee = pelvis - thigh * Math.cos(THIGH_A);                       // thigh folded forward, sloping down
  const foot = knee - shin;                                              // shin back to vertical
  assert.ok(knee < FY + 0.94, f + ': knees (' + knee.toFixed(2) + ' m) stay UNDER the counter top, not through it');
  assert.ok(foot > FY && foot - FY < 0.2, f + ': feet hang within 0.2 m of the floor (' + (foot - FY).toFixed(2) + ' m)');
  assert.ok(hip > 0.5, f + ': the old root anchor floated the pelvis ' + hip.toFixed(2) + ' m above where it belongs');
}

// ---------------------------------------------------------------- the counters are desks now, not solid boxes
assert.ok(!html.includes('box(6.5, 1.0, 0.7, mat(0xd8d3c4), 86, FY + 0.5, z)'), 'the solid 1 m counter box is gone');
assert.ok(html.includes('box(6.5, 0.06, 0.7, mat(0xd8d3c4), 86, FY + 0.97, z)'), 'a 6 cm top slab at sill height (top = FY + 1.0)');
assert.ok(html.includes('box(0.08, 0.94, 0.7, mat(0xcfc9ba), 86 + sx * 3.21, FY + 0.47, z)'), 'carried on two end panels 6.42 m apart');
assert.ok(html.includes('for (const z of [ZN + 0.5, ZS - 0.5])'), 'both windows keep their counter');

// the techs still sit at their windows, facing out, and their knees reach into the knee hole, not the panels
assert.ok(html.includes('seatedPerson(WINX + SH_DX, ZN + 0.85 + 0.1016, 0,'), 'Brenda at the north window, 4 in back from it');
assert.ok(html.includes('seatedPerson(WINX + SH_DX, ZS - 0.85 - 0.1016, Math.PI,'), 'Tammy at the south window, 4 in back from it');
const reach = thighAvg * Math.sin(THIGH_A);
assert.ok(reach > 0.2 && reach < 0.4, 'knees reach ' + reach.toFixed(2) + ' m forward, into the desk knee hole');

for (const script of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m3 => m3[1]))
  if (script.trim()) new vm.Script(script);
console.log('PASS: seated workers sit at the pelvis on a 0.47 seat, knees under a desk-style counter, feet near the floor');
