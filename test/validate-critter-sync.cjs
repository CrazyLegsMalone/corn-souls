// Run from the test/ directory: node validate-critter-sync.cjs
// v1.97.112: 2 player critters and eating. Two copies of the game's own corpse / eating / critter-sync code (host and guest)
// run side by side with their messages piped together: the guest mirrors the host's pigeons, rat, lizard and frogs; a
// guest's hit lands on the host; a corpse the guest carries is carried on the host's screen too, cannot be taken from it,
// and comes to rest in the same spot when thrown; eating one plays three crunchy bites and takes it out of the world on both.
// Also: walking and sprinting are 10% slower.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), loader = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf('// ---------- EATING WHAT YOU KILL'), b0 = html.indexOf('function hitBird(b, c) {'), b = html.indexOf('\n}\n', b0) + 3;
assert.ok(a > 0 && b > b0 && b0 > a, 'the corpse, eating and critter sync code');
const src = html.slice(a, b);
const make = host => {
  const q = [], puffs = [], notes = [], scene = new T.Scene(), camera = new T.PerspectiveCamera(); scene.add(camera);
  const mat = c => new T.MeshLambertMaterial({ color: c });
  const bird = (x, z) => { const g = new T.Group(); g.position.set(x, 4, z); scene.add(g); return { g, head: new T.Object3D(), wl: new T.Object3D(), wr: new T.Object3D(), mats: [mat(0x8a8f99), mat(0x4b5260)], state: 'perch', idle: 9, t: 0 }; };
  const crit = (kind, x, z) => { const g = new T.Group(); g.position.set(x, 0, z); scene.add(g); const mats = [mat(0x6e6a66), mat(0xd9a0a0)]; return { kind, g, mats, cols: mats.map(m => m.color.getHex()), state: 'idle', t: 2, speed: 3 }; };
  const frog = (x, z) => { const group = new T.Group(); group.position.set(x, 0.2, z); scene.add(group); const mats = [mat(0x468443), mat(0xabc37b)]; return { group, g: group, mats, cols: mats.map(m => m.color.getHex()), state: 'live', t: 0, held: false, thrown: false }; };
  const off = host ? 0 : 30;   // the guest's own random critters start somewhere else
  const ctx = { T, Math, console, scene, camera, clock: 0, walk: { on: true, dead: false, drive: false, x: 0, y: 0, z: 0, yaw: 0 },
    birds: [bird(10 + off, 10), bird(-12 + off, 6)], critters: [crit('rat', 3 + off, 2), crit('lizard', -3 + off, -2), crit('lizard', 6 + off, -5), crit('lizard', -7 + off, 4), crit('lizard', 1 + off, -8)], pondFrogs: [frog(40 + off, 40), frog(44 + off, 40)],   // v1.97.170: the game's 1 rat + 4 lizards, so the index-based sync is exercised over the whole set
    V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), puff: (p, s, c) => puffs.push(c), powerGive: (k, pre) => notes.push((pre || '') + 'power:' + k), powerKindOf: o => o.kind || (o.group ? 'frog' : 'pigeon'), floorAt: () => 0, tsnd: { ctx: null }, DMG_NOTIFY: m => notes.push(m),
    flyTo: (o, p) => { o.state = 'fly'; o.from = o.g.position.clone(); o.to = p; }, farPerch: () => new T.Vector3(0, 3, 0), scareNear() {}, pigeonHits: 0, critterHits: 0,
    NET: { host, conn: { open: true, send: o => q.push(JSON.parse(JSON.stringify(o))) }, rp: null }, q, puffs, notes };
  ctx.netSend = o => { if (ctx.NET.conn && ctx.NET.conn.open) ctx.NET.conn.send(o); };
  ctx.hitPondFrog = (f, col) => { if (f.state === 'hit') return; vm.runInContext('critNetHit', ctx)(f, col); f.state = 'hit'; f.t = 45; if (col != null) f.mats.forEach(m => m.color.setHex(col)); };   // (the launcher's, reduced)
  vm.createContext(ctx);
  vm.runInContext(src.replace(/\blet heldDead = null;/, 'var heldDead = null;').replace(/\blet EAT = null;/, 'var EAT = null;') + `
    this.critNetUpdate = critNetUpdate; this.critterPick = critterPick; this.critterEat = critterEat; this.critterThrow = critterThrow; this.updateThrown = updateThrown; this.updateEat = updateEat;
    this.netRecv = m => { if (m.t === 'crs') { if (!NET.host) critApply(m); } else if (m.t === 'crh') { if (NET.host) critRecvHit(m); } else if (m.t === 'crp') { if (NET.host) critRecvP(m); } else if (m.t === 'cre') critRecvEat(m); };
    this.critNetDrop = critNetDrop; this.deadNear = deadNear; this.deadName = deadName; this.hitBird = hitBird; this.hitCritter = hitCritter; this.held = () => heldDead;`, ctx);
  return ctx;
};
const H = make(true), G = make(false);
const pipe = () => { for (const [x, y] of [[H, G], [G, H]]) for (const m of x.q.splice(0)) y.netRecv(m); };
const step = (sec, dt = 0.02) => { for (let t = 0; t < sec; t += dt) { for (const c of [H, G]) { c.clock += dt; c.updateThrown(dt); c.updateEat(dt); c.critNetUpdate(dt); } pipe(); } };
const same = (o1, o2, e = 0.05) => (o1.g || o1.group).position.distanceTo((o2.g || o2.group).position) < e;

// the guest mirrors the host's critters
step(0.5);
for (const k of ['birds', 'critters', 'pondFrogs']) H[k].forEach((o, i) => assert.ok(same(o, G[k][i]), 'the guest sees the host\'s ' + k + ' ' + i + ' where the host has it'));
H.birds[0].state = 'fly'; H.birds[0].g.position.set(20, 9, 15); step(0.6); assert.equal(G.birds[0].state, 'fly'); assert.ok(same(H.birds[0], G.birds[0], 0.1), 'a flying pigeon is followed');
assert.ok(G.birds[0].wl.rotation.y === 0, 'and its wings are spread');
// the guest shoots a pigeon: it falls on the host, painted, and the guest sees that
H.birds[0].state = 'perch'; step(0.3);
G.hitBird(G.birds[0], 0xff2244); assert.equal(G.birds[0].state, 'fall', 'right away on the guest');
step(0.1); assert.equal(H.birds[0].state, 'fall', 'the host takes the hit'); assert.equal(H.birds[0].mats[0].color.getHex(), 0xff2244, 'painted');
H.birds[0].state = 'down'; H.birds[0].g.position.y = 0.05; step(1.2); assert.equal(G.birds[0].state, 'down'); assert.equal(G.birds[0].mats[1].color.getHex(), 0xff2244, 'painted on the guest too'); assert.ok(same(H.birds[0], G.birds[0]));
assert.equal(H.pigeonHits, 1, 'one hit, counted once on the host');
// a hit is not re-sent when the host applies it, and a single PC sends nothing
assert.ok(!H.q.some(m => m.t === 'crh'));
{ const S = make(false); S.NET.conn = null; S.hitCritter(S.critters[0], 0x00ff00); assert.equal(S.q.length, 0, 'single player: no messages'); }

// the guest picks up the dead pigeon: the host sees it carried and cannot take it
G.walk.x = G.birds[0].g.position.x; G.walk.z = G.birds[0].g.position.z + 1; G.camera.position.set(G.walk.x, 1.6, G.walk.z); G.camera.updateMatrixWorld();
assert.match(G.critterPick(), /Picked up the dead pigeon/); step(0.4);
assert.equal(H.birds[0].held, true, 'carried on the host\'s screen'); assert.equal(H.birds[0].net, 'them');
assert.ok(H.birds[0].g.position.distanceTo(G.birds[0].g.getWorldPosition(new T.Vector3())) < 0.3, 'in front of the guest');
H.walk.x = H.birds[0].g.position.x; H.walk.z = H.birds[0].g.position.z; assert.equal(H.deadNear(), null, 'the host cannot pick it out of the guest\'s hands');
// thrown: it comes to rest in the same spot on both, and goes back on the host's clean-up timer
G.camera.lookAt(G.walk.x, 1.6, G.walk.z - 5); G.camera.updateMatrixWorld(); assert.match(G.critterThrow(), /Threw the pigeon/); step(3);
assert.ok(same(H.birds[0], G.birds[0], 0.02), 'at rest in the same spot'); assert.equal(H.birds[0].held, false); assert.equal(H.birds[0].net, null); assert.equal(H.birds[0].t, 45);

// the host shoots the rat and the guest eats it: three bites, crumbs, gone on both
H.hitCritter(H.critters[0], 0x3355ff); step(0.6); assert.equal(G.critters[0].state, 'hit', 'the host\'s hit reaches the guest');
G.walk.x = G.critters[0].g.position.x; G.walk.z = G.critters[0].g.position.z + 1; assert.match(G.critterPick(), /dead rat/);
G.puffs.length = 0; assert.match(G.critterEat(), /You eat the rat/); assert.equal(G.critterEat(), null, 'one bite at a time');
assert.equal(G.critterThrow(), 'Chewing...', 'no throwing it mid-meal'); assert.equal(G.critterPick(), 'Chewing...', 'nor putting it down');
step(0.5); assert.ok(G.held() && G.held().g.scale.x < 1, 'it goes up to your mouth, smaller with each bite');
step(0.8); assert.equal(G.held(), null, 'eaten'); assert.ok(G.puffs.length >= 12, 'three bites of crumbs (' + G.puffs.length + ')'); assert.ok(G.notes.includes('You ate the rat. power:rat'), 'and you get its power (v1.97.113)');
assert.equal(G.critters[0].state, 'gone'); assert.equal(G.critters[0].g.visible, false); assert.equal(G.critters[0].g.parent, G.scene, 'back in the world (hidden) so it can come back later');
assert.ok(Math.abs(G.critters[0].g.scale.x - 1) < 1e-6, 'at its own size again');
assert.equal(H.critters[0].state, 'gone', 'the host sees it eaten'); assert.equal(H.critters[0].g.visible, false);
step(1); assert.equal(G.critters[0].state, 'gone', 'and the host\'s next snapshot agrees');
// a frog: named a frog, and eaten frogs stay hidden until they come back
H.hitPondFrog(H.pondFrogs[0], null); step(0.6); assert.equal(G.pondFrogs[0].state, 'hit');
G.walk.x = G.pondFrogs[0].group.position.x; G.walk.z = G.pondFrogs[0].group.position.z + 1; assert.match(G.critterPick(), /dead frog/);
G.critterEat(); step(1.5); assert.equal(H.pondFrogs[0].eaten, true); assert.equal(H.pondFrogs[0].group.visible, false); step(1); assert.equal(G.pondFrogs[0].group.visible, false);

// the other player leaves: a guest's mirrored pigeon in mid-flight carries on under its own AI without crashing
H.birds[1].state = 'fly'; step(0.4); G.NET.conn = null; G.critNetDrop(); assert.ok(G.birds[1].from, 'a flying mirror gets a flight of its own');

// wiring
assert.ok(html.includes("  if (critNetGuest()) { birdCooTick(dt); return; }   // 2 player: the host's pigeons") && html.includes("  if (critNetGuest()) return;   // 2 player: the host's critters"), 'the guest runs no pigeon or critter AI of its own');
// v1.97.178, owner: "sync headlights and pigeon coos" - the guest does hear the host's pigeons: a coo-only ticker over the
// mirrored birds, using the same pigeonCoo (which keeps the v1.97.168 "not through the roof" rule) and no AI at all.
{ const coo = (html.match(/function birdCooTick\(dt\) \{[\s\S]*?\n\}/) || [''])[0];
  assert.ok(coo.includes('b.state !== ') && coo.includes('pigeonCoo(Math.min(1, 6 / (d + 2)), b.g.position)'), 'the guest coos from the mirrored perches, same volume curve as the host');
  assert.ok(!coo.includes('flyTo') && !coo.includes('perchAt') && !coo.includes('b.idle'), 'and moves nothing: the host owns the birds');
  assert.ok(html.indexOf('function birdCooTick') < html.indexOf('function updateBirds(dt)'), 'it sits next to updateBirds'); }
assert.ok(loader.includes("if(typeof critNetGuest==='function'&&critNetGuest())return;") && loader.includes("if(typeof critNetHit==='function')critNetHit(f,col);"), 'nor frog AI; a guest\'s frog hit goes to the host');
assert.ok(loader.includes("const frog={group,g:group,"), 'frogs can be picked up (deadNear reads .g)');
assert.ok(html.includes("stepSafe('eat', () => updateEat(dt));") && html.includes("stepSafe('critNet', () => critNetUpdate(dt));"), 'eating and critter sync run every frame');
for (const t of ["m.t === 'crs'", "m.t === 'crh'", "m.t === 'crp'", "m.t === 'cre'"]) assert.ok(html.includes(t), 'handles ' + t);
assert.ok(html.includes('  critNetDrop();'), 'a dropped connection lets go of their critters');
assert.ok(html.includes('|| critNearRp(g.position, 8);   // either player scares them'), 'pigeons fly off from either player');
// walking and sprinting 10% slower
assert.ok(html.includes("const sp = (run ? TUNE.sprint : TUNE.walk) * (POWER.kind === 'rat' ? 1.5 : 1) * dt") && html.includes('const TUNE = { walk: 8.91, sprint: 17.01,'), 'walk 8.91, sprint 17.01 (10% under 9.9 and 18.9; v1.97.24: held in TUNE so the Lesion Toolbox can try others)');
console.log('PASS: 2 player critters (pigeons, rat, lizard, frogs mirrored from the host, guest hits land on the host, carried corpse shown and protected, thrown corpse rests in the same spot, eaten on both), eating effect (three bites, crumbs, put back for respawn), walk/sprint 10% slower');
