// Run from repository root: node test/validate-blackout.cjs
// Covers the blackout event: emissive fixtures dim once and restore exactly, the
// per-frame pass clamps (so it cannot compound), fires flagged keepLit are never
// touched, and toggling forces daylight() to re-apply.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('test/game.html', 'utf8');

const a = html.indexOf('const BLACKOUT = {');
const b = html.indexOf('// ---------- weather (real conditions', a);
assert.ok(a > 0 && b > a, 'could not slice the blackout module');
const src = html.slice(a, b);

const color = v => ({ r: v, g: v, b: v,
  multiplyScalar(k) { this.r *= k; this.g *= k; this.b *= k; return this; },
  copy(o) { this.r = o.r; this.g = o.g; this.b = o.b; return this; } });
const white = () => ({ r: 1, g: 1, b: 1, hex: 0xffffff,
  multiplyScalar(k) { this.r *= k; this.g *= k; this.b *= k; return this; },
  getHex() { return this.hex; },
  setHex(h) { this.hex = h; this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; },
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; } });

function makeCtx() {
  const lit = { emissive: { r: 0.2 }, emissiveIntensity: 1, uuid: 'lit-1' };
  const shared = { emissive: { r: 0.1 }, emissiveIntensity: 0.5, uuid: 'lit-2' };
  const fire = { emissive: { r: 1 }, emissiveIntensity: 2, uuid: 'fire', userData: { keepLit: true } };
  const plain = { color: { r: 1 }, uuid: 'plain' };                       // no emissive, not unlit -> ignored
  const sign = { color: white(), isMeshBasicMaterial: true, uuid: 'sign' };     // unlit sign: must dim
  const lamp = { color: white(), isMeshBasicMaterial: true, uuid: 'lamp' };     // unlit indicator lamp: must dim
  const flame = { color: white(), isSpriteMaterial: true, userData: { keepLit: true }, uuid: 'flame' };
  const screen = { color: white(), isMeshBasicMaterial: true, userData: { darkOnBlackout: true }, uuid: 'screen' };
  const cloudMat = { color: white(), isMeshBasicMaterial: true, uuid: 'clouds' };   // SKY: per-frame pass
  const starMat = { color: white(), isPointsMaterial: true, opacity: 0.1, uuid: 'stars' };        // SKY: per-frame pass
  const meshes = [lit, shared, shared, fire, plain, sign, lamp, flame, screen, cloudMat, starMat].map(m => ({ material: m }));
  const ctx = {
    console, Math, Set, Array, Object, Number,
    dayT: 0,
    DAYLIGHT: { baseHemi: 1.15, baseSun: 1.7, hours: 13 },
    scene: { traverse(fn) { meshes.forEach(fn); }, background: color(0.56), fog: { color: color(0.56) } },
    hemi: { intensity: 1.15 },
    sunL: { intensity: 1.7 },
    SKY: {
      dome: { material: { uniforms: { hor: { value: color(0.56) }, zen: { value: color(0.2) }, sunK: { value: 1 } } } },
      clouds: { material: cloudMat },
      stars: { material: starMat }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\nvar __BLACKOUT = BLACKOUT;', ctx);   // const is not a VM global; expose it
  return { ctx, lit, shared, fire, plain, sign, lamp, flame, screen, cloudMat, starMat };
}

// ---------------------------------------------------------------- the event
{
  const { ctx, lit, shared, fire, plain, sign, lamp, flame, screen, cloudMat, starMat } = makeCtx();
  assert.equal(ctx.__BLACKOUT.on, false);

  assert.equal(ctx.setBlackout(true), true);
  assert.equal(ctx.__BLACKOUT.on, true);
  assert.equal(ctx.dayT, 99, 'daylight() is asked to re-apply');
  assert.ok(Math.abs(lit.emissiveIntensity - 0.06) < 1e-9, 'bright material dimmed to 6%');
  assert.ok(Math.abs(shared.emissiveIntensity - 0.03) < 1e-9, 'dim material scaled by the same factor');
  assert.equal(fire.emissiveIntensity, 2, 'fires (keepLit) are untouched');
  assert.equal(plain.color.r, 1, 'materials with no emissive are ignored');
  assert.ok(Math.abs(sign.color.r - 0.12) < 1e-9, 'unlit sign dimmed');
  assert.ok(Math.abs(lamp.color.r - 0.12) < 1e-9, 'unlit indicator lamp dimmed');
  assert.equal(flame.color.r, 1, 'flame sprites stay lit');
  assert.equal(screen.color.r, 0, 'control room screens go fully black, not just dim');
  assert.equal(cloudMat.color.r, 1, 'sky clouds are left to the per-frame pass');
  assert.equal(starMat.color.r, 1, 'stars keep their colour; the per-frame pass raises opacity');
  assert.equal(ctx.__BLACKOUT.saved.length, 5, 'two emissive + one shared dedupe + two unlit + one screen = 5 entries');

  ctx.setBlackout(true);                       // idempotent start
  assert.ok(Math.abs(lit.emissiveIntensity - 0.06) < 1e-9, 'repeated start does not compound');
  assert.ok(Math.abs(sign.color.r - 0.12) < 1e-9, 'and does not dim the sign twice');

  // a duty lamp / strainer ring rewrites its colour every frame: the per-frame pass must win
  lamp.color.setRGB(0.24, 0.86, 0.52);         // bright green, as the sim would set it
  ctx.applyBlackout();
  assert.ok(Math.abs(lamp.color.g - 0.12) < 1e-9, 'per-frame indicator rewrite is re-dimmed to the blackout level');
  screen.color.setRGB(0.2, 0.6, 1);            // a screen re-drawing itself
  ctx.applyBlackout();
  assert.equal(screen.color.r, 0, 'screens stay black even if redrawn');

  // DAYTIME (13:00): artificial lights out, sun and sky untouched
  ctx.DAYLIGHT.hours = 13;
  ctx.hemi.intensity = 1.15; ctx.sunL.intensity = 1.7;
  ctx.scene.background = color(0.56); ctx.scene.fog.color = color(0.56);
  ctx.SKY.dome.material.uniforms.sunK.value = 1;
  ctx.SKY.stars.material.opacity = 0.1;
  ctx.applyBlackout();
  assert.ok(Math.abs(ctx.hemi.intensity - 1.15 * 0.65) < 1e-9, 'daytime: hemisphere dipped to 65% of the daylight base');
  assert.equal(ctx.sunL.intensity, 1.7, 'daytime: the sun keeps working');
  assert.equal(ctx.scene.background.r, 0.56, 'daytime: the sky is untouched');
  assert.equal(ctx.SKY.dome.material.uniforms.sunK.value, 1, 'daytime: the sun disc stays');
  const hemiDay = ctx.hemi.intensity;
  ctx.applyBlackout();
  assert.equal(ctx.hemi.intensity, hemiDay, 'daytime dip does not compound');

  // NIGHT in auto mode (02:00): the full crush
  ctx.DAYLIGHT.hours = 2;
  ctx.scene.background = color(0.2); ctx.scene.fog.color = color(0.2);
  ctx.SKY.dome.material.uniforms.hor.value = color(0.2);
  ctx.SKY.dome.material.uniforms.zen.value = color(0.1);
  ctx.SKY.dome.material.uniforms.sunK.value = 1;
  ctx.SKY.clouds.material.color = color(1);
  ctx.SKY.stars.material.opacity = 0.1;
  ctx.applyBlackout();
  assert.ok(Math.abs(ctx.hemi.intensity - 1.15 * 0.05) < 1e-9, 'night: ambient crushed from the daylight base');
  assert.equal(ctx.sunL.intensity, 0, 'night: sun off');
  assert.ok(ctx.scene.background.r < 0.03, 'night: sky clamped near black');
  assert.equal(ctx.scene.fog.color.r, ctx.scene.background.r, 'night: fog matches the darkened sky');
  assert.equal(ctx.SKY.dome.material.uniforms.sunK.value, 0, 'night: sun disc removed');
  assert.ok(ctx.SKY.stars.material.opacity > 0.5, 'night: stars come out');

  // forced night while it is midday
  ctx.DAYLIGHT.hours = 13;
  ctx.scene.background = color(0.56);
  ctx.setBlackout(true, 'night');
  assert.equal(ctx.__BLACKOUT.mode, 'night', 'mode can be changed while the event is running');
  ctx.applyBlackout();
  assert.equal(ctx.sunL.intensity, 0, 'forced night overrides a bright sky');
  assert.ok(ctx.hemi.intensity < 0.1, 'forced night crushes ambient');

  // restoring puts every material back exactly
  assert.equal(ctx.setBlackout(false), false);
  assert.equal(lit.emissiveIntensity, 1);
  assert.equal(shared.emissiveIntensity, 0.5);
  assert.equal(fire.emissiveIntensity, 2);
  assert.equal(sign.color.r, 1, 'sign restored');
  assert.equal(lamp.color.r, 1, 'lamp restored');
  assert.equal(screen.color.r, 1, 'screen restored to its picture');
  assert.equal(ctx.__BLACKOUT.saved.length, 0);
  assert.equal(ctx.dayT, 99, 'and daylight() is asked to re-apply on restore too');

  // and the per-frame pass is a no-op while the event is off
  ctx.hemi.intensity = 1.15; ctx.sunL.intensity = 1.7;
  ctx.applyBlackout();
  assert.equal(ctx.hemi.intensity, 1.15);
  assert.equal(ctx.sunL.intensity, 1.7);
}

// The debug menu is in a different script scope from the world closure, so it can
// only reach the event through the P3 export. (This is exactly the bug that threw
// "setBlackout is not defined" in TEST 1.97.34.)
{
  const start = html.indexOf("['Blackout: start'");
  const end = html.indexOf("['Blackout: end'");
  assert.ok(start > 0 && end > start, 'debug menu has the blackout rows');
  const rows = html.slice(start, end + 80);
  assert.equal(rows.split('P3.setBlackout(').length - 1, 3, 'three debug rows drive the event (auto, force night, end)');
  assert.ok(rows.includes("P3.setBlackout(true, 'night')"), 'the force-night row passes the mode');
  assert.ok(!/[^.\w]setBlackout\(/.test(rows), 'menu rows must not call the private function directly');
  assert.ok(html.includes('setBlackout, get blackout()') && html.includes('get blackoutMode()'), 'exports include state and mode');
  assert.ok(html.includes('m.userData.keepLit = true;   // fires survive a blackout'), 'flame sprites are marked keepLit');
  assert.ok(html.includes('DAYLIGHT.baseHemi = hemi.intensity'), 'daylight() records the base the blackout scales from');
}

console.log('PASS: blackout dims emissive fixtures once, clamps ambient/sun/sky per frame without compounding, keeps fires lit, restores exactly, and is reachable from the debug menu through P3');
