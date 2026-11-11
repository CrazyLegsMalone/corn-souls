// Run from the test/ directory: node validate-bugfix-batch.cjs
// Guards Batch 4 (TEST v1.97.197): gameplay and two-player sync fixes. Where it can, it runs the real game or launcher
// code in a vm sandbox; the source checks pin wiring that has no runnable seam.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const launcher = fs.readFileSync('index.html', 'utf8');
const sound = fs.readFileSync('sound-settings.js', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a); assert.ok(i >= 0, 'found ' + a.slice(0, 50)); const j = html.indexOf(b, i + a.length); assert.ok(j > i, 'found end ' + b.slice(0, 50)); return html.slice(i, j); };
const fnSrc = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, k = src.indexOf('{', i); for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) break; } return src.slice(i, k + 1); };
const lineOf = s => { const i = html.indexOf(s); assert.ok(i >= 0, 'found ' + s.slice(0, 50)); return html.slice(html.lastIndexOf('\n', i) + 1, i); };

// ---------------------------------------------------------------- 4.1 statements that a mid-line // had swallowed
for (const s of ['manDoor(rx + 2.5, rz - 3.9, true, null, 1); concreteFloor(rx - 5.2, rx + 5.2, rz - 3.9, rz + 3.9);',
  'mesh.castShadow = !!opts.shadow; mesh.count = 0;', 'R.sg.g.rotation.set(0.04 * (1 - q), 0.06 * (1 - q), 0);'])
  assert.ok(!lineOf(s).includes('//'), 'live code, not inside a comment: ' + s.slice(0, 40));

// ---------------------------------------------------------------- 4.2 the Milo-Rade machines answer a press, and block you even when late
{
  const src = cut('const DRINK_KEEP = /', 'function loadCoolingTower() {');
  const scene = new T.Scene(), extraCols = [], colliders = [[0, 0, 1]];
  const VEND = { machines: [{ spot: { x: 5, y: 0, z: 6, kind: 'drink' }, ready: true }, { spot: { x: 50, y: 2, z: 60, kind: 'drink' }, ready: true }, { spot: { x: 5, y: 0, z: 6, kind: 'snack' }, ready: true }] };
  let skipFn = null, onLoad = null;
  const ctx = { T, scene, extraCols, colliders, VEND, DRINK: { ready: false }, DRINK_SPOTS: [{ x: 5, y: 0, z: 6 }, { x: 50, y: 2, z: 60, yaw: 1 }],
    mergeModel: (root, sh, skip) => { skipFn = skip; }, loadGlbModel: (url, cb) => { onLoad = cb; } };
  vm.createContext(ctx); vm.runInContext(src + '\nloadDrinkMachines();', ctx);
  const root = new T.Group(); const named = n => { const g = new T.Group(); g.name = n; const m = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), new T.MeshBasicMaterial()); g.add(m); root.add(g); return { g, m }; };
  const b1 = named('MILO_RADE_SELECT_BUTTON'), b2 = named('MILO_RADE_SELECT_BUTTON_SECOND'), bw = named('WATER_SELECT_BUTTON'), can = named('MILO_RADE_DISPENSED_CAN'), body = named('Cabinet');
  onLoad({ root });
  assert.ok(skipFn(b1.m) && skipFn(bw.m) && skipFn(can.m), 'the buttons (and the dispensed can) stay out of the merge, so they stay pressable nodes');
  assert.ok(!skipFn(body.m), 'the cabinet itself is still merged');
  const [M0, M1, snack] = VEND.machines;
  assert.ok(M0.root && M1.root && M0.root !== M1.root, 'each drink VEND entry gets its own placed cabinet (it had none, so X did nothing)');
  assert.equal(snack.root, undefined, 'a snack machine at the same spot is left alone');
  assert.equal(M0.buttons.length, 3, 'two Milo-Rade buttons and the WATER button');
  assert.ok(M1.buttons.every(b => { let q = b.node; while (q && q !== M1.root) q = q.parent; return q === M1.root; }), 'the second cabinet presses its own buttons, not the first one\'s');
  assert.ok(M0.buttons[2].water && M0.buttons.every(b => b.file === 'milorade_bottle.glb'), 'WATER keeps its joke: it drops a Milorade bottle (v1.97.78)');
  assert.equal(M0.root.getObjectByName('MILO_RADE_DISPENSED_CAN').visible, false, 'the preview can inside the cabinet is hidden');
  assert.equal(colliders.length, 3, 'the cabinets block you even though the collider list was built before they arrived');
  assert.ok(colliders.includes(extraCols[0]) && colliders.includes(extraCols[1]), 'with the same entries as extraCols');
  const lv = fnSrc(html, 'loadVendMachine');
  assert.ok(lv.includes("if (typeof colliders !== 'undefined' && colliders) colliders.push(col);"), 'the Shifty Food machines do the same');
  assert.ok(html.includes('for (const s2 of DRINK_SPOTS) VEND.machines.push('), 'the drink VEND entries still exist');
  const a = html.indexOf('const VEND = {'), b = html.indexOf('// ---------- MILO RADE vending machines', a), engine = html.slice(a, b > a ? b : a + 12000);
  for (const f of ['toast(', 'modal(', 'unlockMouse(']) assert.ok(!engine.includes(f), 'and the vending engine still never calls ' + f);
}

// ---------------------------------------------------------------- 4.3 lizards on a wall, the bin walkway, the 3P stand-in, riders, pushes, small fixes
{
  assert.ok(html.includes("if (critters) for (const c of critters) if (c.state === 'idle' || c.state === 'run' || c.state === 'climb') {"), 'tools hit a lizard on a wall');
  assert.ok(html.includes("if ((c.state === 'idle' || c.state === 'run' || c.state === 'climb') && c.g.position.distanceTo(at) < 2) crLeg(c, true);"), 'so does the washer');
  assert.ok(html.includes("if (c.state !== 'idle' && c.state !== 'run' && c.state !== 'climb') continue;\n      const cc = tv.copy(c.g.position);"), 'and paintballs');
  assert.ok(launcher.includes("if(c.state!=='idle'&&c.state!=='run'&&c.state!=='climb')continue;"), 'and thrown corn');
}
{   // the silo walkway's walk surface lines up with its own rails (both in world coordinates)
  const src = fnSrc(html, 'binWalkway'), boxes = [];
  const ctx = { GDX: -44, GDZ: -12, WALK_SURF: [], wallSegs: [], Math, mat: c => c,
    box: (w, h, d, m, x, y, z) => { const o = { w, h, d, m, x, y, z, rotation: { y: 0 }, castShadow: true }; boxes.push(o); return o; } };
  vm.createContext(ctx); vm.runInContext(src + '\nbinWalkway(10, 0, 10, 20, 15);', ctx);
  const S = ctx.WALK_SURF[0], segs = ctx.wallSegs;
  assert.ok(S.x0 < segs[0][0] && S.x1 > segs[1][0] || S.x0 < segs[1][0] && S.x1 > segs[0][0], 'the deck surface sits between its two rail lines (it was 44 m off)');
  assert.ok(Math.abs((S.x0 + S.x1) / 2 - (10 - 44)) < 1e-9 && Math.abs((S.z0 + S.z1) / 2 - (10 - 12)) < 1e-9, 'centred on the walkway in world coordinates');
  assert.ok(S.x0.toString() && html.includes('WALK_SURF.push({ x0: Math.min(xa, xb) - W / 2'), 'the pinned prefix is unchanged');
  const toes = boxes.filter(o => o.h === 0.12); assert.equal(toes.length, 2, 'a toe board on each edge');
  for (const t of toes) assert.ok(t.d === 20 && t.w === 0.04, 'running the length of the walkway, not across it');
}
{   // the third-person stand-in and the late model
  const bs = fnSrc(html, 'buildSelfAv'), us = fnSrc(html, 'updateSelfAv');
  assert.ok(bs.includes('if (VIEW.av !== av) return;'), 'a model arriving after the 8 s retry does not bind to the replaced avatar');
  assert.ok(us.includes('if (l.isObject3D) { const c = l.userData.cur || 0; l.userData.cur = c + (t - c) * k; l.rotation.x = l.userData.cur; return; }'), 'the box stand-in limbs swing directly (no NaN)');
  const limbSrc = us.slice(us.indexOf('const limb = '), us.indexOf('VIEW.legs.forEach'));
  const ctx = { SKIN_X: null, skinSwing() { ctx.swings++; }, swings: 0 }; vm.createContext(ctx); vm.runInContext(limbSrc + '\nthis.limb = limb;', ctx);
  const pv = new T.Group(); for (let i = 0; i < 30; i++) ctx.limb(pv, 0.4, 0.3);
  assert.ok(Number.isFinite(pv.rotation.x) && Math.abs(pv.rotation.x - 0.4) < 0.01, 'a stand-in hip swings toward its target (' + pv.rotation.x + ')');
  assert.equal(ctx.swings, 0, 'without touching the bone code');
  const sk = { cur: 0, b: {}, root: {}, rest: {} }; ctx.limb(sk, 0.4, 0.3); assert.equal(ctx.swings, 1, 'a skinned limb still swings its bone');
  ctx.limb({ cur: 0 }, 0.4, 0.3); assert.equal(ctx.swings, 1, 'and a limb with no bone is skipped');
}
{
  assert.ok(launcher.includes("if(M.localRider&&M.localRiderVest!==me){M.g.remove(M.localRider);M.localRider=null;}") && launcher.includes('dressPlayerSkin(d,VEST_COL[me],{sit:true});'), 'your own mower rider is rebuilt when you change sides, in your own model');
  assert.equal(html.split('dressPlayerSkin(').length - 1, 8, 'the game itself still has 1 definition and 7 dressPlayerSkin calls (validate-skinned-players)');
  assert.ok(launcher.includes("if(CAR_ON&&typeof RANGER_SAVE!=='undefined'&&RANGER_SAVE&&RANGER_SAVE.g){\\n  const S=RANGER_SAVE,p=csTrainContact(S.x,S.z,1.45);"), 'the Ranger parked while you drive a car is pushed by the train');
  assert.ok(launcher.includes('if(S.cols)for(const c of S.cols){c[0]+=p.x;c[1]+=p.z;}'), 'with its colliders');
  assert.ok(html.includes('body.walking:not(.driving):not(.nearutv) #carBtn{display:none!important}') && !html.includes('body.walking:not(.driving) #carBtn{display:none!important}'), 'the phone car button shows next to the Ranger');
  const d = html.slice(html.indexOf('get dbg() { return { '), html.indexOf('}; }, get toxic()'));
  for (const k of ['utv', 'wallSegs', 'CSU', 'ENCL', 'truck', 'creepHurt']) {
    const plain = (d.match(new RegExp('(?<=[{,] )' + k + ', ', 'g')) || []).length, getter = d.includes('get ' + k + '()') ? 1 : 0;
    assert.equal(plain + getter, 1, 'Plant3D.dbg has one ' + k + ' (a later duplicate overrode the live getter)');
  }
  const rick = html.slice(html.indexOf("job: { k: ['got anything for me to do'"), html.indexOf("opts: ['Where\\'s the mower?'"));
  assert.ok(rick && !/squeegee/i.test(rick), 'Rick no longer hands out squeegee jobs (the squeegee is gone)');
}
{   // sound menu steps land on whole percents, and Escape goes back to the pause menu
  const el = { csMusicMinus: {}, csMusicPlus: {}, card: { querySelectorAll: () => [] }, csMusicVolume: { value: '', addEventListener(t, f) { el.key = f; } }, csMusicVolumeLabel: {} };
  let menus = 0, closes = 0;
  const c = { localStorage: { getItem: () => null, setItem() {} }, music: { volume: 0.2 }, musicOn: true, $: id => el[id], modal() {}, markModal() {}, toggleMusic() {}, menu() { menus++; }, inboxClose() { closes++; } };
  vm.createContext(c); vm.runInContext(sound, c); c.soundSettings();
  for (let i = 0; i < 3; i++) el.csMusicPlus.onclick();
  assert.equal(c.music.volume, 0.5, 'three steps up from 20% is exactly 50% (' + c.music.volume + ')');
  el.csMusicMinus.onclick(); assert.equal(c.music.volume, 0.4);
  el.key({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(menus, 1, 'Escape on the slider goes back to the pause menu'); assert.equal(closes, 0, 'instead of closing everything');
  assert.ok(sound.includes('function soundMusicVolume('), 'the LIVE-promotion contract function is still there');
}

// ---------------------------------------------------------------- 4.4 two-player sync
{   // corn props and the parked-car exit no longer share a message type
  const nr = fnSrc(html, 'netRecv');
  assert.ok(nr.includes("if (m.t === 'cprop') { if (typeof cornNetRecv === 'function') cornNetRecv(m); return; }"), 'corn props are their own message');
  const first = nr.indexOf("m.t === 'cp'"); assert.ok(first > 0 && nr.slice(first - 12, first).includes('else if ('), "so the first 'cp' the receiver checks is the parked-car exit (it was unreachable)");
  assert.ok(nr.slice(first, first + 200).includes('O.cars ? O.cars[m.i]'), 'which restores the car');
  assert.ok(launcher.includes("netSend({t:'cprop',a})") && launcher.includes("netSend({t:'cprop',a:r,f:1})") && !launcher.includes("netSend({t:'cp',"), 'the corn engine sends cprop');
  assert.ok(fnSrc(html, 'carRestore').includes("netSend({ t: 'cp', i: c.i,"), 'and the car exit still sends cp');
}
{   // swapping Rangers carries the walk box, the hit flags and the damage with the physical Ranger
  const src = fnSrc(html, 'rangerNoHit') + '\n' + fnSrc(html, 'swapRangers');
  const mk = () => { const g = new T.Group(), body = new T.Mesh(new T.BoxGeometry(), new T.MeshBasicMaterial()), drv = new T.Group(); drv.userData.noHit = true; g.add(body, drv); return { g, body, drv }; };
  const mine = mk(), theirs = mk();
  const utv = { g: mine.g, x: 1, z: 1, a: 0, y: 0 }, rr = { g: theirs.g, x: 9, z: 9, a: 1, y: 0 };
  const VBOXES = [{ g: mine.g }], DMG = { r: { h: 40, fire: true }, rr: { h: 90 } };
  const ctx = { utv, NET: { rr }, VBOXES, DMG }; vm.createContext(ctx); vm.runInContext(src + '\nthis.swapRangers = swapRangers; this.rangerNoHit = rangerNoHit;', ctx);
  ctx.rangerNoHit(theirs.g, true);   // as netRemote builds the other Ranger
  assert.ok(theirs.body.userData.noHit && !mine.body.userData.noHit, 'before: theirs cannot be shot, mine can');
  ctx.swapRangers();
  assert.equal(utv.g, theirs.g, 'I now drive the other physical Ranger');
  assert.equal(VBOXES[0].g, theirs.g, 'its walk-into box is the one that follows my Ranger');
  assert.ok(!theirs.body.userData.noHit && mine.body.userData.noHit, 'the one I drive is a target again; the one they drive is not');
  assert.equal(theirs.drv.userData.noHit, true, 'a part that was never a target (the seated driver) stays that way');
  assert.equal(DMG.r.h, 90, 'my Ranger\'s health is the health of the Ranger I am now in');
  assert.equal(DMG.rr.h, 40, 'and the burning one they took over keeps its damage'); assert.equal(DMG.rr.fire, true);
  ctx.swapRangers();
  assert.ok(utv.g === mine.g && VBOXES[0].g === mine.g && DMG.r.h === 40 && !mine.body.userData.noHit && theirs.body.userData.noHit && mine.drv.userData.noHit, 'swapping back restores everything');
  delete DMG.rr; ctx.swapRangers(); assert.ok(!('r' in DMG) && DMG.rr.h === 40, 'a Ranger with no damage record swaps cleanly');
  assert.ok(html.includes('rr.flame = addFlame(rr.g); rangerNoHit(rr.g, true);'), 'the other player\'s Ranger is built through rangerNoHit');
}
{   // a guest's held freight train stays put instead of rubber-banding
  const body = cut('  for (const R of THRUS) {\n    const [[x0, z0], [x1, z1]] = mainTrack(R.off)', '  // sequence: lights');
  const mkR = () => ({ off: 0, dir: 1, u: 500, wait: 0, horn: true, state: 'hold', speed: 0, target: null, heldT: 0, cars: [{ off: 0, g: new T.Group() }] });
  const run = (host, secs) => {
    const R = mkR();
    const ctx = { THRUS: [R], NET: host ? { host: true, conn: { open: true } } : { host: false, conn: { open: true } }, RXING: { x: 0, z: 0, active: false }, MAIN_DIR: { x: 1, z: 0 }, Math,
      mainTrack: () => [[0, 0], [3000, 0]], camera: { position: new T.Vector3() }, tsnd: {}, trainHorn() {}, RAIL_PHONE: {} };
    vm.createContext(ctx); vm.runInContext('function step(dt) {\n' + body + '\n}\nthis.step = step;', ctx);
    for (let t = 0; t < secs; t += 0.5) ctx.step(0.5);
    return R;
  };
  const g = run(false, 400); assert.equal(g.state, 'hold', 'the guest never times the hold out on its own'); assert.equal(g.u, 500, 'and the train does not creep');
  const h = run(true, 400); assert.equal(h.state, 'leave', 'the host still releases the hold after five minutes'); assert.ok(h.u > 500, 'and the train pulls away');
  assert.ok(launcher.includes('th:THRUS.map(R=>[R.u,R.wait,+!!R.horn,R.state,+(R.speed||0).toFixed(2)]),'), 'the host sends each train\'s state and speed');
  assert.ok(launcher.includes('if(h[3]!==undefined)R.state=h[3];if(h[4]!==undefined)R.speed=h[4];'), 'and the guest applies them (an older host without them still works)');
}
{   // creatures: a guest with late models does not spawn its own; leaving a game resets the first-snapshot flag
  assert.ok(html.includes('if (CREEP.proto.stalker && CREEP.proto.daddy && !CREEP.ready) { CREEP.ready = true; if (!creepGuest()) creepStalkers(); }'), 'late creature models on the guest wait for the host');
  assert.ok(fnSrc(html, 'netDrop').includes('CREEP.snapSeen = false;'), 'netDrop resets the snapshot flag for the next game');
}
console.log('PASS: bugfix batch (v1.97.197: RTO shack door + floor, flow shadows/count and the remote ADS tilt are live code; Milo-Rade buttons press and late vending colliders block; climbing lizards can be hit; bin walkway surface and toe boards; 3P stand-in swing + late-model guard; own mower rider; parked Ranger train push; car button by the Ranger; no duplicate dbg keys; Rick job; sound steps + Escape; cprop vs cp; swapRangers box/hit/damage; guest train hold; creature guest race)');
