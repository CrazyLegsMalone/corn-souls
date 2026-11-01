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

function makeCtx() {
  const lit = { emissive: { r: 0.2 }, emissiveIntensity: 1, uuid: 'lit-1' };
  const shared = { emissive: { r: 0.1 }, emissiveIntensity: 0.5, uuid: 'lit-2' };
  const fire = { emissive: { r: 1 }, emissiveIntensity: 2, uuid: 'fire', userData: { keepLit: true } };
  const plain = { color: { r: 1 }, uuid: 'plain' };                       // no emissive at all
  const meshes = [lit, shared, shared, fire, plain].map(m => ({ isMesh: true, material: m }));
  const ctx = {
    console, Math, Set, Array, Object, Number,
    dayT: 0,
    scene: { traverse(fn) { meshes.forEach(fn); }, background: color(0.56), fog: { color: color(0.56) } },
    hemi: { intensity: 1.15 },
    sunL: { intensity: 1.7 },
    SKY: {
      dome: { material: { uniforms: { hor: { value: color(0.56) }, zen: { value: color(0.2) }, sunK: { value: 1 } } } },
      clouds: { material: { color: color(1) } },
      stars: { material: { opacity: 0.1 } }
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\nvar __BLACKOUT = BLACKOUT;', ctx);   // const is not a VM global; expose it
  return { ctx, lit, shared, fire, plain };
}

// ---------------------------------------------------------------- the event
{
  const { ctx, lit, shared, fire, plain } = makeCtx();
  assert.equal(ctx.__BLACKOUT.on, false);

  assert.equal(ctx.setBlackout(true), true);
  assert.equal(ctx.__BLACKOUT.on, true);
  assert.equal(ctx.dayT, 99, 'daylight() is asked to re-apply');
  assert.ok(Math.abs(lit.emissiveIntensity - 0.06) < 1e-9, 'bright material dimmed to 6%');
  assert.ok(Math.abs(shared.emissiveIntensity - 0.03) < 1e-9, 'dim material scaled by the same factor');
  assert.equal(fire.emissiveIntensity, 2, 'fires (keepLit) are untouched');
  assert.equal(plain.color.r, 1, 'materials with no emissive are ignored');
  assert.equal(ctx.__BLACKOUT.saved.length, 2, 'a shared material is saved once, not per mesh');

  ctx.setBlackout(true);                       // idempotent start
  assert.ok(Math.abs(lit.emissiveIntensity - 0.06) < 1e-9, 'repeated start does not compound');

  // per-frame pass clamps what daylight()/updateSky() produced this frame
  ctx.hemi.intensity = 1.15; ctx.sunL.intensity = 1.7;
  ctx.scene.background = color(0.56); ctx.scene.fog.color = color(0.56);
  ctx.SKY.dome.material.uniforms.hor.value = color(0.56);
  ctx.SKY.dome.material.uniforms.zen.value = color(0.2);
  ctx.SKY.dome.material.uniforms.sunK.value = 1;
  ctx.SKY.clouds.material.color = color(1);
  ctx.SKY.stars.material.opacity = 0.1;
  ctx.applyBlackout();
  assert.ok(ctx.hemi.intensity <= 0.06, 'ambient crushed');
  assert.equal(ctx.sunL.intensity, 0, 'sun off');
  assert.ok(Math.abs(ctx.scene.background.r - 0.02) < 1e-9, 'sky background clamped to near black');
  assert.equal(ctx.scene.fog.color.r, ctx.scene.background.r, 'fog matches the darkened sky');
  assert.ok(ctx.SKY.dome.material.uniforms.hor.value.r < 0.04, 'sky dome horizon darkened');
  assert.equal(ctx.SKY.dome.material.uniforms.sunK.value, 0, 'sun disc removed');
  assert.ok(ctx.SKY.stars.material.opacity > 0.5, 'stars come out');

  // a second frame must not darken any further (no compounding)
  const hemiAfter1 = ctx.hemi.intensity, bgAfter1 = ctx.scene.background.r;
  ctx.applyBlackout();
  assert.equal(ctx.hemi.intensity, hemiAfter1, 'ambient does not compound');
  assert.equal(ctx.scene.background.r, bgAfter1, 'sky does not compound');

  // restoring puts every material back exactly
  assert.equal(ctx.setBlackout(false), false);
  assert.equal(lit.emissiveIntensity, 1);
  assert.equal(shared.emissiveIntensity, 0.5);
  assert.equal(fire.emissiveIntensity, 2);
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
  assert.ok(start > 0 && end > start, 'debug menu has both blackout rows');
  const rows = html.slice(start, end + 80);
  assert.ok(rows.includes('P3.setBlackout('), 'menu rows call the exported P3.setBlackout');
  assert.ok(!/[^.\w]setBlackout\(/.test(rows), 'menu rows must not call the private function directly');
  assert.ok(html.includes('setBlackout, get blackout()'), 'the event is exported on Plant3D');
}

console.log('PASS: blackout dims emissive fixtures once, clamps ambient/sun/sky per frame without compounding, keeps fires lit, restores exactly, and is reachable from the debug menu through P3');
