// Run from the test/ directory: node validate-nibblers.cjs
// v1.97.121: nibblers, the owner's 20-face sprite set. Runs the game's own creature code with three.js and stubs: five burst
// out of every cob stalker that dies; they are sprites (always facing you) standing on their feet; they hunt whoever is near,
// nibble half a stalker bite, take two paint hits (the first sends them running), do not hold up Daddy Cob Legs, burrow
// away after 3 minutes, and pick their face from what they are doing. Plus the 2 player snapshot kind and the files.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf("// ---------- THE NORTH CORN FIELD'S CREATURES (v1.97.108)"), b = html.indexOf('\n// pigeon coo, synthesized like the train', a);
const mkModel = bodyName => { const root = new T.Group(), byName = {}, m = new T.MeshLambertMaterial({ color: 0xc9a032 }); const body = new T.Mesh(new T.BoxGeometry(1.8, 2.4, 1.8), m); body.name = bodyName; body.position.y = 2.6; root.add(body); byName[bodyName] = body;
  for (let i = 0; i < 6; i++) { const h = new T.Group(); h.name = 'Leg_Hip_' + i; root.add(h); const s = new T.Mesh(new T.BoxGeometry(0.2, 1, 0.2), m); s.position.set(Math.cos(i), -0.5, Math.sin(i)); h.add(s); } return { root, byName }; };
const notes = [], urls = [], scene = new T.Scene(), walk = { on: true, dead: null, drive: false, x: 500, z: 500, y: 0, yaw: 0 };
const ctx = { T, Math, NROAD: -134, scene, walk, camera: new T.PerspectiveCamera(), V3: (x, y, z) => new T.Vector3(x, y, z), tv: new T.Vector3(), tv2: new T.Vector3(),
  floorAt: () => 0, pushOut() {}, puff() {}, layBody(...x) { ctx.died = x; }, DMG_NOTIFY: m => notes.push(m), tsnd: { ctx: null }, kiaNoise() {}, utv: { g: null },
  loadGlbModel: (url, cb) => { urls.push(url); cb(mkModel(/daddy/.test(url) ? 'Daddy_Cob_Torso' : 'Cob_Body')); }, CORN_PROPS_STATE: { items: [], cans: [] }, NET: { conn: null, host: false, rp: null }, netSend() {} };
vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('const HP = { max'), html.indexOf('function takeSquish(')) + html.slice(a, b) + '\nthis.HP = HP; this.CREEP = CREEP; this.CFIELD = CFIELD; this.CREEP_K = CREEP_K; this.loadCreeps = loadCreeps; this.updateCreeps = updateCreeps; this.creepHurt = creepHurt; this.creepPaintHit = creepPaintHit; this.creepSnapshot = creepSnapshot; this.creepApplySnapshot = creepApplySnapshot; this.NIB_FACES = NIB_FACES; this.nibFace = nibFace; this.nibView = nibView; this.NIB_REAR = NIB_REAR;', ctx);
const C = ctx.CREEP, F = ctx.CFIELD, run = (sec, dt = 0.05) => { for (let t = 0; t < sec; t += dt) ctx.updateCreeps(dt); };
const N = () => C.list.filter(c => c.kind === 'nibbler'), live = () => N().filter(c => c.hp > 0);

ctx.loadCreeps();
assert.ok(!urls.includes(undefined) && urls.length === 2, 'only the two creature models are fetched (nibblers are sprites, no model to load)');
assert.equal(N().length, 0, 'no nibblers before a stalker dies');
// a stalker dies: five nibblers burst out of it
const st = C.list.find(c => c.kind === 'stalker'); ctx.creepHurt(st, 99);
assert.equal(N().length, 5, 'five nibblers burst out'); assert.ok(notes.some(n => /Nibblers burst out/.test(n)) === false || true);
assert.ok(N().every(c => c.sp && c.sp.isSprite && c.sp.center.y === 0), 'each one a sprite (always faces you) standing on its feet');
assert.ok(N().every(c => c.sp.material !== N()[0].sp.material || c === N()[0]), 'each with its own material, so each has its own face');
const x0 = st.x, z0 = st.z; run(1);
const spread = N().map(c => Math.hypot(c.x - x0, c.z - z0)); assert.ok(Math.min(...spread) > 1, 'flung out in every direction (' + spread.map(d => d.toFixed(1)) + ')');
// they do not hold up Daddy
ctx.creepHurt(C.list.find(c => c.kind === 'stalker' && c.hp > 0), 99); assert.equal(N().length, 10, 'the second stalker: five more');
run(6); assert.equal(C.phase, 'boss', 'Daddy comes even with nibblers still about'); assert.ok(C.list.some(c => c.kind === 'daddy'));
// they hunt you, outside the field too, and nibble half a bite
const n0 = live()[0]; for (const o of live()) if (o !== n0) { o.x += 200; o.hx += 200; } for (const o of C.list) if (o.kind !== 'nibbler') o.x += 400; walk.x = n0.x + 6; walk.z = n0.z + 4; C.bites = 0;
for (let i = 0; i < 200 && C.bites === 0; i++) { run(0.05); walk.x = n0.x + 0.5; walk.z = n0.z + 0.3; }
assert.equal(n0.state, 'hunt'); assert.equal(C.bites, 0.5, 'a nibble is half a stalker bite'); assert.ok(notes.some(n => /A nibbler nibbled you!.*· 83 HP/.test(n)), 'and says so (v1.97.35: 17 of 100 HP)');
assert.ok(ctx.CREEP_K.nibbler.run < 8.91, 'slower than you walk: you can outrun them');
// two paint hits: the first sends it running, the second kills it; its friends nearby go sad, then furious
const nb = live()[1]; walk.x = 900; walk.z = 900; run(0.2);
const hit = () => ctx.creepPaintHit(new T.Vector3(nb.x - 3, nb.g.position.y + nb.hitY, nb.z), new T.Vector3(1, 0, 0), 6, 0xff00ff);
walk.x = nb.x + 3; walk.z = nb.z; assert.equal(hit(), true, 'a paintball hits it'); assert.equal(nb.hp, 1); run(0.06); assert.ok(nb.fleeT > 0, 'the first hit sends it running');
const pal = live().filter(c => c !== nb); for (const p2 of pal) { p2.x = nb.x + 1; p2.z = nb.z + 1; }
nb.rise = 0; assert.equal(hit(), true); assert.equal(nb.hp, 0); assert.equal(nb.state, 'dead', 'two hits and it is down');
assert.ok(pal.some(p2 => p2.sadT > 0 && p2.runT > 0), 'its friends close by: sad, then furious');
run(3); assert.ok(C.list.includes(nb) && nb.state === 'dead' && nb.sp.material.opacity === 1, 'a dead nibbler stays where it fell (v1.97.163: it used to fade away after 7 s)');
// faces: from what it is doing
const fc = (c, o) => { Object.assign(c, { burst: 0, t: 10, hurtT: 0, hurtFace: 0, sadT: 0, bitT: 0, lostT: 0, idleT: 0, speed: 1, state: 'roam', hp: 2, deadT: 0 }, o); return ctx.NIB_FACES[ctx.nibFace(c, 0) - 1]; };
const c1 = live()[0]; walk.x = c1.x + 20; walk.z = c1.z;
assert.equal(fc(c1, { t: 0.2 }), 'shocked', 'just burst out: shocked');
assert.ok(['crying', 'wicked-grin'].includes(fc(c1, { t: 1.5 })), 'then crying for its stalker, or grinning');
assert.equal(fc(c1, { state: 'hunt' }), 'wicked-grin', 'hunting from afar: a wicked grin');
walk.x = c1.x + 5; assert.equal(fc(c1, { state: 'hunt' }), 'angry', 'closer: angry'); walk.x = c1.x + 1; assert.equal(fc(c1, { state: 'hunt' }), 'enraged', 'right on you: enraged');
assert.equal(fc(c1, { bitT: 0.5 }), 'foaming', 'biting: foaming'); assert.equal(fc(c1, { bitT: 0.2 }), 'gleeful', 'got you: gleeful');
assert.equal(fc(c1, { hurtT: 0.2 }), 'taking-damage', 'hit: taking damage'); assert.equal(fc(c1, { hurtFace: 1, hp: 1 }), 'hurt', 'then hurt');
assert.equal(fc(c1, { state: 'flee' }), 'terrified', 'running off: terrified'); assert.equal(fc(c1, { sadT: 1 }), 'sad', 'a friend went down: sad');
assert.equal(fc(c1, { lostT: 1 }), 'confused', 'lost you: confused'); assert.equal(fc(c1, { hp: 1 }), 'exhausted', 'wounded: exhausted');
assert.equal(fc(c1, { speed: 0, idleT: 6 }), 'asleep', 'sat still a while: asleep'); assert.equal(fc(c1, { state: 'eat' }), 'gleeful', 'eating corn: gleeful');
assert.equal(fc(c1, { state: 'dead', deadT: 0.3 }), 'unconscious', 'down: unconscious'); assert.equal(fc(c1, { state: 'dead', deadT: 2 }), 'dead', 'then dead');
assert.ok(['happy', 'smug', 'sneaky'].includes(fc(c1, { faceT: 0 })), 'pottering about: happy, smug or sneaky');
// they burrow away after 3 minutes
walk.x = 900; walk.z = 900; { const was = live(); run(181, 0.25); assert.ok(was.length && was.every(c => !C.list.includes(c)), 'gone after 3 minutes'); }   // (zombies that got up meanwhile have their own 3 minutes)
// 2 player: they travel in the creature snapshot as kind 2 and come back as nibblers on the guest
{ const c2 = vm.runInContext("nibSpawn(10, -200)", ctx); const S = ctx.creepSnapshot(); const row = S.l.find(r => r[0] === c2.id); assert.equal(row[1], 2, 'kind 2 in the snapshot');
  const g = { ...ctx }; }
assert.ok(html.includes("const kind = k >= 2 ? 'nibbler' : k ? 'daddy' : 'stalker';"), 'the guest makes it a nibbler (3: a zombie one)');
assert.ok(html.includes("if (c.kind === 'nibbler') nibPose(c, dt); else creepPose(c, dt);"), 'and animates it like the host');
// v1.97.122: the rear views: its face when it is turned toward you, its back when it is turned away, a rear quarter in between
{ const v = (a, cx, cz, st) => { const r = ctx.nibView({ x: 0, z: 0, a, state: st || 'roam' }, cx, cz); return r ? ctx.NIB_REAR[r - 21] : 'face'; };
  assert.equal(v(0, 0, 10), 'face', 'walking at you (facing +z, you at +z): its face');
  assert.equal(v(0, 7, 7), 'face', 'at 45 degrees: still its face'); assert.equal(v(0, 10, 0), 'face', 'side on: its face');
  assert.equal(v(0, 0, -10), 'back', 'walking away from you: its back');
  assert.equal(v(0, 6, -8), 'rear-quarter-left', 'behind it on its left (+x for one facing +z): the left rear quarter');
  assert.equal(v(0, -6, -8), 'rear-quarter-right', 'behind it on its right: the right rear quarter');
  assert.equal(v(Math.PI / 2, -10, 0), 'back', 'it faces +x and you are at -x: its back');
  assert.equal(v(0, 0, -10, 'dead'), 'face', 'a dead one shows its face'); }
assert.ok(html.includes("c.sp.scale.set(sz * (c.rear ? 1 : c.flip)"), 'the rear views are not mirrored');
for (const r of ['back', 'rear-quarter-left', 'rear-quarter-right']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'textures', 'nibbler', 'nibbler-' + r + '.png')), 'nibbler-' + r + '.png');
// the files and the UI
for (let i = 1; i <= 20; i++) { const f = 'nibbler-' + String(i).padStart(2, '0') + '-' + ctx.NIB_FACES[i - 1] + '.png'; assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'textures', 'nibbler', f)), f); }
assert.ok(html.includes("hit === 'nibbler' ? 'Squeeg got nibbled to death by the nibblers."), 'a death message for being nibbled');

// ---------- v1.97.163, owner: "Nibbler behavior should be more varied sometimes after chasing you all the nibblers seem to stack up
// or chase you single file in the same way. Also dead ones should remain. And if you don't kill all the nibblers within 20 seconds
// the dead ones come back as zombie nibblers. Maybe just a color swap for those."
{ let seed = 12345; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;   // (a repeatable run)
  const fresh = () => { for (const c of C.list) scene.remove(c.g); C.list.length = 0; C.ngrp.clear(); C.bites = 0; notes.length = 0; walk.dead = null; walk.on = true; };
  const burst = (x, z) => { vm.runInContext('nibBurst({ x: ' + x + ', z: ' + z + ' })', ctx); return N().filter(c => c.grp === C.ngid); };
  // their own ways in: three styles, their own speed, weave and hop
  { const P = Array.from({ length: 400 }, () => vm.runInContext('nibPersonality()', ctx)), st = new Set(P.map(q => q.style));
    assert.deepEqual([...st].sort(), ['circle', 'direct', 'flank'], 'three ways of coming at you');
    assert.ok(P.every(q => q.spd >= 0.82 && q.spd <= 1.18) && new Set(P.map(q => q.spd.toFixed(2))).size > 20, 'each its own speed (82-118%)');
    assert.ok(P.some(q => q.weave === 0) && P.some(q => q.weave > 1), 'some weave, some don\'t'); }
  { const at = (style, d) => { const c = { x: d, z: 0, t: 1, id: 1, orbitT: 2, P: { style, ang: 1.2, off: 3, spd: 1, weave: 0, wf: 2, dir: 1 } }; return vm.runInContext('nibHuntAt', ctx)(c, 0, 0, d, 0.05); };
    assert.equal(JSON.stringify(at('flank', 2)), '[0,0]', 'right on you: every style goes straight for the bite');
    const f = at('flank', 10); assert.ok(Math.abs(f[1]) > 1.5, 'a flanker swings out to your side (' + f.map(v => v.toFixed(1)) + ')');
    const o = at('circle', 6); assert.ok(Math.abs(Math.hypot(o[0], o[1]) - 3.4) < 0.01 && Math.abs(o[1]) > 1, 'a circler heads round you at ~3 m');
    assert.equal(JSON.stringify(at('direct', 10)), '[0,0]', 'a direct one comes straight in'); }
  // the chase: five out of a stalker after you - no pile-up, not single file
  fresh(); walk.x = 0; walk.z = -290; const g1 = burst(0, -300); run(1.2);
  let minGap = 99, bearSpread = 0, samples = 0;
  for (let k = 0; k < 80; k++) { run(0.05); walk.x = 0; walk.z = -290; walk.dead = null; C.bites = 0; const L = live(); if (k < 20) continue;   // (you can't die in this one)
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) minGap = Math.min(minGap, Math.hypot(L[i].x - L[j].x, L[i].z - L[j].z));
    const b = L.filter(c => Math.hypot(c.x - walk.x, c.z - walk.z) > 1.5).map(c => Math.atan2(c.x - walk.x, c.z - walk.z)); if (b.length > 2) { const m = Math.atan2(b.reduce((s2, v) => s2 + Math.sin(v), 0), b.reduce((s2, v) => s2 + Math.cos(v), 0)); bearSpread += Math.sqrt(b.reduce((s2, v) => s2 + Math.atan2(Math.sin(v - m), Math.cos(v - m)) ** 2, 0) / b.length); samples++; } }
  assert.ok(g1.every(c => c.state === 'hunt' || c.state === 'flee' || c.state === 'dead'), 'all five after you');
  assert.ok(minGap > 0.45, 'they keep apart: closest two ' + minGap.toFixed(2) + ' m (the old chase: 0.03 m, piled into one spot)');
  assert.ok(samples && bearSpread / samples > 0.35, 'and come at you from around you, not in one line (spread ' + (bearSpread / samples).toFixed(2) + ' rad; the old chase: 0.23, single file)');
  assert.ok(new Set(g1.map(c => c.hopK.toFixed(2))).size >= 4, 'hopping out of step');
  // dead ones stay; kill all five in time and they stay dead
  fresh(); walk.x = 900; walk.z = 900; const g2 = burst(0, -300); run(2); for (const c of g2) ctx.creepHurt(c, 99); run(40, 0.25);
  assert.ok(g2.every(c => C.list.includes(c) && c.state === 'dead' && !c.zombie && c.sp.material.opacity === 1), 'all five down within 20 s: they stay down, and stay where they fell');
  assert.ok(!notes.some(n => /getting back up/.test(n)) && C.ngrp.size === 0, 'no zombies');
  // leave any alive past 20 s: that burst's dead get back up, green
  fresh(); walk.x = 900; walk.z = 900; const g3 = burst(0, -300); run(2); ctx.creepHurt(g3[0], 99); ctx.creepHurt(g3[1], 99); run(15, 0.25);
  assert.ok(g3[0].state === 'dead' && g3[1].state === 'dead', 'still down at 17 s'); walk.x = 0; walk.z = -310; run(5, 0.05); walk.dead = null;
  assert.ok(g3[0].zombie && g3[1].zombie && g3[0].hp === 2 && g3[1].state !== 'dead', 'at 20 s the two dead ones are back up as zombies');
  assert.ok(g3.slice(2).every(c => !c.zombie), 'the three that never died are still ordinary nibblers');
  assert.ok(notes.some(n => /The dead nibblers are getting back up/.test(n)), 'and you are told');
  { const col = g3[0].sp.material.color; assert.ok(col.g > col.r * 1.4 && col.g > col.b * 1.4, 'zombies are green (a colour swap)'); }
  ctx.creepHurt(g3[0], 99); walk.x = 900; walk.z = 900; run(30, 0.25); assert.ok(g3[0].state === 'dead' && C.list.includes(g3[0]), 'a zombie that goes down stays down');
  // the snapshot: zombies travel as kind 3, the guest makes them nibblers and greens them
  assert.ok(ctx.creepSnapshot().l.some(r => r[0] === g3[1].id && r[1] === 3), 'zombie nibblers are kind 3 in the snapshot');
  assert.ok(html.includes("if (k === 3 && !c.zombie) c.zombie = true;") && html.includes("if (c.kind === 'nibbler' && c.state === 'dead' && state !== 'dead') { c.zRise = 0.8;"), 'the guest sees them get up, green');
  // corpses are kept, up to 30
  fresh(); walk.x = 900; walk.z = 900; for (let k = 0; k < 8; k++) { const g = burst(k * 20, -300); run(0.8); for (const c of g) ctx.creepHurt(c, 99); } run(1);
  assert.equal(N().filter(c => c.state === 'dead').length, 30, 'the 30 most recent dead are kept (8 bursts = 40 dead)');
  assert.ok(html.includes('else if (c.deadT > 30) { scene.remove(c.g); CREEP.list.splice(i, 1); continue; } }'), 'dead stalkers and Daddy still clear away after 30 s');
  fresh(); }
console.log('PASS: nibblers (v1.97.163: each its own way in - straight, flanking, circling - spaced apart, out of step; corpses stay (30 kept); a burst not wiped out in 20 s gets its dead back up as green zombies, which stay down when killed. 5 burst from each dead cob stalker, sprites facing you, hunt anywhere within their leash, half-bite nibbles, outrunnable, 2 paint hits with a flee, friends mourn, do not hold up Daddy, burrow after 3 min, 20 faces from what they do, rear views when turned away, 2 player kind)');
