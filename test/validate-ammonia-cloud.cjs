// Run from the test/ directory: node validate-ammonia-cloud.cjs
// v1.97.172, owner: "ammonia cloud should be a little bigger". The cloud is a pool of sprites: each puff starts at size0 and grows
// by f * GROW over its 14-20 s life, and the sprite scale IS the puff's world size - the same number the exposure test uses to
// decide whether the cloud is at Squeeg's face. So this suite runs updateNH3() for real over a leaking drain and checks that the
// puffs actually grow past what they used to reach, that the cloud still sits on the wind, and that standing in it still costs you.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const fn = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };

// ---------------------------------------------------------------- the numbers in the source
assert.ok(/nh3Puff\(s\.p, s\.n\.clone\(\)\.multiplyScalar\(5 \+ Math\.random\(\) \* 4\)[\s\S]*?, 1\.3 \+ Math\.random\(\) \* 0\.7\);/.test(html), 'a puff starts at 1.3-2.0 m (was 1.0-1.6)');
assert.ok(html.includes('const f = q.age / q.life, size = q.size0 + f * 11.5;'), 'and grows by 11.5 m over its life (was 9)');

// ---------------------------------------------------------------- run updateNH3 over an open drain
const draw = new Proxy({ createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {} }, { get: (o, k) => o[k] || (() => {}), set: () => true });
const ctx = { T, Math, console, document: { createElement: () => ({ width: 0, height: 0, getContext: () => draw }) }, scene: new T.Scene(),
  nh3Tex: null, clock: 0, WIND: { mph: 8, from: 180 }, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z),
  walk: { on: true, dead: false, x: 35.3, y: 0.3, z: -47.8, yaw: 0 },
  drawNH3Gauge: () => {}, setAlarm: () => {}, nh3Cough: () => {}, layBody: () => {}, COOL_NOTIFY: () => {},
  NH3: { x: 35.3, z: -48.5, R: 1.37, L: 10.6, cy: 1.95, level: 0.8, valve: true, valveRot: 3, wheel: { rotation: { x: 0 } },
    drain: { x: 35.3, y: 0.3, z: -47.8 }, leaks: [], parts: [], pool: null, spawn: 0, alarm: false, exp: 0, coughT: 0, refillT: 0, shown: -1 } };
vm.createContext(ctx);
vm.runInContext(fn(html, 'nh3Puff') + '\n' + fn(html, 'updateNH3') + '\nthis.updateNH3 = updateNH3;', ctx);
let maxExp = 0;
for (let i = 0; i < 400; i++) { ctx.clock += 0.05; ctx.updateNH3(0.05); maxExp = Math.max(maxExp, ctx.NH3.exp); }
const live = ctx.NH3.parts.filter(q => q.alive);
assert.ok(live.length > 10, 'the open drain makes a cloud (' + live.length + ' puffs alive)');
const big = Math.max(...live.map(q => q.s.scale.x));
const start = Math.min(...ctx.NH3.parts.map(q => q.size0));
assert.ok(start >= 1.3 - 1e-9 && start <= 2.0 + 1e-9, 'every puff starts 1.3-2.0 m across (' + start.toFixed(2) + ')');
assert.ok(big > 11.6, 'and the oldest ones grow past the 10.6 m the old cloud reached (' + big.toFixed(1) + ' m)');
// the cloud drifts downwind: the wind here blows from 180 (south), so it goes north (-z)
const far = live.filter(q => q.age > 6);
assert.ok(far.length > 0 && far.every(q => q.p.z <= -48.5 + 0.5), 'the cloud sits downwind of the tank (north, -z)');
// standing in it costs you, standing well clear does not
assert.ok(maxExp > 0.05, 'breathing it builds exposure (' + maxExp.toFixed(2) + ')');
assert.equal(ctx.walk.dead, 'ammonia', 'and standing in it is still fatal (exposure peaked at ' + maxExp.toFixed(2) + ')');
ctx.walk.dead = false; ctx.walk.x = 200; ctx.walk.z = 200; ctx.NH3.exp = 0.5;
for (let i = 0; i < 40; i++) ctx.updateNH3(0.05);
assert.ok(ctx.NH3.exp < 0.45, 'out of it, clean air wears the exposure off (' + ctx.NH3.exp.toFixed(2) + ')');
console.log('PASS: the ammonia cloud starts at ' + start.toFixed(2) + ' m a puff and grows past ' + big.toFixed(1) + ' m (the old ceiling was 10.6), drifts downwind, builds exposure in it and clears out of it');
