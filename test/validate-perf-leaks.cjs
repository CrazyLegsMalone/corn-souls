// Run from the test/ directory: node validate-perf-leaks.cjs
// Guards Batch 3 (TEST v1.97.196): foldable phones on the Low tier, deep-indoor culling, no forced reflow from the body
// classes, the cropped minimap blit, the allocation-free skinSwing, and the GPU / WebAudio / collider leak fixes.
// Each block runs the real game (or launcher) code in a vm sandbox; the source checks only pin wiring.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const launcher = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b, from) => { const i = html.indexOf(a, from || 0); assert.ok(i >= 0, 'found ' + a.slice(0, 50)); const j = html.indexOf(b, i + a.length); assert.ok(j > i, 'found end ' + b.slice(0, 50)); return html.slice(i, j); };
const fnSrc = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, k = src.indexOf('{', i); for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) break; } return src.slice(i, k + 1); };

// ---------------------------------------------------------------- 3.1 foldable / flip phones pick the Low tier
{
  const tierSrc = cut('const TIERS = {', 'const TIER = perfTier();');
  const pick = env => { const ctx = { navigator: env.nav || {}, window: env.win || {}, console }; vm.createContext(ctx); vm.runInContext(tierSrc + '\nthis.tier = perfTier();', ctx); return ctx.tier; };
  // an unfolded flip phone held sideways: wide enough (1000) and tall enough (840) to pass the old size checks
  const unfoldedUA = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8, userAgent: 'Mozilla/5.0 (Linux; Android 14; motorola razr 2024) Mobile Safari' }, win: { innerWidth: 1000, innerHeight: 840, devicePixelRatio: 1 } });
  assert.equal(unfoldedUA.name, 'low', 'a mobile user agent with a big unfolded screen is still a phone (Low)');
  const unfoldedDpr = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 1000, innerHeight: 840, devicePixelRatio: 2.6 } });
  assert.equal(unfoldedDpr.name, 'low', 'a 2.6x touch screen with a short side of 840 px is a phone (Low)');
  const tablet = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, win: { innerWidth: 1024 } });
  assert.equal(tablet.name, 'medium', 'the big-tablet mock of validate-performance stays Medium');
  const ipad = pick({ nav: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }, win: { innerWidth: 1180, innerHeight: 820, devicePixelRatio: 2 } });
  assert.equal(ipad.name, 'medium', 'an iPad (not "Mobile", DPR 2) stays Medium');
  for (const t of [unfoldedUA, unfoldedDpr, tablet]) assert.equal(t.shadowEvery, 1, 'shadows still refresh every frame');
}

// ---------------------------------------------------------------- 3.2 deep-indoor culling
{
  const src = cut('function enclAt(x, y, z) {', 'function indoorCullShow(hid) {') + fnSrc(html, 'indoorCullShow');
  const scene = new T.Scene();
  // the shop's walls: closed all round except the 4 m doorway in the east wall at z 15 (listed as an opening below)
  const wallSegs = [[0, 0, 40, 0], [40, 0, 40, 13], [40, 17, 40, 30], [40, 30, 0, 30], [0, 30, 0, 0]];
  const ctx = { T, scene, ENCL: [], wallSegs, walk: { on: true }, VIEW: { third: false }, GRASS: { chunk: 64, chunks: new Map() }, renderer: { shadowMap: { needsUpdate: false } }, performance: { now: () => 0 }, Math, console };
  ctx.camera = new T.PerspectiveCamera(70, 16 / 9, 0.1, 2000);
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.INDOOR = INDOOR; this.indoorCullHide = indoorCullHide; this.indoorCullShow = indoorCullShow; this.indoorCullWant = indoorCullWant;', ctx);
  assert.equal(ctx.INDOOR.enabled, false, 'v1.97.27: indoor culling is off unless switched on (it hid walls the owner could see)');
  ctx.INDOOR.enabled = true;   // the rest of this block tests it switched on
  const shop = { x0: 0, x1: 40, z0: 0, z1: 30, top: 8, area: 1200, wins: [[40, 1.7, 15, 4]] };   // one doorway, in the east wall
  ctx.ENCL.push(shop);
  const box = (x, z, still) => { const m = new T.Mesh(new T.BoxGeometry(2, 2, 2), new T.MeshBasicMaterial()); m.position.set(x, 1, z); m.updateMatrix(); m.updateMatrixWorld(true); if (still) m.matrixAutoUpdate = false; scene.add(m); return m; };
  const outside = box(-80, 15, true), inside = box(10, 15, true), straddle = box(0, 15, true), truckOut = box(-90, 15, false), roofTop = box(20, 15, true);
  roofTop.position.y = 14; roofTop.updateMatrix(); roofTop.updateMatrixWorld(true);
  const grassMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial()); ctx.GRASS.chunks.set('far', { x: -96, z: 0, meshes: [grassMesh] });
  const grassNear = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial()); ctx.GRASS.chunks.set('near', { x: 32, z: 0, meshes: [grassNear] });
  const look = (x, z, yaw) => { ctx.camera.position.set(x, 1.6, z); ctx.camera.rotation.set(0, yaw, 0); ctx.camera.updateMatrixWorld(true); };
  look(12, 15, -Math.PI / 2);   // facing +x... three cameras look down -z, so yaw -90 deg looks toward +x (the doorway)
  let hid = ctx.indoorCullHide(0);
  assert.equal(hid, null, 'looking at the doorway: nothing is culled');
  look(12, 15, Math.PI / 2);    // back to the doorway, looking at the west wall
  hid = ctx.indoorCullHide(0);
  assert.ok(hid && hid.includes(outside), 'a static mesh wholly outside the shop is hidden for the draw');
  assert.ok(hid.includes(roofTop), 'and so is one above the roof');
  assert.ok(!hid.includes(inside) && !hid.includes(straddle), 'meshes inside the shop or in its wall are drawn');
  assert.ok(!hid.includes(truckOut), 'moving things (matrixAutoUpdate) are never touched');
  assert.ok(hid.includes(grassMesh) && !hid.includes(grassNear), 'grass chunks outside the shop are hidden, the one over it is not');
  assert.equal(outside.visible, false, 'hidden during the draw');
  assert.equal(ctx.renderer.shadowMap.needsUpdate, true, 'the shadow map is redrawn when culling starts');
  ctx.indoorCullShow(hid);
  assert.ok(outside.visible && roofTop.visible && grassMesh.visible, 'and shown again straight after it: game code never sees the change');
  // already-hidden things stay hidden (we only restore what we hid)
  outside.visible = false; hid = ctx.indoorCullHide(0); ctx.indoorCullShow(hid); assert.equal(outside.visible, false, 'something hidden by the game stays hidden'); outside.visible = true;
  look(37.5, 15, Math.PI / 2); assert.equal(ctx.indoorCullHide(0), null, 'standing next to the doorway (even facing away): nothing is culled');
  look(12, 15, Math.PI / 2); ctx.VIEW.third = true; assert.equal(ctx.indoorCullHide(0), null, 'third person: nothing is culled');
  ctx.VIEW.third = false; ctx.walk.drive = true; assert.equal(ctx.indoorCullHide(0), null, 'driving: nothing is culled'); ctx.walk.drive = false;
  look(-30, 15, Math.PI / 2); assert.equal(ctx.indoorCullHide(0), null, 'outdoors: nothing is culled');
  { // v1.97.27: a small lighting room inside the hall must not be the one culled round (that hid the hall's own walls)
    const room = { x0: 5, x1: 20, z0: 10, z1: 20, top: 4, area: 150, wins: [[20, 1.7, 15, 3]] }; ctx.ENCL.push(room);
    look(12, 15, Math.PI / 2); ctx.renderer.shadowMap.needsUpdate = false; const h = ctx.indoorCullHide(0);
    assert.ok(h && !h.includes(inside) && h.includes(outside), 'it culls round the outer hall: the hall\'s own things stay drawn'); ctx.indoorCullShow(h);
    ctx.ENCL.pop(); }
  { // a gap in the walls that is not a listed opening (an open side) means it never culls
    wallSegs.splice(3, 1); const S2 = { ...shop, wins: shop.wins.slice() }; delete S2.sealed;   /* (the sealed check is cached per envelope) */ ctx.ENCL[0] = S2;
    look(12, 15, Math.PI / 2); assert.equal(ctx.indoorCullHide(0), null, 'an open side we cannot account for: draw everything');
    wallSegs.splice(3, 0, [40, 30, 0, 30]); ctx.ENCL[0] = shop; }
  shop.wins.length = 0; look(12, 15, Math.PI / 2); assert.equal(ctx.indoorCullHide(0), null, 'a room with no listed openings is never culled');
  // wired round the world render, inside the title guard, without moving the pinned lines
  const r = html.indexOf('    const _ic = indoorCullHide();\n    const _rt = performance.now();\n    renderer.render(scene, camera);\n    indoorCullShow(_ic);\n');
  assert.ok(r > html.indexOf('if (!PERF.title) {') && r > html.indexOf('shadowFollow(); shadowRefresh(); renderer.info.reset();'), 'culling wraps the world render, after the shadow refresh');
}

// ---------------------------------------------------------------- 3.3 no per-frame class writes / hidden #out updates
{
  const src = fnSrc(html, 'bodyCls');
  let writes = 0; const set = new Set(['walking']);
  const classList = { contains: c => set.has(c), toggle: (c, on) => { writes++; if (on) set.add(c); else set.delete(c); return on; } };
  const ctx = { document: { body: { classList } } }; vm.createContext(ctx); vm.runInContext(src + '\nthis.bodyCls = bodyCls;', ctx);
  for (let i = 0; i < 60; i++) { ctx.bodyCls('driving', false); ctx.bodyCls('walking', 1); }
  assert.equal(writes, 0, 'a second of frames with nothing changing writes no class at all');
  ctx.bodyCls('driving', true); ctx.bodyCls('driving', true); assert.equal(writes, 1, 'a change is written once'); assert.ok(set.has('driving'));
  const pad = fnSrc(html, 'padCam'), body = fnSrc(html, 'frameBody');
  assert.ok(!/document\.body\.classList\.toggle\(/.test(pad) && !/document\.body\.classList\.toggle\(/.test(body), 'padCam and frameBody no longer toggle body classes directly');
  assert.ok(body.indexOf("bodyCls('driving'") > body.indexOf('P3.update(sim, sdt, evs)'), 'the body classes are set after the world update (no style change before the minimap layout read)');
  assert.ok(pad.includes('if (bar.dataset.w !== w) { bar.dataset.w = w; bar.firstChild.style.width = w; }'), 'the NOS bar width is only written when it changes');
  assert.ok(body.includes("if ($('out').offsetParent) updateOuts();"), 'the hidden #out tiles are not reformatted 5 times a second');
}

// ---------------------------------------------------------------- 3.4 the minimap blits only the part it shows
{
  const src = fnSrc(html, 'minimapUpdate');
  const calls = [];
  const g = new Proxy({ drawImage: (...a) => calls.push(a) }, { get: (o, k) => k in o ? o[k] : (() => {}), set: () => true });
  const el = { getClientRects: () => [1], clientWidth: 118, width: 236, height: 236, getContext: () => g };
  const MMAP = { cv: { width: 2048, height: 2048 }, x0: -160, z0: -60, mpp: 0.5, W: 2048, H: 2048, job: null, again: 0, bakes: 2, t: 0, R: 90 };
  const ctx = { walk: { on: true, x: 200, z: 300 }, document: { getElementById: () => el }, window: { devicePixelRatio: 2 }, MMAP, NET: {}, utv: {}, tv: new T.Vector3(), camera: new T.PerspectiveCamera(), Math, mmapGuard: f => f() };
  vm.createContext(ctx); vm.runInContext(src + '\nthis.minimapUpdate = minimapUpdate;', ctx);
  ctx.minimapUpdate(0.1);
  const d = calls.find(a => a[0] === MMAP.cv); assert.ok(d, 'the baked map is drawn');
  assert.equal(d.length, 9, 'with a source rectangle (9-argument drawImage)');
  const [, sx, sy, sw, sh, dx, dy, dw, dh] = d, side = Math.ceil(2 * 90 * 1.45 / 0.5) + 2;
  assert.ok(sw <= side && sh <= side, 'only about ' + side + ' px square of the 2048 px picture (' + sw + ' x ' + sh + ')');
  assert.ok(sx >= 0 && sy >= 0 && sx + sw <= 2048 && sy + sh <= 2048, 'inside the picture');
  assert.ok(Math.abs(dx - (MMAP.x0 + sx * 0.5)) < 1e-9 && Math.abs(dw - sw * 0.5) < 1e-9 && Math.abs(dy - (MMAP.z0 + sy * 0.5)) < 1e-9 && Math.abs(dh - sh * 0.5) < 1e-9, 'drawn at the same world place as before');
  assert.ok(dx <= 200 - 90 && dx + dw >= 200 + 90 && dy <= 300 - 90 && dy + dh >= 300 + 90, 'and covering the whole circle the widget shows');
}

// ---------------------------------------------------------------- 3.5 skinSwing: same pose, no allocations, settled limbs skipped
{
  const src = cut('const _sqR = new T.Quaternion()', 'const SKIN_X = new T.Vector3(1, 0, 0);');
  let made = 0;
  const TC = Object.create(T, { Quaternion: { value: class extends T.Quaternion { constructor(...a) { super(...a); made++; } } }, Vector3: { value: class extends T.Vector3 { constructor(...a) { super(...a); made++; } } } });
  const ctx = { T: TC }; vm.createContext(ctx); vm.runInContext(src + '\nthis.skinSwing = skinSwing;', ctx);
  const rig = () => { const root = new T.Group(), hip = new T.Bone(), thigh = new T.Bone(), knee = new T.Bone(), foot = new T.Bone();
    root.rotation.y = 0.7; root.position.set(3, 0, 1); hip.position.y = 1; hip.rotation.z = 0.2; thigh.position.set(0.1, -0.1, 0); knee.position.y = -0.45; foot.position.y = -0.45;
    root.add(hip); hip.add(thigh); thigh.add(knee); knee.add(foot); root.updateMatrixWorld(true); return { root, thigh, knee, foot, rT: thigh.quaternion.clone(), rK: knee.quaternion.clone() }; };
  const old = (root, bone, rest, axis, ang) => {   // the v1.97.195 implementation, kept here as the reference
    root.updateMatrixWorld(true);
    const rq = root.getWorldQuaternion(new T.Quaternion()), ax = axis.clone().applyQuaternion(rq).normalize();
    const pw = bone.parent.getWorldQuaternion(new T.Quaternion()), w = pw.clone().multiply(rest);
    bone.quaternion.copy(pw.invert().multiply(new T.Quaternion().setFromAxisAngle(ax, ang).multiply(w))); root.updateMatrixWorld(true); };
  const X = new T.Vector3(1, 0, 0), a = rig(), b = rig();
  made = 0;
  for (const [ang, kAng] of [[0.5, 0.3], [-0.4, 0.55], [0.2, 0]]) {
    ctx.skinSwing(a.root, a.thigh, a.rT, X, ang); ctx.skinSwing(a.root, a.knee, a.rK, X, kAng);
    old(b.root, b.thigh, b.rT, X, ang); old(b.root, b.knee, b.rK, X, kAng);
    const pa = a.foot.getWorldPosition(new T.Vector3()), pb = b.foot.getWorldPosition(new T.Vector3());
    assert.ok(pa.distanceTo(pb) < 1e-6, 'the foot lands exactly where the old skinSwing put it');
    assert.ok(a.thigh.quaternion.angleTo(b.thigh.quaternion) < 1e-6 && a.knee.quaternion.angleTo(b.knee.quaternion) < 1e-6, 'with the same bone rotations');
  }
  assert.equal(made, 0, 'skinSwing itself allocates no quaternions or vectors');
  assert.equal(a.thigh.matrixWorldNeedsUpdate, true, 'the swung bone is flagged so the next scene update re-poses its children');
  ctx.skinSwing(a.root, null, a.rT, X, 1); { const lone = new T.Bone(); ctx.skinSwing(a.root, lone, lone.quaternion, X, 1); }   // no bone / no parent: a no-op, not a throw
  const upd = fnSrc(html, 'updateSelfAv');
  assert.ok(upd.includes('if (Math.abs(t - l.cur) > 1e-4)') && upd.includes('l.cur = t; l.posed = true;'), 'a settled limb is snapped to its target and then left alone');
  assert.ok(html.includes('skinSwing(l.root, l.b, l.rest, SKIN_X, l.cur)'), 'and the walk cycle still swings each bone about the model X axis');
}

// ---------------------------------------------------------------- 3.6 leaks: dead critters, trucks, Nibblers, fallbacks, audio
{   // the launcher no longer wraps dead critters as permanent corn props (v1.97.198: the whole dead-critter carry is gone)
  for (const f of ['cornSyncDeadCritters', 'cornCritterWrap', 'cornCritterDead']) assert.ok(!launcher.includes(f), f + ' is gone: no corpse ever becomes a corn prop or a collider');
  assert.ok(!/isCritter:true/.test(launcher), 'nothing creates a critter corn item');
  assert.ok(launcher.includes("if(t.held||t.net==='them'||t.isCritter||"), 'and the corn carry still skips critters');
}
{   // a despawned semi frees its own GPU buffers, never the shared ones
  const src = cut('let HAULER_LOAD_GEO = null, HAULER_POUR_GEO = null;', 'function haulerTruck(look) {');
  const scene = new T.Scene(), MATS = {}; MATS[0xffffff] = new T.MeshLambertMaterial();
  const ctx = { T, scene, MATS, HAULER: { proto: [] } }; vm.createContext(ctx); vm.runInContext(src + '\nthis.disposeUnused = disposeUnused; this.setGeo = g => { HAULER_LOAD_GEO = g; };', ctx);
  const freed = []; const spy = (o, n) => { o.dispose = () => freed.push(n); return o; };
  const sharedGeo = spy(new T.BoxGeometry(), 'sharedGeo'), protoGeo = spy(new T.BoxGeometry(), 'protoGeo'), loadGeo = spy(new T.BoxGeometry(), 'loadGeo');
  const ownGeo = spy(new T.BoxGeometry(), 'ownGeo'), ownMat = spy(new T.MeshLambertMaterial(), 'ownMat'); spy(MATS[0xffffff], 'MATS');
  ctx.setGeo(loadGeo); const proto = new T.Group(); proto.add(new T.Mesh(protoGeo, ownMat)); ctx.HAULER.proto.push(proto);
  scene.add(new T.Mesh(sharedGeo, new T.MeshLambertMaterial()));   // another truck still on the road
  const gone = new T.Group(); for (const [geo, m] of [[ownGeo, ownMat], [sharedGeo, MATS[0xffffff]], [protoGeo, MATS[0xffffff]], [loadGeo, MATS[0xffffff]]]) gone.add(new T.Mesh(geo, m));
  ctx.HAULER.proto.length = 0; ctx.disposeUnused(gone);
  assert.deepEqual(JSON.stringify(freed.sort()), JSON.stringify(['ownGeo', 'ownMat', 'protoGeo'].sort()), 'its own geometry and material are freed; shared colours, the shared load box and anything still on screen are not');
  freed.length = 0; ctx.HAULER.proto.push(proto); ctx.disposeUnused(gone);
  assert.ok(!freed.includes('protoGeo') && !freed.includes('ownMat'), 'and a hauler prototype keeps its geometry and material');
  assert.ok(html.includes('if (v.done) { scene.remove(v.g); disposeUnused(v.g); }'), 'the host frees a semi when it leaves');
  assert.ok(launcher.includes("if(typeof disposeUnused==='function')disposeUnused(old.g);"), 'and so does the guest when the host drops it');
  const ht = fnSrc(html, 'haulerTruck');
  assert.ok(ht.includes('HAULER_LOAD_GEO || (HAULER_LOAD_GEO = new T.BoxGeometry(2.2, 0.32, 10.4))') && ht.includes('HAULER_POUR_GEO || (HAULER_POUR_GEO = new T.CylinderGeometry(0.35, 0.7, 1, 8))'), 'every hauler shares one load box and one pour cylinder');
  const rs = fnSrc(html, 'rangerSkin'); assert.ok(rs.includes('for (const c of gone) disposeUnused(c);'), 'the box Ranger parts are freed when the model replaces them');
}
{   // Nibblers free their own sprite material, never the shared frame textures
  const src = fnSrc(html, 'nibDispose');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src + '\nthis.nibDispose = nibDispose;', ctx);
  let n = 0; const tex = new T.Texture(); tex.dispose = () => { throw new Error('the shared frame texture was freed'); };
  const sm = new T.SpriteMaterial({ map: tex }); sm.dispose = () => n++;
  ctx.nibDispose({ kind: 'nibbler', sp: { material: sm } }); ctx.nibDispose({ kind: 'nibbler', sp: { material: sm } }); ctx.nibDispose({ kind: 'stalker', sp: { material: sm } }); ctx.nibDispose(null);
  assert.equal(n, 1, 'a Nibbler material is freed once; other creatures are left alone');
  const creeps = cut("// ---------- THE NORTH CORN FIELD'S CREATURES (v1.97.108)", '\n// pigeon coo, synthesized like the train');
  assert.equal((creeps.match(/nibDispose\(/g) || []).length, 6, 'freed at every removal: gone, over the corpse cap, kind change, missing from the host snapshot, debug clear (+ the definition)');
}
{   // the launcher's stand-in meshes are freed when the real model arrives
  assert.ok(launcher.includes("for(const c of item.g.children)if(c.userData.cornFallback){c.geometry.dispose();c.material.dispose();}") && launcher.includes('mesh.userData.cornFallback=true;'), 'corn props free their stand-in');
  assert.ok(html.includes("    for (const c of m.children) if (c.isMesh && c.geometry && c.material && !c.material.isShaderMaterial) { c.geometry.dispose(); c.material.dispose(); }   // (the extTex() picture itself is shared)\n    m.clear(); m.add(obj);"), 'and so does the extinguisher (v1.97.74: in the game itself, no longer a launcher patch)');
  assert.ok(html.includes('if (MMAP.bakes >= 2 && MMAP.flat && !(MMAP.again > 0)) {'), 'the minimap frees its stand-in materials after the last bake');
}
{   // noise buffers are made once per context and length
  const src = cut('const NOISE_BUFS = new WeakMap();', 'function burst(sec, type, freq, vol, dest, shape) {');
  const ctx = { Math, WeakMap, Map }; vm.createContext(ctx); vm.runInContext(src + '\nthis.noiseBuf = noiseBuf;', ctx);
  let made = 0; const C = { sampleRate: 1000, createBuffer: (ch, n) => { made++; return { n, getChannelData: () => new Float32Array(n) }; } };
  const a = ctx.noiseBuf(C, 1), b = ctx.noiseBuf(C, 1), c = ctx.noiseBuf(C, 0.9);
  assert.equal(a, b, 'the same second of noise is reused'); assert.equal(c.n, 900, 'a different length gets its own'); assert.equal(made, 2, 'two buffers, not three');
  for (let i = 0; i < 200; i++) ctx.noiseBuf(C, 0.001 * (i + 1)); assert.ok(made <= 202, 'odd lengths still work');
  const C2 = { sampleRate: 1000, createBuffer: (ch, n) => { made++; return { n, getChannelData: () => new Float32Array(n) }; } }; assert.notEqual(ctx.noiseBuf(C2, 1), a, 'buffers are per AudioContext');
  assert.ok(fnSrc(html, 'utvIgnition').includes('const nb = noiseBuf(C, 1);') && fnSrc(html, 'utvWhoosh').includes('nb = noiseBuf(C, 0.9);'), 'the engine start and NOS hiss use the cache');
  assert.ok(fnSrc(html, 'radioSquelch').includes("(typeof tsnd !== 'undefined' && tsnd.ctx) ||"), 'the radio squelch shares the game AudioContext');
  for (const [f, s] of [['kiaVoice', 'o.onended = () => { o.disconnect(); g.disconnect(); };'], ['kiaNoise', 's.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };'], ['cornRustle', 's.onended = () => { s.disconnect(); f.disconnect(); g.disconnect(); };'], ['crossingBell', 'if (f === 1180) { out.disconnect(); if (pn) pn.disconnect(); }']])
    assert.ok(fnSrc(html, f).includes(s), f + ' disconnects its nodes when they finish');
}
{   // launcher: title music guard and parallel helper fetches
  assert.ok(launcher.includes("const originalMusicPlay='function musicPlay() { if (musicOn && !document.hidden) { const p = music.play(); if (p && p.catch) p.catch(() => {}); } }';"), 'the music anchor is untouched');
  assert.ok(html.includes('function musicPlay() { if (musicOn && !document.hidden) { const p = music.play(); if (p && p.catch) p.catch(() => {}); } }'), 'and still matches the game');
  assert.ok(launcher.includes("if (musicOn && music.paused && !document.hidden && !(window.__splashOn && window.__splashOn()))"), 'the title only calls play() when the music is paused');
  assert.ok(launcher.includes("await Promise.all(\n   ['note-sharing.js','inbox.js','inbox-config.json','sound-settings.js','acid-liquid.js','cooler-door-audio.js'].map(helperFetch));"), 'the six helper files are fetched in parallel');
  assert.equal((launcher.match(/await fetch\('\.\/(note-sharing|inbox|sound-settings|acid-liquid|cooler-door-audio)/g) || []).length, 0, 'none of them one after another any more');
}
console.log('PASS: perf + leaks (v1.97.196: foldables on Low; deep-indoor culling hides only static meshes and grass outside the room while no opening is in view, restored after the draw; body classes and the NOS bar write only on change, after the world update; hidden #out left alone; minimap blits a ~520 px crop; skinSwing matches the old pose with no allocations and settled limbs are skipped; no dead-critter collider growth; semis, Ranger box parts, Nibblers, corn/extinguisher stand-ins and minimap stand-ins free their GPU state; cached noise; finished audio nodes disconnect; title music guard; parallel helper fetches)');
