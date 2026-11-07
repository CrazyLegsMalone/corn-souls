// Run from the test/ directory: node validate-phone-pacing.cjs
// Guards TEST v1.97.26, from the owner's Razr recording (29-45 fps swings, "screen 30 Hz", critters 4.6 ms a frame):
// frames are never early (an even cap instead of bursts), the 40 fps step only holds while the device keeps up, wall-climbing
// lizards probe 5 times a second, critters 45 m from both players wait, and on foot nothing past the fog is drawn.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const fnSrc = (name) => { const i = html.indexOf('function ' + name + '('); assert.ok(i >= 0, name); let d = 0, k = html.indexOf('{', i); for (; k < html.length; k++) { if (html[k] === '{') d++; else if (html[k] === '}' && --d === 0) break; } return html.slice(i, k + 1); };

// ---------------------------------------------------------------- pacing: the real paceUpdate + the gate lines of frame()
const paceSrc = html.slice(html.indexOf('const PACE = {'), html.indexOf('function frame(now) {'));
const frameSrc = fnSrc('frame'), gateLines = frameSrc.split('\n').filter(l => /PACE\.minGap &&|PACE\.dg\.push/.test(l)).join('\n');
assert.ok(gateLines.split('\n').length === 2, 'frame() has the time gate and the drawn-gap record');
assert.ok(!frameSrc.includes('++PACE.n % PACE.k'), 'and no longer counts callbacks (a busy phone misses them, so counting over-skipped)');
const sim = (hz, work, secs, tier) => {   // a screen at hz; each drawn frame takes work(i) ms; returns the gaps between drawn frames
  const ctx = { FPS_CAP: tier.fps, window: { Plant3D: { tier } }, Math, requestAnimationFrame() {} };
  vm.createContext(ctx);
  vm.runInContext(paceSrc + '\nfunction tryDraw(now) {\n' + gateLines.replace(/requestAnimationFrame\(frame\); return;/g, 'return false;') + '\nreturn true; }\nthis.tryDraw = tryDraw; this.PACE = PACE; this.paceUpdate = paceUpdate;', ctx);
  const P = 1000 / hz, gaps = []; let t = 0, busyUntil = 0, last = 0, i = 0;
  while (t < secs * 1000) {
    t += P; if (t < busyUntil) continue;          // the main thread is still drawing: this refresh is missed
    ctx.paceUpdate(t);
    if (!ctx.tryDraw(t)) continue;
    if (last) gaps.push(t - last); last = t; busyUntil = t + work(i++);
  }
  return { gaps: gaps.slice(gaps.length / 2 | 0), P: ctx.PACE };   // second half: after the pacer has settled
};
const phone = { fps: 30, fpsHi: 40 };
{ // a Razr that cannot hold 40: frames take 22-32 ms. It settles on an even 30 (every 4th refresh at 120 Hz), no bursts
  const r = sim(120, i => 22 + (i * 7919 % 11), 40, phone);
  const fast = r.gaps.filter(g => g < 30).length;
  assert.equal(fast, 0, 'no frame comes early (was bursting to 45 fps): ' + fast + ' early');
  const even = r.gaps.filter(g => Math.abs(g - 33.33) < 0.5).length / r.gaps.length;
  assert.ok(even > 0.95, 'an even 30 fps: ' + Math.round(even * 100) + '% of frames exactly 33.3 ms apart');
  assert.equal(Math.round(r.P.cap), 30, 'it settles on the plain 30 cap');
}
{ // a phone that can hold 40 (frames 12-18 ms): every 3rd refresh, steady
  const r = sim(120, i => 12 + (i % 7), 30, phone);
  const even = r.gaps.filter(g => Math.abs(g - 25) < 0.5).length / r.gaps.length;
  assert.ok(even > 0.95, 'a steady 40 when the device keeps up: ' + Math.round(even * 100) + '%'); assert.equal(r.P.demotes, 0);
}
{ // a 120 Hz screen running 40, where frames start running over budget: it drops to 30 for a minute, and for good the second time
  const ctx = { FPS_CAP: 30, window: { Plant3D: { tier: phone } }, Math }; vm.createContext(ctx); vm.runInContext(paceSrc + '\nthis.PACE = PACE; this.paceUpdate = paceUpdate;', ctx);
  const P = ctx.PACE; let t = 0;
  const window2s = (drawGap) => { for (let i = 0; i < 240; i++) { t += 8.333; ctx.paceUpdate(t); } for (let i = 0; i < 60; i++) P.dg.push(drawGap); t += 1; ctx.paceUpdate(t); };
  window2s(25); assert.equal(P.k, 3, 'holding 40: every 3rd refresh'); assert.ok(Math.abs(P.minGap - 22) < 0.1, 'never closer than 22 ms');
  window2s(25); window2s(31); assert.equal(P.demotes, 1, 'frames 10% over the 25 ms budget: it gives up 40'); assert.equal(P.k, 4, 'every 4th refresh (30 fps)');
  window2s(25); assert.equal(P.k, 4, 'and stays at 30 for a minute');
  for (let s2 = 0; s2 < 32; s2++) window2s(25); assert.equal(P.k, 3, 'then tries 40 again');
  window2s(31); assert.equal(P.demotes, 2);
  for (let s2 = 0; s2 < 80; s2++) window2s(20); assert.equal(P.k, 4, 'after the second drop it stays at 30 for good');
}
{ // desktops are untouched: a 144 Hz screen under the 144 cap draws every refresh
  const r = sim(144, () => 4, 10, { fps: 144 });
  assert.ok(r.gaps.every(g => Math.abs(g - 1000 / 144) < 0.5), 'every refresh on a 144 Hz desktop');
}

// ---------------------------------------------------------------- critters
{ // a climbing lizard probes the wall 5 times a second, not every frame
  const src = fnSrc('crWallStep');
  class V { constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
  let rays = 0;
  const ctx = { clock: 0, Math, V3: (x, y, z) => new V(x, y, z), upNormal: () => ({ x: -1, y: 0, z: 0 }),
    crRay: (o) => { rays++; return { point: { x: o.x + 0.3, y: o.y, z: o.z } }; },
    c: { wall: { nx: -1, nz: 0, tx: 0, tz: 1, dir: 1, t: 99 }, g: { position: new V(1, 2, 0), userData: {} } } };
  vm.createContext(ctx); vm.runInContext(src + '\nfor (let i = 0; i < 60; i++) crWallStep(c, 1 / 60);', ctx);
  assert.ok(rays <= 6 && rays >= 4, 'about 5 wall probes in a second (was 60): ' + rays);
  assert.ok(ctx.c.g.position.z > 0.45 && ctx.c.g.position.z < 0.55, 'and it still crawls at 0.5 m/s (' + ctx.c.g.position.z.toFixed(2) + ' m)');
  // the face runs out: it steps back to the last checked spot and turns round
  ctx.crRay = () => { rays++; return null; }; const z0 = ctx.c.g.position.z;
  vm.runInContext('for (let i = 0; i < 15; i++) crWallStep(c, 1 / 60);', ctx);
  assert.equal(ctx.c.wall.dir, -1, 'no face ahead: it turns round'); assert.ok(ctx.c.g.position.z <= z0 + 1e-9, 'without crawling into the air');
}
{ // critters 45 m from both players wait
  const ctx = { walk: { on: true, x: 0, z: 0 }, NET: { rp: { x: 200, z: 0 }, conn: { open: true } }, Math, isFinite };
  vm.createContext(ctx); vm.runInContext(fnSrc('crFar') + '\nthis.f = crFar;', ctx);
  assert.equal(ctx.f({ x: 30, z: 0 }), false, 'near you: it moves'); assert.equal(ctx.f({ x: 190, z: 0 }), false, 'near the other player: it moves');
  assert.equal(ctx.f({ x: 100, z: 0 }), true, 'far from both: it waits');
  assert.ok(fnSrc('updateCritters').includes('if (crFar(p)) continue;'), 'updateCritters skips them');
}
// ---------------------------------------------------------------- draw distance follows the fog on foot
assert.ok(html.includes('const far = walk.on ? (walk.drive ? 930 : TUNE.fogFar + 30) : 9000;') && html.includes('if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }'), 'nothing past the fog is drawn on foot; the free camera keeps its long view');
assert.ok(html.includes('o.scale.setScalar(Math.min(1, camera.far * 0.9 / 8000));'), 'and the sky shrinks with it (centred on you, so it looks the same)');
console.log('PASS: phone pacing (v1.97.26: never-early frames give an even 30 on a phone that cannot hold 40, a steady 40 when it can, two tries then 30 for good, desktops untouched; lizards probe 5x a second and still crawl 0.5 m/s; critters 45 m from both players wait; draw distance follows the fog on foot)');
