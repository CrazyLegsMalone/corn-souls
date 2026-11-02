// Run from repository root: node test/validate-power-outage.cjs
// Covers the power outage: a real power cut kills only mains-powered emitters (and keeps them dead when their own
// update loop rewrites the colour), never touches the sun / sky / fog, leaves self-powered gear and fires alone,
// blinks the egress strobes only while the plant is dead, and locks out the roll-up doors.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('test/game.html', 'utf8');

const a = html.indexOf('// ---------- POWER OUTAGE:');
const b = html.indexOf('// ---------- weather (real conditions', a);
assert.ok(a > 0 && b > a, 'could not slice the power-outage module');
const src = html.slice(a, b);

// ---------------------------------------------------------------- the module must never touch world lighting again
{
  for (const banned of ['hemi', 'sunL', 'scene.background', 'fog', 'SKY.', 'DAYLIGHT', 'baseHemi', 'stars']) {
    assert.ok(!src.includes(banned), 'the outage module must not touch world lighting (' + banned + ')');
  }
  assert.ok(!src.includes("'night'") && !src.includes("'auto'"), 'the day/night modes are gone');
}

// ---------------------------------------------------------------- stubs
const col = (v) => ({
  r: v, g: v, b: v, hex: null,
  setRGB(r, g, b) { this.r = r; this.g = g; this.b = b; return this; },
  setHex(h) { this.hex = h; this.r = this.g = this.b = 0; return this; },
  copy(o) { this.r = o.r; this.g = o.g; this.b = o.b; return this; },
  multiplyScalar(k) { this.r *= k; this.g *= k; this.b *= k; return this; }
});
let uid = 0;
const basic = (v) => ({ isMeshBasicMaterial: true, color: col(v), uuid: 'm' + (++uid), userData: {} });
const sprite = (v) => ({ isSpriteMaterial: true, color: col(v), uuid: 'm' + (++uid), userData: {} });
const lambert = (base) => ({ emissive: {}, emissiveIntensity: base, uuid: 'm' + (++uid), userData: {} });

function makeCtx() {
  const gridLamp = basic(1);    gridLamp.userData.gridLight = true;                        // a ceiling light on the supply
  const gridLit = lambert(1);   gridLit.userData.gridLight = true;                         // a lit fixture (emissive)
  const gridScreen = basic(1);  gridScreen.userData.gridLight = true; gridScreen.userData.darkOnOutage = true;
  const gridHalo = sprite(1);   gridHalo.userData.gridLight = true; gridHalo.userData.darkOnOutage = true;
  const exitSign = basic(1);    exitSign.userData.batteryLight = true;                     // battery-backed exit sign
  const both = basic(1);        both.userData.gridLight = true; both.userData.batteryLight = true;   // battery wins
  const fire = lambert(2);      fire.userData.keepLit = true;                              // a fire
  const printed = basic(1);                                                                // a printed sign: not a light
  const flow = lambert(0.4);                                                               // process liquid: not a light
  const meshes = [gridLamp, gridLit, gridScreen, gridHalo, exitSign, both, fire, printed, flow];
  const ctx = {
    scene: { background: col(0.56), fog: { color: col(0.56) }, traverse(fn) { meshes.forEach(m => fn({ material: m })); } },
    hemi: { intensity: 1.15 }, sunL: { intensity: 1.7 },
    EGRESS: { list: [], lens: basic(0x3a0e0e) },
    applyInteriorDark: () => {},   // interior daylight has its own suite (validate-interior-dark.cjs)
    performance: { now: () => 0 }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\nvar __PO = POWER_OUTAGE;', ctx);   // const is not a VM global; expose it
  return { ctx, gridLamp, gridLit, gridScreen, gridHalo, exitSign, both, fire, printed, flow };
}


// ---------------------------------------------------------------- the event
{
  const { ctx, gridLamp, gridLit, gridScreen, gridHalo, exitSign, both, fire, printed, flow } = makeCtx();
  assert.equal(ctx.__PO.on, false);

  // snapshot the world lighting: a power cut must not change any of it
  const world = { hemi: ctx.hemi.intensity, sun: ctx.sunL.intensity, bg: ctx.scene.background.r, fog: ctx.scene.fog.color.r };

  assert.equal(ctx.setPowerOutage(true), true);
  assert.equal(ctx.__PO.on, true);
  assert.equal(ctx.hemi.intensity, world.hemi, 'the outage never dims the ambient light');
  assert.equal(ctx.sunL.intensity, world.sun, 'the sun keeps working');
  assert.equal(ctx.scene.background.r, world.bg, 'the sky is untouched');
  assert.equal(ctx.scene.fog.color.r, world.fog, 'the fog is untouched');

  assert.ok(Math.abs(gridLamp.color.r - 0.12) < 1e-9, 'a mains lamp dims to 12%');
  assert.ok(Math.abs(gridLit.emissiveIntensity - 0.06) < 1e-9, 'a lit fixture loses its glow');
  assert.equal(gridScreen.color.r, 0, 'a mains screen goes fully black');
  assert.equal(gridHalo.color.r, 0, 'an additive halo goes fully black, not 12%');
  assert.equal(exitSign.color.r, 1, 'a battery-backed exit sign stays lit');
  assert.equal(both.color.r, 1, 'battery beats grid when a material claims both');
  assert.equal(fire.emissiveIntensity, 2, 'fires keep burning');
  assert.equal(printed.color.r, 1, 'a printed sign is not a light and never dims');
  assert.equal(flow.emissiveIntensity, 0.4, 'process liquid is not a light and never dims');
  assert.equal(ctx.__PO.saved.length, 4, 'four mains emitters captured (lamp, fixture, screen, halo)');

  ctx.setPowerOutage(true);                       // idempotent start
  assert.ok(Math.abs(gridLamp.color.r - 0.12) < 1e-9, 'repeated start does not compound');

  // a duty lamp / indicator rewrites its own colour every frame: the per-frame pass must win
  gridLamp.color.setRGB(0.24, 0.86, 0.52);
  gridScreen.color.setRGB(0.2, 0.6, 1);
  gridHalo.color.setRGB(1, 1, 1);
  ctx.applyPowerOutage();
  assert.ok(Math.abs(gridLamp.color.r - 0.12) < 1e-9, 'a rewritten indicator is re-killed');
  assert.equal(gridScreen.color.r, 0, 'a screen that redraws itself stays black');
  assert.equal(gridHalo.color.r, 0, 'a halo switched on again stays black');

  // egress strobes are battery-backed: the outage does not dim them, it makes them blink
  assert.equal(ctx.EGRESS.lens.color.hex, 0xff2a1e, 'the strobes are lit while the plant is dead');
  ctx.performance.now = () => 700;
  ctx.applyPowerOutage();
  assert.equal(ctx.EGRESS.lens.color.hex, 0x3a0e0e, 'and dark again 700 ms later on the same circuit');
  ctx.performance.now = () => 100;
  ctx.applyPowerOutage();
  assert.equal(ctx.EGRESS.lens.color.hex, 0xff2a1e, 'blinking, not latched');

  // power restored: every emitter comes back exactly
  assert.equal(ctx.setPowerOutage(false), false);
  assert.equal(gridLamp.color.r, 1);
  assert.equal(gridLit.emissiveIntensity, 1);
  assert.equal(gridScreen.color.r, 1);
  assert.equal(gridHalo.color.r, 1);
  assert.equal(exitSign.color.r, 1);
  assert.equal(fire.emissiveIntensity, 2);
  assert.equal(ctx.__PO.saved.length, 0);

  ctx.applyPowerOutage();
  assert.equal(ctx.EGRESS.lens.color.hex, 0x3a0e0e, 'no outage, no strobe');

  gridLamp.color.setRGB(1, 1, 1);                 // nothing happens while the event is off
  ctx.applyPowerOutage();
  assert.equal(gridLamp.color.r, 1, 'the event does nothing when it is off');
}

// ---------------------------------------------------------------- wiring in game.html
{
  // the debug menu is in a different script scope from the world closure, so it can only reach the event through P3
  const start = html.indexOf("['Power outage: start'"), end = html.indexOf("['Power outage: end'");
  assert.ok(start > 0 && end > start, 'debug menu has the power outage rows');
  const rows = html.slice(start, end + 80);
  assert.equal(rows.split('P3.powerSet(').length - 1, 2, 'two debug rows drive the event (start / end), through powerSet so the other player follows');
  assert.ok(!/[^.\w]setPowerOutage\(/.test(rows), 'menu rows must not call the private function directly');
  assert.ok(!rows.includes('force night'), 'the night preview row is gone');
  assert.ok(html.includes('setPowerOutage, get powerOutage()'), 'the event is exported on Plant3D');
  assert.ok(!html.includes('powerOutageMode'), 'the day/night mode export is gone');

  // every emitter is classified where it is built, so nothing is dimmed by accident
  assert.equal((html.match(/gridLight\(/g) || []).length, 23, '23 mains emitters are flagged gridLight');
  assert.equal((html.match(/batteryLight\(/g) || []).length, 9, 'self-powered gear: vehicles, radio, egress lens, EXIT signs, pivot run lamp');
  assert.equal((html.match(/exitSignMat\(\)/g) || []).length, 5, 'four lettered EXIT signs + the shared builder');
  assert.equal((html.match(/exitHalo\(/g) || []).length, 5, 'a halo per sign + the builder');
  assert.ok(html.includes("c.fillText('EXIT', 64, 44)"), 'the signs are lettered, not flat red boxes');
  assert.ok(html.includes('m.userData.keepLit = true;   // fires survive an outage'), 'flame sprites are marked keepLit');

  // egress strobes: 1 definition + 1 in manDoor + 1 in the turbine door helper + 11 explicit doorways
  assert.equal((html.match(/egressStrobe\(/g) || []).length, 14, 'egress strobe call sites');
  assert.ok(html.includes('const EGRESS_OFF = 0.24, EGRESS_Y = 2.78;'), 'strobes sit clear of the wall face and above the door-name plates at 2.45');
  assert.ok(!html.includes('egressStrobe(MX1, BSZ'), 'the shop east-door strobes use the doorway centre, not a wall-start offset');
  const shack = html.indexOf('{ g: dg, rot: 0, dir: 1, x: x + h, z, open: 0 }');   // ethanol load-out shack door
  assert.ok(shack > 0, 'found the ethanol load-out shack door');
  assert.ok(!html.slice(shack, shack + 200).includes('egressStrobe'), 'no strobe in the ethanol load-out shack');
  assert.ok(html.includes('const near = !POWER_OUTAGE.on && walk.on && !walk.dead'), 'roll-up doors are dead in an outage');

  // the old dimming is gone for good
  assert.ok(!src.includes('hemi') && !src.includes('multiplyScalar'), 'no ambient or sky scaling left in the module');
  assert.ok(!html.includes('DAYLIGHT'), 'the daylight snapshot the dimming needed is gone');
}


  // The outage is WORLD state: both players must change it through powerSet(), which also tells the other PC.
  assert.ok(html.includes('function powerSet(on) {'), 'one way to change the plant supply');
  assert.ok(html.includes('const r = setPowerOutage(!!on);') && html.includes("if (NET.conn) netSend({ t: 'po', on: !!on });"), 'it applies locally and tells the other player');
  assert.ok(html.includes('powerSet(false);'), 'the breaker reset goes through powerSet');
  assert.ok(html.includes("} else if (m.t === 'po') { setPowerOutage(!!m.on);"), 'and the other side applies what it hears');
  assert.ok(html.includes('powerSet: on => powerSet(on)'), 'exposed for the debug menu');
  assert.ok(html.includes('P3.powerSet(true)') && html.includes('P3.powerSet(false)'), 'the debug menu uses it, so a debug outage also reaches the other player');
console.log('PASS: the power outage kills only mains emitters (and keeps them dead after a rewrite), leaves the sun/sky/fog, battery gear and fires alone, blinks the interior egress strobes, and locks out the roll-up doors');
