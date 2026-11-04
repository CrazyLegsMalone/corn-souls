// Run from the test/ directory: node validate-interior-dark.cjs
// v1.97.99 LIGHTING: indoors is dark, lamps make pools, the headlamp cuts through. There is no baked light and no
// occlusion in this world, so on its own the sky lights a room exactly like the yard. Every lit material now carries one
// shared shader patch: a pixel inside a roofed envelope gets only a trickle of sun and sky (more near a window or an open
// door), plus its room's fixture fill and the pools of the nearest lamps. The yard outside never changes, and the power
// outage only takes the lamps away. This suite runs the game's own lighting code over a small scene: the room/window/lamp
// packing, the CPU copy of the shader sum (lightSample), the outage, flicker, blackout, darkness and brightness controls,
// and that the shader patch lands in three.js's real Lambert / Basic programs.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;

// ---------------------------------------------------------------- the source
const dataSrc = html.slice(html.indexOf('const ENCL = [];'), html.indexOf('// ---------- gray metal building'));
const a = html.indexOf('// ---------- LIGHTING (v1.97.99)'), b = html.indexOf('// ---------- POWER OUTAGE: a real power cut.');
assert.ok(a > 0 && b > a, 'the lighting section sits right before the power outage');
const lightSrc = html.slice(a, b);
assert.ok(dataSrc.includes('function enclosure(') && dataSrc.includes('function glazing('), 'the envelope model is in the game');
for (const f of ['function lightInstall(', 'function lightBuild(', 'function lightUpdate(', 'function lightSample(', 'function lightPower(',
  'function lightsFlicker(', 'function lightsBlackout(', 'function lightsDark(', 'function lightBrightness(', 'function enclAt('])
  assert.ok(lightSrc.includes(f), f + ' is in the lighting section');
assert.ok(!html.includes('function applyInteriorDark(') && !html.includes('dimmedMaterial('), 'the old per-mesh dimming (material clones) is gone');

// ---------------------------------------------------------------- wiring
assert.ok(html.includes('scene = new T.Scene(); lightInstall();'), 'the shader patch is installed before anything compiles');
assert.ok(!/new T\.SpotLight\(/.test(html.slice(html.indexOf('function init('), html.indexOf('function init(') + 8000)) && html.includes("headlamp = { intensity: 0, color: new T.Color(0xfff1d6) };"),
  'the headlamp is no longer a three.js SpotLight (that put a light loop on every pixel in the game)');
assert.ok(html.includes('buildBillboards(); buildDirtHills(); buildGrainPiles(); exitSignsForEgress(); meshDoorsBuild(); lightBuild(); ribAll(); mergeStatic();'), 'lamps are collected before the static merge folds their meshes away');
{ const i = html.indexOf("stepSafe('lighting', () => lightUpdate(dt));"), j = html.indexOf('renderer.render(scene, camera);', i), between = html.slice(i, j);
  const code = between.split('\n').filter(l => l.trim() && !l.trim().startsWith('//'));
  assert.ok(i > 0 && j > i && code.length <= 7 && !/renderer\.render\(/.test(between), 'the lighting is updated every frame, after the camera and right before the one render (' + code.length + ' code lines apart)');
  assert.ok(/PERF\.title = titleCover\(\);\n\s*if \(!PERF\.title\) \{/.test(between), 'the only thing between them is the title gate (v1.97.149)'); }
assert.ok(html.includes('CSU.csG.value.w = 1; renderer.render(hudScene, hudCam); CSU.csG.value.w = 0;'), 'the first-person HUD pass bypasses the world lighting');
assert.ok(html.includes('hudHemi.intensity = Math.max(floor, Math.max(0.8, hemi.intensity) * hk + LIGHT.hud.irr * 0.6 + lamp);'), 'and is lit by where you stand instead');
{ const s = html.slice(html.indexOf('function setPowerOutage(on) {'), html.indexOf('POWER_OUTAGE.apply = function'));
  assert.ok(s.indexOf('lightPower(true);') > 0 && s.indexOf('lightPower(true);') < s.indexOf('scene.traverse('), 'lamps are back at their true colour before the outage captures them');
  assert.ok(s.includes('lightPower(false);'), 'and strike up again when the power returns'); }
assert.ok(html.includes("(LIGHT.bg0 || (LIGHT.bg0 = new T.Color())).copy(scene.background);"), 'daylight() hands the undimmed sky to the darkness control');
for (const m of ['const wm = selfLit(', 'const roofM = selfLit(', 'const ceilM = selfLit(', 'const conc = selfLit('])
  assert.ok(html.includes(m), m + ': the fake indoor glow fades with the room light');
assert.equal((html.match(/lampLight\(gridLight\(/g) || []).length, 7, 'seven authored fixtures throw light: receiving ceiling lights, hallway lights, wall packs, the yard pole');
assert.ok(html.includes("['💡 Lights: flicker'") && html.includes("['💡 Lights: blackout nearby (15 s)'") && html.includes("['🌑 Darkness everywhere (20 s)'"), 'the scare controls are on the debug menu');
assert.ok(html.includes("['🔆 Brightness: ' + P3.lights.brightName"), 'the brightness floor is on the pause menu');
assert.ok(html.includes("lights: { flicker: (s, r) => { const v = lightsFlicker(s, r), e = LIGHT.flick; wsLock('dk');") && html.includes("dark: (a, f, h) => { wsLock('dk'); netSend({ t: 'dk', a, f, h }); return lightsDark(a, f, h); },"), 'and exported for scripted events (shared with the other player, v1.97.109)');
// v1.97.100: the headlamp's reach window is clamped (unclamped, (1 - q^2)^2 rose again past the reach and lit a wall 84 m
// down the ferm alley white), and it falls off with the square of the distance like a real torch.
{ const fl = lightSrc.slice(lightSrc.indexOf('if (csFl2.r + csFl2.g > 0.0) {'), lightSrc.indexOf('return k;', lightSrc.indexOf('if (csFl2.r + csFl2.g > 0.0) {')));
  assert.ok(fl.includes('float q = d / csFl0.w; q = max(1.0 - q * q * q * q, 0.0);') && fl.includes('s * q * q / (d * d + 2.0)'), 'headlamp: clamped reach, inverse square');
  const reach = +(lightSrc.match(/csFl0: \{ value: new T\.Vector4\(0, 0\.15, 0, (\d+)\) \}/) || [])[1];
  assert.ok(reach >= 25 && reach <= 60, 'headlamp reach is set (' + reach + ' m)');
  const f = d => { let q = d / reach; q = Math.max(1 - q ** 4, 0); return q * q / (d * d + 2); };
  assert.ok(f(84) === 0 && f(reach + 1) === 0 && f(200) === 0, 'nothing past the reach');
  assert.ok(f(2) > 10 * f(8) && f(8) > 10 * f(30), 'bright close up, a dim shape at 8 m, almost nothing across a big hall'); }
// the DDG barn is roofed, so it is a room (it was missed and stayed daylit in an outage)
{ const s = html.slice(html.indexOf('// ---------- DDG BUILDING'), html.indexOf('// a big pile of DDG inside'));
  assert.ok(s.includes('enclosure(X0, X1, Z0, Z1, H);'), 'the DDG building registers its envelope'); }

// ---------------------------------------------------------------- the shader patch, on three.js's own programs
const store = {};
const ctx = { T, Math, console, performance: { now: () => 0 }, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
  TIER: { name: 'medium' }, scene: new T.Scene(), walk: { on: true, x: 0, y: 0, z: 0 }, cam: { tx: 0, ty: 0, tz: 0 }, clock: 0, EYE: 1.57,
  hemi: { intensity: 1.18 }, POWER_OUTAGE: { on: false }, headlamp: { intensity: 0, color: new T.Color(1, 1, 1) }, O: { rollDoors: [] },
  EXIT_SIGN: { mat: null }, EGRESS: { lens: null }, SKY: { clouds: null }, gridLight: m => { m.userData.gridLight = true; return m; } };
ctx.lampLight = (m, r, k) => { m.userData.lamp = { r, k }; return m; };
vm.createContext(ctx);
vm.runInContext(dataSrc + '\n' + lightSrc + '\nthis.ENCL = ENCL; this.LIGHT = LIGHT; this.CSU = CSU; this.CS_N = CS_N; this.CS_BRIGHT = CS_BRIGHT; this.roomLampEven = roomLampEven; this.HB_STEP = HB_STEP; this.HB_REF = HB_REF;', ctx);
ctx.lightInstall();
{ // Lambert: the patch lands right after the light loops, with every uniform bound to the ONE shared object
  const m = new T.MeshLambertMaterial({ color: 0xffffff }), sh = { fragmentShader: T.ShaderLib.lambert.fragmentShader, vertexShader: T.ShaderLib.lambert.vertexShader, uniforms: {} };
  m.onBeforeCompile(sh);
  assert.ok(sh.fragmentShader.includes('float csLight(vec3 pV, vec3 nV, out vec3 irr)'), 'Lambert carries the lighting function');
  assert.ok(sh.fragmentShader.indexOf('csLight(geometryPosition, geometryNormal, csIrr)') > sh.fragmentShader.indexOf('#include <lights_fragment_end>'), 'and calls it after three.js has summed the sun and sky');
  assert.ok(!sh.fragmentShader.includes('#define CS_GLOW'), 'a plain material keeps its glow alone');
  for (const k of Object.keys(ctx.CSU)) assert.equal(sh.uniforms[k], ctx.CSU[k], k + ' is shared, so one write per frame reaches every material');
  const g = new T.MeshLambertMaterial({ emissive: 0x333333 }); g.userData.csGlow = true;
  const sg = { fragmentShader: T.ShaderLib.lambert.fragmentShader, uniforms: {} }; g.onBeforeCompile(sg);
  assert.ok(sg.fragmentShader.startsWith('#define CS_GLOW'), 'a selfLit surface fades its glow with the light');
  assert.notEqual(m.customProgramCacheKey(), g.customProgramCacheKey(), 'and gets its own program');
  const ph = new T.MeshPhongMaterial(), sp = { fragmentShader: T.ShaderLib.phong.fragmentShader, uniforms: {} }; ph.onBeforeCompile(sp);
  assert.ok(sp.fragmentShader.includes('csLight(geometryPosition'), 'Phong too');
}
{ // Basic: printed surfaces take the darkness, lights / halos / HUD parts never do
  const plate = new T.MeshBasicMaterial({ color: 0xffffff }), lamp = ctx.gridLight(new T.MeshBasicMaterial()), halo = new T.MeshBasicMaterial({ blending: T.AdditiveBlending }),
    hud = new T.MeshBasicMaterial({ depthTest: false }), sky = new T.MeshBasicMaterial({ fog: false }), exit = new T.MeshBasicMaterial(); exit.userData.batteryLight = true;
  const sh = () => ({ fragmentShader: T.ShaderLib.basic.fragmentShader, vertexShader: T.ShaderLib.basic.vertexShader, uniforms: {} });
  const s1 = sh(); plate.onBeforeCompile(s1);
  assert.ok(s1.fragmentShader.includes('csLight(csVP, vec3(0.0), csIrr)') && s1.vertexShader.includes('csVP = mvPosition.xyz;'), 'a name plate is darkened indoors');
  for (const [m, n] of [[lamp, 'a fixture'], [halo, 'an additive halo'], [hud, 'a HUD part'], [sky, 'the clouds'], [exit, 'an EXIT sign']]) {
    const s = sh(); m.onBeforeCompile(s); assert.ok(!s.fragmentShader.includes('csLight'), n + ' is left alone'); assert.equal(m.customProgramCacheKey(), 'cs0');
  }
  assert.equal(plate.customProgramCacheKey(), 'cs1', 'patched and unpatched unlit materials never share a program');
}
{ // Sprites (critters, the vulture, the scarecrows, the nibblers) are unlit billboards: they darken like a printed plate,
  // while additive ones (flames, steam, halos) keep glowing.
  const bug = new T.SpriteMaterial({}), flame = new T.SpriteMaterial({ blending: T.AdditiveBlending });
  const sh = () => ({ fragmentShader: T.ShaderLib.sprite.fragmentShader, vertexShader: T.ShaderLib.sprite.vertexShader, uniforms: {} });
  const s1 = sh(); bug.onBeforeCompile(s1);
  assert.ok(s1.fragmentShader.includes('csLight(csVP, vec3(0.0), csIrr)') && s1.vertexShader.includes('csVP = mvPosition.xyz;'), 'a sprite is darkened indoors');
  const s2 = sh(); flame.onBeforeCompile(s2);
  assert.ok(!s2.fragmentShader.includes('csLight'), 'an additive sprite is left alone');
  assert.equal(bug.customProgramCacheKey(), 'cs1', 'and they never share a program with the unpatched ones');
  assert.equal(flame.customProgramCacheKey(), 'cs0');
}

// ---------------------------------------------------------------- a small world: two rooms (one with a cupboard inside), a yard
const S = ctx.scene;
const shed = ctx.enclosure(-10, 10, -10, 10, 6);                    // windowless shed, roof at 6 m: it gets generated high-bays
const office = ctx.enclosure(20, 30, -5, 5, 3);                     // an office with one window on its north wall
ctx.glazing(office, 25, 1.5, -5, 4);
const cup = ctx.enclosure(26, 30, 2, 5, 2.5);                       // a cupboard inside the office, no window of its own
const mk = (m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(0.3, 0.1, 0.3), m); o.position.set(x, y, z); S.add(o); return o; };
mk(ctx.lampLight(ctx.gridLight(new T.MeshBasicMaterial({ color: 0xffffff })), 5, 2.5), 24, 2.9, 0);   // the office's own ceiling light
mk(ctx.lampLight(ctx.gridLight(new T.MeshBasicMaterial({ color: 0xffffff })), 9, 3), 0, 3, 10.4);     // a wall pack on the shed's outside
ctx.EXIT_SIGN.mat = new T.MeshBasicMaterial({ color: 0xc8211c }); ctx.EXIT_SIGN.mat.userData.batteryLight = true;
mk(ctx.EXIT_SIGN.mat, -9.5, 2.5, 0);                                 // an EXIT sign inside the shed
const door = { x: 0, z: -10, h: 4, open: 0 }; ctx.O.rollDoors.push(door);   // a roll-up door in the shed's north wall
const n = ctx.lightBuild();
const L = ctx.LIGHT;
const gen = L.lamps.filter(l => l.inst >= 0);
assert.equal(gen.filter(l => l.room === shed).length, 1, 'the windowless 20 m shed gets one ceiling high-bay (v1.97.148: the grid is 15 m, it was 4 at 9 m)');
assert.equal(gen.filter(l => l.room === cup).length, 1, 'the cupboard has no light of its own, so it gets one too');
assert.equal(gen.filter(l => l.room === office).length, 0, 'the office keeps its own ceiling light');
assert.ok(gen.filter(l => l.room === shed).every(l => Math.abs(l.y - (6 - 0.35)) < 1e-9), 'hung just under the roof');
// v1.97.148, owner: "there is still too many light fixtures on ceiling looks bad" - a coarser grid, and every room's
// even fill is topped up by the high-bays it lost, so the floor still gets the light the 9 m grid gave it.
assert.equal(ctx.HB_STEP + '/' + ctx.HB_REF, '15/9', 'one high-bay every 15 m, against the 9 m grid it replaced');
assert.ok(html.includes('nx = Math.max(1, Math.round(w / HB_STEP))') && html.includes('(e._boost || 1) * on * LIGHT.lampK'), 'the grid uses it, and the room fill is scaled by the fixtures it lost');
assert.ok(/if \(mine\.length\) e\._boost = \(Math\.max\(1, Math\.round\(w \/ HB_REF\)\) \* Math\.max\(1, Math\.round\(d \/ HB_REF\)\)\) \/ mine\.length;/.test(html), 'the top-up is the fraction of high-bays that room lost');
{ const at = step => Math.max(1, Math.round(23 / step)) * Math.max(1, Math.round(140 / step));
  assert.equal(at(ctx.HB_STEP) + '/' + at(ctx.HB_REF), '18/48', 'the 23 x 140 m hall drops from 48 high-bays to 18');
  assert.equal(at(15) < at(9) / 2, true, 'and every room loses at least half of them'); }
assert.equal(shed._boost, 4, 'the 20 m shed keeps 1 high-bay where 4 hung, so its fill is topped up x4');
assert.equal(L.inst.count, gen.length, 'drawn as ONE instanced mesh');
assert.equal(n, gen.length + 3, 'plus the office light, the wall pack and the EXIT sign');
const pack = L.lamps.find(l => l.z === 10.4), exitL = L.lamps.find(l => l.grid === false);
assert.equal(pack.room, null, 'the wall pack is outdoors'); assert.equal(exitL.room, shed, 'the EXIT sign is in the shed');
assert.ok(shed.wins.some(w => w.door === door), 'the roll-up door is a daylight opening of the shed');
assert.ok(ctx.enclAt(28, 1, 3) === cup && ctx.enclAt(22, 1, 0) === office && ctx.enclAt(50, 1, 50) === null, 'the smallest room wins, outdoors is null');

// The shed's 'tired' lamp flickers on its own at random moments (random seed), which made the exact before/after
// comparisons below fail about 1 run in 30. It is checked here, then held steady for the rest of the suite.
{ const tired = L.lamps.filter(l => l.faulty);
  assert.equal(tired.length, 0, 'no room in this small world has 4+ high-bays any more, so none gets a tired ballast');
  assert.ok(html.includes('for (const list of perRoom.values()) if (list.length >= 4) { const L = list[(list.length * 7 + 3) % list.length]; L.faulty = true;'), 'a big room with 4+ high-bays still gets one tired lamp');
  L.lamps.forEach(l => { l.faulty = false; }); }   // whatever it found, held steady: the before/after comparisons below must not race a flicker
const frame = (dt = 0.1) => { ctx.clock += dt; ctx.lightUpdate(dt); };
const at = (x, y, z) => ctx.lightSample(x, y, z);
const day = () => { ctx.hemi.intensity = 1.18; }, night = () => { ctx.hemi.intensity = 0.66; };
ctx.walk.x = 5; ctx.walk.z = 0; day(); frame(); frame();
assert.ok(ctx.CSU.csG.value.x === 3 && ctx.CS_N.B >= 3, 'all three rooms are uploaded');
{ const A = ctx.CSU.csBoxA.value; assert.ok(A[0].x === 26 && A[2].x === -10, 'smallest first, so the cupboard wins over the office'); }
const cShed = at(0, 1.5, 0), cYard = at(50, 1.5, 50), cWin = at(25, 1.5, -4.5), cDeep = at(28, 1.5, 3.5);
assert.ok(cShed.k <= 0.06, 'midday, middle of the shed: the sun and sky are down to a trickle (k ' + cShed.k + ')');
assert.ok(cShed.irr > 0.5, 'and its own fixtures light it instead (irr ' + cShed.irr.toFixed(2) + ')');
assert.equal(cYard.k, 1, 'the yard gets the full sun'); assert.equal(cYard.irr, 0, 'and no lamp light in the day');
assert.ok(cWin.k > 0.6, 'right at the office window it is bright (k ' + cWin.k.toFixed(2) + ')');
assert.ok(cDeep.k < 0.1 && cDeep.room !== cWin.room, 'and the cupboard behind it is dark');
// the roll-up door: shut it lets a sliver in, open it floods the doorway
const nearDoor = () => at(0, 1.5, -9).k;
door.open = 0; frame(); const shut = nearDoor(); door.open = 1; frame(); const open = nearDoor();
assert.ok(open > shut + 0.3, 'opening the roll-up door lets the daylight in (' + shut.toFixed(2) + ' -> ' + open.toFixed(2) + ')');
door.open = 0; frame();

// ---------------------------------------------------------------- the power outage: the yard is untouched, rooms go black
ctx.POWER_OUTAGE.on = true; ctx.lightPower(true); frame();
const oShed = at(0, 1.5, 0), oYard = at(50, 1.5, 50);
assert.equal(oYard.k, cYard.k, 'an outage never touches the yard (the bug the owner saw)'); assert.equal(oYard.irr, cYard.irr);
assert.ok(oShed.k === cShed.k && oShed.irr < 0.05, 'the shed loses its fill and its high-bays (irr ' + oShed.irr.toFixed(3) + ')');
assert.ok(at(-8.5, 1.5, 0).irr > 0.05, 'the battery EXIT sign still throws a faint red pool');
ctx.POWER_OUTAGE.on = false; ctx.lightPower(false); frame(0.05);
assert.ok(at(0, 1.5, 0).irr < cShed.irr * 0.8, 'power back: the high-bays have to strike up first');
for (let i = 0; i < 50; i++) frame(0.1);
assert.ok(Math.abs(at(0, 1.5, 0).irr - cShed.irr) < 1e-6, 'and five seconds later the shed is exactly as lit as before');

// ---------------------------------------------------------------- night: the outdoor lamps come on
night(); frame();
assert.ok(at(0, 0.5, 13).irr > 0.3, 'at night the wall pack throws a pool on the yard');
assert.equal(at(0, 0.5, 9).irr > cShed.irr, false, 'that pool stays outside the wall (outdoor lamps light outdoor pixels only)');
day(); frame(); assert.equal(at(0, 0.5, 13).irr, 0, 'and it is off in the day');

// ---------------------------------------------------------------- v1.97.145: a room's whole lamp array lights it evenly
// (owner: "when inside lit buildings it seems like the building lights up as you walk through it" - only the nearest few lamps
// made pools, so the far end of a big hall sat on the weak fill and the pools came on round you as you walked)
assert.ok(html.includes('const LAMP_POOL = 0.25, LAMP_EVEN = 1 - LAMP_POOL;') && html.includes('  roomLampEven();\n  LIGHT.ready = true;'), 'each room\'s even lamp light is worked out once, at build');
assert.ok(html.includes('+ LAMP_EVEN * (e._arr || 0) * (e._boost || 1) * on * LIGHT.lampK') && html.includes('(L.room ? LAMP_POOL : LIGHT.night)'), 'the even light is in the room fill (scaled by the high-bays the room lost), and room pools are the small local touch on top');
assert.ok(/w = 1 \/ \(1 \+ \(dx \* dx \+ dz \* dz\) \/ 225\)/.test(html), 'how many fixtures are on counts the ones near you most (so a local blackout still darkens round you)');
// v1.97.148: fewer fixtures must not mean a darker room. The 9 m grid this shed used to get is the reference, measured
// by the game's own roomLampEven, and the shed's fill now has to land on it.
{ const ref = { x0: -10, x1: 10, z0: -10, z1: 10, top: 6, area: 400, wins: [], _lamps: [], _arr: 0 };
  const keep = L.lamps.length, col = shed._lamps[0].col;   // the colour the real high-bays are given (three.js converts it to linear), so the two sides compare like for like
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const x = -10 + (i + 0.5) * 20 / 2, z = -10 + (j + 0.5) * 20 / 2, y = 6 - 0.35;
    L.lamps.push({ x, y, z, r: Math.max(9, (y + 0.6) * 1.6), k: 1.5, grid: true, col, ylo: -1, room: ref, inst: -1 });
  }
  ctx.ENCL.push(ref); ctx.roomLampEven();
  const was = ref._arr;
  ctx.ENCL.pop(); L.lamps.length = keep; ctx.roomLampEven();
  const now = shed._arr * shed._boost;
  console.log('  v1.97.148 high-bays: the shed keeps ' + shed._lamps.length + ' mains fixture with its fill topped up x' + shed._boost + '; even light ' + was.toFixed(4) + ' (the 9 m grid) -> ' + now.toFixed(4));
  assert.ok(was > 0.1 && Math.abs(now / was - 1) < 0.15, 'the shed reads ' + (now / was).toFixed(2) + 'x the floor light the 9 m grid gave (' + was.toFixed(3) + ' -> ' + now.toFixed(3) + ')');
}
// ---------------------------------------------------------------- scare controls
{ const before = at(0, 1.5, 0).irr; ctx.lightsFlicker(3, 30); let lo = 1e9, hi = 0;
  for (let i = 0; i < 25; i++) { frame(0.1); const v = at(0, 1.5, 0).irr; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  assert.ok(lo < before * 0.6 && hi > lo * 2, 'a flicker makes the lights stutter (' + lo.toFixed(2) + '..' + hi.toFixed(2) + ')');
  for (let i = 0; i < 10; i++) frame(0.1);
  assert.equal(L.flick, null, 'it ends on its own'); assert.ok(Math.abs(at(0, 1.5, 0).irr - before) < 1e-6, 'and the lights are back exactly'); }
{ const before = at(0, 1.5, 0).irr; ctx.lightsBlackout(6, 45); for (let i = 0; i < 20; i++) frame(0.1);
  const dark = at(0, 1.5, 0).irr;
  assert.ok(dark < 0.05, 'a local blackout kills the fixtures nearby (irr ' + dark.toFixed(3) + ')');
  assert.ok(at(-8.5, 1.5, 0).irr > 0.05, 'but not the battery EXIT sign');
  assert.ok(L.lamps.filter(l => l.inst >= 0).every(l => l.shown <= 0.07), 'and the fixtures themselves go dark with their pools');
  for (let i = 0; i < 45; i++) frame(0.1);
  assert.equal(L.kill, null); assert.ok(Math.abs(at(0, 1.5, 0).irr - before) < 1e-6, 'then they come back');
  assert.ok(L.lamps.filter(l => l.inst >= 0).every(l => l.shown === 1), 'fixtures too'); }
{ ctx.lightsDark(1, 0.05, 2); for (let i = 0; i < 5; i++) frame(0.1);
  const y = at(50, 1.5, 50).k;
  assert.ok(y <= ctx.LIGHT.minK + 0.02, 'darkness takes even the yard down to the brightness floor (k ' + y.toFixed(3) + ')');
  ctx.lightBrightness(3); frame(); assert.ok(Math.abs(at(50, 1.5, 50).k - 0.15) < 0.02, 'the Brightest setting keeps a 15% floor for screens that crush blacks');
  assert.equal(store.cs_bright, '3', 'and is remembered'); ctx.lightBrightness(1);
  for (let i = 0; i < 40; i++) frame(0.1);
  assert.equal(at(50, 1.5, 50).k, 1, 'the darkness lifts by itself when its time is up'); }

// ---------------------------------------------------------------- packing: each pixel only walks its own lamps and openings
{ night(); frame(); const U = ctx.CSU, G = U.csG.value;
  const runs = []; for (let i = 0; i < G.x; i++) { const z = U.csBoxB.value[i].z, e = Math.floor(z / 64); runs.push([z - e * 64, e]); }
  const nOut = G.y; for (const [s0, s1] of runs) assert.ok(s0 >= nOut || s1 === 0, 'room lamp runs come after the outdoor run');
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) assert.ok(runs[i][1] <= runs[j][0] || runs[j][1] <= runs[i][0] || runs[i][1] === runs[i][0] || runs[j][1] === runs[j][0], 'runs never overlap');
  assert.ok(nOut >= 1, 'the wall pack is in the outdoor run at night'); day(); frame(); }

// ---------------------------------------------------------------- the registration work: each roofed building declares its envelope
assert.ok(/enclosure\(x0, x1, z0, z1, h\);/.test(html), 'the generic building() registers its own envelope');
assert.ok(/for \(const \[c, ow\] of nop\) glazing\(/.test(html), 'and its door openings as daylight');
assert.ok(html.includes('enclosure(WW, EW, NZ, WZS, PH)'), 'the process building west block');
assert.ok(html.includes('enclosure(FXW, FXE, ZN, SZ, PH)'), 'the fermentation alley');
assert.ok(html.includes('enclosure(WW, EW, OZN, OZS, OH)'), 'the office block, nested inside the shed');
assert.ok(html.includes('enclosure(FXE, MX1, SZ, -10, PH)'), 'the shop floor');
assert.ok(/enclosure\(bx0 \+ GDX, bx1 \+ GDX, bz0 \+ GDZ, bz1 \+ GDZ, wallH\)/.test(html), 'the receiving building, in shifted coordinates');
assert.ok(/enclosure\(X0 \+ SH_DX, X1 \+ SH_DX, ZN, ZS, FY \+ H\)/.test(html), 'the scale house, in its shifted coordinates');
assert.ok(/glazing\(E, WINX \+ SH_DX, FY \+ 1\.65, ZN, 3\.6\)/.test(html), 'its two drive-through windows are daylight');
assert.ok(/glazing\(E, EW - 0\.135, 1\.5, OZN \+ 1\.6, 3\.6\)/.test(html), "and the office block's own windows");

// ------------------------------------------------ the floor layering, inside and out
// A floor is a flat plane seen along its own plane, so its depth slope is almost infinite: any polygon offset that is
// multiplied by that slope (polygonOffsetFactor) runs away with distance and pulls the fragments right out of the depth
// range, where they are clipped. That is the bug where concrete 'stopped' a certain distance from the player. The
// layering must ride on the resolution-relative term only.
assert.ok(!/polygonOffsetFactor: back \? 16/.test(html), 'the grass/dirt layering has no slope term');
assert.ok(html.includes('polygonOffsetFactor: 0, polygonOffsetUnits: GB(kind)'), 'it separates the layers by resolution steps only, one table for all of them');
assert.ok(html.includes('m.polygonOffsetFactor = 0; m.polygonOffsetUnits = GLAYER.pad[1];'), 'and so does a concrete pad');
assert.ok(html.includes('a factor of -16 pulled the pads so far forward'), 'the reason is written down next to the code');

for (const script of scripts) if (script.trim()) new vm.Script(script);
console.log('PASS: rooms are dark by day and black in an outage while the yard never changes; windows, doors, fixtures, high-bays, EXIT pools, night pools, flicker, blackout, darkness and brightness all check out');
