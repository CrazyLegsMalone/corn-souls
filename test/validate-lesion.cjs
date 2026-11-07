// Run from the test/ directory: node validate-lesion.cjs
// Guards the Lesion Toolbox (TEST v1.97.24): the owner's in-game dev tools. Runs the real toolbox code in a sandbox:
// it only appears in TEST, placement names things by the game's own handles and copies before/after positions, the
// sliders change the game live and copy only what changed (Reset restores), and the recorder turns frames into a report.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf('// ---------- LESION TOOLBOX'), b = html.indexOf('root.Plant3D = { powerSet: on => powerSet(on),', a);
assert.ok(a > 0 && b > a, 'the toolbox is in the game, ahead of the Plant3D bridge');
const src = html.slice(a, b).replace(/\nif \(typeof document !== 'undefined'\)[^\n]*\n$/, '\n');

const make = (path) => {
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(60, 1.5, 0.1, 500);
  const store = new Map();
  const c = { T, scene, camera, Math, console, FP_BODY: { back: 0.06, waist: 1, armsUp: -1.3, handScale: 1 }, performance: { now: () => c.now }, now: 0,
    location: { pathname: path }, localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }, navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 15; motorola razr 2025) Mobile' },
    window: { APP_VERSION: '1.97.24', devicePixelRatio: 3, innerWidth: 892, innerHeight: 412, CS_PACE: { hz: 120, k: 3 } },
    walk: { on: true, x: 141, z: -80, y: 0, yaw: -Math.PI / 2, lamp: true }, PERF: { dc: 0, tri: 0, draw: 0, errs: 0 }, TIER: { name: 'low' }, INDOOR: { on: false, enabled: true },
    GRASS: { dist: 96, density: 0.00825 }, grassSet: o => Object.assign(c.GRASS, o), SH: { R: 28, on: true, moved: false }, sunL: { shadow: { camera: { updateProjectionMatrix() {} } } },
    headlamp: { intensity: 28 }, LIGHT: { bright: 1 }, lightBrightness: i => { c.LIGHT.bright = i; }, TUNE: { walk: 8.91, sprint: 17.01, fogNear: 120, fogFar: 900, lamp: 28 },
    O: {}, NPCS: [], VEND: { machines: [] }, utv: {}, NET: {}, DEVT: { on: false, sum: {}, max: {} }, enclAt: () => null, floorAt: () => 0.2,
    renderer: { px: 1, getPixelRatio() { return this.px; }, setPixelRatio(v) { this.px = v; }, info: { render: { calls: 0, triangles: 0 }, memory: { geometries: 10, textures: 4 }, programs: [1, 2] } } };
  vm.createContext(c);
  vm.runInContext(src + '\nthis.L = { LESION, DEVR, lesionAllowed, lesionPick, lesionSelect, lesionMove, lesionTurn, lesionHere, lesionUndo, lesionPlaceText, lesionTuneSet, lesionTuneText, lesionTuneReset, devRecStart, devRecSample, devRecStop, devRecReport, lesionCompass, lesionName };', c);
  return c;
};

// ---------------------------------------------------------------- only in TEST
assert.equal(make('/corn-souls/test/index.html').L.lesionAllowed(), true, 'the toolbox shows in TEST');
assert.equal(make('/corn-souls/index.html').L.lesionAllowed(), false, 'and never in LIVE, even if this game file is promoted');
assert.ok(html.includes("body:not(.walking) #lzBtn,body:not(.walking) #lzPanel{display:none!important}"), 'the 🛠 button only shows while you play, not over the title');

// ---------------------------------------------------------------- Place
{
  const c = make('/corn-souls/test/'), L = c.L;
  const fig = new T.Group(); const body = new T.Mesh(new T.BoxGeometry(0.5, 1.7, 0.4), new T.MeshBasicMaterial()); body.position.y = 0.85; fig.add(body);
  fig.position.set(147, 0.2, -80); fig.rotation.y = Math.PI / 2; c.scene.add(fig); c.O.idleP2 = fig;
  const merged = new T.Mesh(new T.BoxGeometry(1, 4, 40), new T.MeshBasicMaterial()); merged.position.set(160, 2, -80); merged.userData.merged = true; c.scene.add(merged);
  c.camera.position.set(141, 1.6, -80); c.camera.lookAt(147, 1, -80); c.camera.updateMatrixWorld(true); c.scene.updateMatrixWorld(true);
  L.lesionSelect();
  assert.equal(L.LESION.sel, fig, 'aiming at the figure picks the whole figure (its scene-level group)');
  assert.equal(L.lesionName(fig), 'O.idleP2', 'named by the game\'s own handle');
  L.LESION.step = 1; L.lesionMove(0, 1, 0); L.lesionMove(0, 1, 0); L.lesionMove(0, 0, 1); L.lesionTurn(1);   // facing east (+x): "right" is +z
  assert.ok(Math.abs(fig.position.z - (-79.5)) < 1e-9 && Math.abs(fig.position.y - 0.45) < 1e-9 && Math.abs(fig.position.x - 147) < 1e-9, 'moves follow where you look, in 0.25 m steps');
  assert.ok(Math.abs(fig.rotation.y - (Math.PI / 2 + Math.PI / 12)) < 1e-9, 'and turns 15° a press');
  assert.ok(fig.matrixWorld.elements[14] === fig.position.z, 'the change is drawn (matrix updated even for frozen statics)');
  const t = L.lesionPlaceText();
  assert.ok(t.includes('- O.idleP2: x 147.00, y 0.45, z -79.50, turn 1.833 rad (105°)   [was x 147.00, y 0.20, z -80.00, turn 1.571]'), 'Copy gives new and old position:\n' + t);
  assert.ok(t.startsWith('Lesion Toolbox - placement (TEST v1.97.24)') && t.includes('collision boxes did not move'), 'with a header and the collision note');
  L.lesionHere(); assert.ok(Math.abs(fig.position.x - 143) < 1e-9 && fig.position.y === 0.2, '"to me" puts it 2 m in front of you, on the floor');
  L.lesionUndo(); assert.ok(fig.position.x === 147 && fig.position.y === 0.2 && fig.rotation.y === Math.PI / 2, 'Undo puts it back');
  assert.equal(L.lesionPlaceText(), '', 'and then there is nothing to copy');
  c.scene.remove(fig); c.scene.updateMatrixWorld(true); L.LESION.sel = null; L.lesionSelect();
  assert.equal(L.LESION.sel, null, 'merged buildings and ground cannot be picked');
}
// ---------------------------------------------------------------- Tune
{
  const c = make('/corn-souls/test/'), L = c.L;
  L.lesionTuneSet('fogFar', 400); L.lesionTuneSet('walk', 10.5); L.lesionTuneSet('scale', 1.5); L.lesionTuneSet('shadow', 40); L.lesionTuneSet('cull', 0); L.lesionTuneSet('grassDist', 120);
  assert.equal(c.TUNE.fogFar, 400); assert.equal(c.TUNE.walk, 10.5); assert.equal(c.renderer.px, 1.5); assert.equal(c.SH.R, 40); assert.equal(c.INDOOR.enabled, false); assert.equal(c.GRASS.dist, 120);
  L.lesionTuneSet('fpBack', 0.25); L.lesionTuneSet('fpWaist', 0.9); L.lesionTuneSet('fpArms', -1.5); L.lesionTuneSet('fpHands', 1.2);
  assert.deepEqual(c.FP_BODY, { back: 0.25, waist: 0.9, armsUp: -1.5, handScale: 1.2 });
  L.lesionTuneSet('lamp', 50); assert.equal(c.headlamp.intensity, 50, 'the headlamp changes live while it is on');
  const t = L.lesionTuneText();
  for (const s of ['Fog solid at (m): 400   [was 900]', 'Walk speed: 10.5   [was 8.91]', 'Shadow distance (m): 40   [was 28]', 'Indoor culling (1 on, 0 off): 0   [was 1]'])
    assert.ok(t.includes(s), 'Copy lists ' + s + '\n' + t);
  assert.ok(!t.includes('Sprint speed'), 'and only what changed'); assert.ok(t.includes('quality low'), 'with the quality setting it was tried on');
  L.lesionTuneReset();
  assert.ok(c.TUNE.fogFar === 900 && c.TUNE.walk === 8.91 && c.renderer.px === 1 && c.SH.R === 28 && c.INDOOR.enabled && c.GRASS.dist === 96, 'Reset all restores every slider');
  assert.deepEqual(c.FP_BODY, { back: 0.06, waist: 1, armsUp: -1.3, handScale: 1 });
  assert.equal(L.lesionTuneText(), '');
  assert.ok(html.includes('const sp = (run ? TUNE.sprint : TUNE.walk)') && html.includes('scene.fog.near = TUNE.fogNear; scene.fog.far = TUNE.fogFar;') && html.includes('headlamp.intensity = on ? TUNE.lamp : 0;'), 'the game reads the tuned values');
}
// ---------------------------------------------------------------- Record
{
  const c = make('/corn-souls/test/'), L = c.L;
  L.devRecStart(); assert.ok(L.DEVR.on && c.DEVT.on, 'recording turns per-system timing on');
  for (let i = 0; i < 200; i++) {
    c.now += i === 120 ? 180 : 25; c.renderer.info.render.calls = i === 120 ? 980 : 400; c.renderer.info.render.triangles = 120000; c.PERF.draw = 6;
    c.walk.x = i === 120 ? 12 : 141; c.walk.z = i === 120 ? 30 : -80; c.walk.yaw = i === 120 ? Math.PI / 2 : 0;
    c.DEVT.sum.shadows = (c.DEVT.sum.shadows || 0) + 6; c.DEVT.max.shadows = 9; c.DEVT.sum.grass = (c.DEVT.sum.grass || 0) + 1; c.DEVT.max.grass = 2;
    L.devRecSample();
  }
  L.devRecStop();
  const r = L.LESION.report;
  assert.ok(!L.DEVR.on && !c.DEVT.on, 'stopping turns the timing off again');
  for (const s of ['Lesion Toolbox - performance recording (TEST v1.97.24)', 'Linux; Android 15; motorola razr 2025', 'Quality: low | screen 120 Hz, drawing every 3 refreshes (target 40 fps)',
    'Hitches over 50 ms: 1 | longest 180 ms', 'Draw calls: avg 403, max 980', 'Slowest systems (avg / worst ms per frame): shadows 6.0', '180 ms at', 'x 12.0, z 30.0, facing west | 980 draw calls'])
    assert.ok(r.includes(s), 'the report has: ' + s + '\n' + r);
  assert.ok(/avg 3\d\.\d fps/.test(r), 'and the real frame rate');
  c.now = 0; L.devRecStart(); c.now = 31000; L.devRecSample(); assert.equal(L.DEVR.on, false, 'it stops by itself after 30 s');
  assert.equal(L.lesionCompass(0), 'north'); assert.equal(L.lesionCompass(-Math.PI / 2), 'east');
}
// ---------------------------------------------------------------- wiring
{
  const i = html.indexOf('function stepSafe(name, fn) {'), s = html.slice(i, html.indexOf('\n}', i) + 2);
  const DEVT = { on: true, sum: {}, max: {} }, ctx = { DEVT, PERF: { errs: 0 }, FAILS: {}, console, performance: { now: (() => { let t = 0; return () => (t += 3); })() } };
  vm.createContext(ctx); vm.runInContext(s + "\nstepSafe('grass', () => {}); stepSafe('grass', () => {});", ctx);
  assert.equal(DEVT.sum.grass, 6, 'stepSafe times each system while recording'); assert.equal(DEVT.max.grass, 3);
  assert.ok(html.includes('    if (DEVR.on) devRecSample();   // v1.97.24: dev performance recorder'), 'the recorder samples each drawn frame');
  assert.ok(html.includes("if (typeof window !== 'undefined') window.CS_PACE = PACE;"), 'and can read the measured refresh');
  assert.ok(html.includes("if (r && r.root) r.root.userData.glb = url.split('/').pop();"), 'loaded models carry their file name');
}
console.log('PASS: Lesion Toolbox (v1.97.24: TEST only, while playing; Place picks by crosshair, names by the game\'s handles, moves relative to the view, to-me / undo, copies new + old positions, refuses merged statics; Tune changes the game live, copies only changes, Reset restores; Record times frames and systems for 30 s into a text report with device, Hz/target, fps, hitches, draw calls, slowest systems and the in-game spots)');
