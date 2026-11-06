// Run from the test/ directory: node validate-title-render.cjs
// v1.97.148: the plant was being drawn behind the title screen. #splash is an opaque panel (#070403) carrying its own 3D
// bonfire on its own renderer and canvas (title3D), so every pixel the world pass produced under it was thrown away - a full
// shadow pass, world pass and HUD pass, every frame, while the phone is already busy with the title's fire. The gate:
//  1. the world render, the shadow refresh and the HUD pass are skipped while the title covers the window;
//  2. the simulation is NOT skipped (clock, netcode, roof map keep running - that is free time behind the title);
//  3. the first TITLE_WARM frames are still drawn, because they are what upload the textures and warm the shaders;
//  4. the gate opens on the first frame of the title's own `.out` fade, not when the element is finally removed;
//  5. nothing to gate (no title, title gone) means draw, so the LIVE entry point and any embedder still render.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const fn = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };

// ---------------------------------------------------------------- the reason it is safe: the title is opaque
assert.ok(/#splash\{[^}]*background:#070403/.test(html), 'the title panel is opaque, so the plant behind it is never on screen');
assert.ok(/#splash\.out\{opacity:0/.test(html), 'and it fades out (the world has to be drawn during that fade)');
assert.ok(/function title3D\(T\)/.test(html) && html.includes("var renderer = new T.WebGLRenderer({ canvas: cv, antialias: false, powerPreference: 'low-power' });"),
  'the bonfire on the title has its own renderer and canvas, so skipping the world pass cannot touch it');
assert.ok(/R3\.stop\(\); R3 = null;/.test(html) && /forceContextLoss/.test(html), 'and it is torn down with the splash');

// ---------------------------------------------------------------- the rule, run for real
const src = fn(html, 'titleHidesWorld'), warmLine = html.slice(html.indexOf('const TITLE_WARM = '), html.indexOf('\n', html.indexOf('const TITLE_WARM = ')));
assert.ok(warmLine && /const TITLE_WARM = (\d+);/.test(warmLine), 'the warm-up is a named constant');
const WARM = +warmLine.match(/const TITLE_WARM = (\d+);/)[1];
assert.ok(WARM >= 10 && WARM <= 120, 'a warm-up short enough to save the frames, long enough to load the textures (' + WARM + ' frames)');
const ctx = { Math }; vm.createContext(ctx);
vm.runInContext(warmLine + '\n' + src + '\nthis.hides = titleHidesWorld;', ctx);
const H = ctx.hides;
const el = (out, connected = true) => ({ isConnected: connected, classList: { contains: c => c === 'out' && out } });
assert.equal(H(null, 999), false, 'no title element: draw (the LIVE entry point, an embedder, or the title already removed)');
assert.equal(H(el(false, false), 999), false, 'a title that is no longer in the document: draw');
assert.equal(H(el(false), WARM - 1), false, 'the warm-up frames are drawn (they upload the textures)');
assert.equal(H(el(false), WARM), true, 'after them, the gate closes');
assert.equal(H(el(false), WARM + 5000), true, 'and stays closed however long the player sits there');
assert.equal(H(el(true), WARM + 5000), false, 'the moment the title starts to fade, the world is drawn again - through the whole 1.2 s fade');
assert.equal(H(el(true), 0), false, 'even during the warm-up, if it is already fading');

// ---------------------------------------------------------------- wired into the frame
const upd = fn(html, 'update');
const guard = upd.indexOf('PERF.title = titleCover();');
assert.ok(guard > 0, 'update() asks the gate once a frame');
assert.ok(upd.indexOf('if (!PERF.title) {') > guard, 'and everything that draws sits inside it');
for (const s of ['if (renderer.shadowMap.enabled) { shadowFollow(); shadowRefresh(); }', 'renderer.info.reset();', 'renderer.render(scene, camera);', 'PERF.dc = renderer.info.render.calls;', 'drawHudGun();'])
  assert.ok(upd.indexOf(s) > upd.indexOf('if (!PERF.title) {'), s.trim() + ' is inside the guard');
assert.ok(upd.includes('} else { renderer.info.reset(); PERF.draw = PERF.dc = PERF.tri = 0; }'), 'and the skip path reports 0 dc / 0 tri / 0 ms, so the fps line cannot show the last world frame');
assert.ok(upd.indexOf("stepSafe('lighting', () => lightUpdate(dt));") < guard, 'the lighting is still updated - only the drawing stops');
{ const drawAt = upd.indexOf('renderer.render(scene, camera);'); assert.ok(drawAt > 0 && upd.slice(drawAt).indexOf('</script>') < 0, 'the world render is in update(), as before'); }
// the simulation is not gated: frameBody still steps the world and calls P3.update no matter what
const body = fn(html, 'frameBody');
assert.ok(body.includes('Sim.step(sim,') && body.includes('P3.update(sim, sdt, evs);'), 'the simulation still runs behind the title (clock, netcode, roof map)');
assert.ok(!body.includes('titleCover'), 'the gate is not in the frame body: it only decides whether to draw');
// the warm-up counts drawn frames, after the pacing gate, through the bridge (the counter is engine-block state)
const frameSrc = fn(html, 'frame');
assert.ok(frameSrc.includes('P3.frameDrawn();'), 'frame() counts the frames it draws, through the bridge');
assert.ok(!frameSrc.includes('titleFrames'), 'and never touches the engine block\'s counter directly (that threw a ReferenceError in v1.97.149-152, see validate-frame-loop.cjs)');
assert.ok(frameSrc.indexOf('P3.frameDrawn()') > frameSrc.indexOf('if (PACE.k > 1'), 'after the pacing skip, so a capped screen warms up at the rate it draws');
assert.ok(frameSrc.indexOf('P3.frameDrawn()') < frameSrc.indexOf('frameBody(now)'), 'and before the frame body runs');
assert.ok(html.includes('frameDrawn: () => { titleFrames++; },'), 'the bridge bumps that counter');
// the readout can say so, the same way it says PAUSED / noGun
assert.ok(html.includes("(pf.title ? ' · title' : '')"), 'the fps line names the state');
assert.ok(html.includes("err: '', msg: '', title: false }"), 'P3.perf carries it');
// a bug-note snapshot draws its own frame, so it can never depend on the gate
assert.ok(fn(html, 'snapshot').includes('renderer.render(scene, camera);'), 'snapshot() still renders its own frame');
// go() opens the gate and leaves the splash state on one line (a mid-line // once swallowed half of it)
{ const line = html.split('\n').find(l => l.includes('live = false;'));
  assert.ok(line && line.includes("sp.classList.add('out')"), 'go() adds .out on the same line as live = false');
  assert.equal(line.split('//')[0].includes('sp.classList.add'), true, 'and that statement is live code, not behind a // comment'); }
// The title exit uses the real walking setup, even when third person was saved.
const shopStart = html.slice(html.indexOf('function startInShop()'), html.indexOf('// title screen menu choices'));
assert.ok(shopStart.includes('window.__splashDone'), 'the shop spawn is wired to the title exit');
for (const splash of [true, false]) {
  const cam = {}, walk = {}, VIEW = { third: true };
  let ui = 0;
  const start = {
    cam, walk, VIEW, window: splash ? { __splashOn: () => true } : {},
    setWallsSolid() {}, colliders: {}, ROOFMAP: { again: -1 }, pushOut() {},
    camera: { updateProjectionMatrix() {} }, musicPlay() {}, setWalkUI() { ui++; }
  };
  vm.createContext(start);
  vm.runInContext(fn(html, 'walkStart') + '\nthis.P3 = { cam, walkStart };\n' + shopStart, start);
  if (splash) {
    assert.equal(walk.on, undefined, 'the title does not start walking behind the menu');
    start.window.__splashDone();
  }
  assert.deepEqual([walk.on, walk.x, walk.z, walk.yaw, VIEW.third, ui], [true, 10, 27, 0.35, false, 1],
    'the game opens in first person on the Maintenance Shop floor and refreshes the walking controls');
}

console.log('PASS: the plant is not drawn behind the title (opaque splash, its bonfire on its own renderer): ' + WARM + ' warm-up frames, the fade re-opens the gate, the simulation keeps running, 0 dc reported while covered');
