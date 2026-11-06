// Run from the test/ directory: node validate-critter-eat.cjs
// v1.97.132: owner: "some are killed but when picked up there is no eat option". Two pickups competed for X: the game's eating
// pickup (deadNear, 2.2 m round you) and the launcher's older corn-cube carry (3.8 m where you look), which carried a corpse
// with no B-to-eat and no power. Now deadNear reaches everything the corn carry did, and the corn carry leaves critters alone.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), launcher = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const i0 = html.indexOf('function deadNear(r) {'), i1 = html.indexOf('\nfunction critterPick() {');
assert.ok(i0 > 0 && i1 > i0, 'deadNear');
const camera = new T.PerspectiveCamera(70, 1, 0.1, 100);
const ctx = { Math, Infinity, camera, V3: (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), walk: { x: 0, z: 0 }, critters: [], birds: [], pondFrogs: [] };
vm.createContext(ctx); vm.runInContext(html.slice(i0, i1) + '\nthis.deadNear = deadNear;', ctx);
camera.position.set(0, 1.6, 0); camera.lookAt(0, 0.2, -5); camera.updateMatrixWorld();   // standing at the origin looking north (-z), eyes 1.6 m up
const rat = (x, z, extra) => Object.assign({ kind: 'rat', state: 'hit', held: false, g: { position: new T.Vector3(x, 0.1, z) } }, extra || {});
const pick = list => { ctx.critters = list; return ctx.deadNear(); };
// the cases the corn carry used to take: 2.2-3.8 m away, where you are looking
for (const d of [2.5, 3.0, 3.4]) assert.ok(pick([rat(0, -d)]), d + ' m ahead: in reach of the eating pickup');
assert.ok(pick([rat(0.8, -3.0)]), 'a little off to the side of the line of sight, 3 m out');
// still nearby any way round
assert.ok(pick([rat(1.5, 1.0)]), 'within 2.2 m behind and to the side');
// out of reach
assert.equal(pick([rat(0, 3.0)]), null, '3 m behind you: not reachable');
assert.equal(pick([rat(3.0, -1.0)]), null, '3 m off to the side, not where you look: not reachable');
assert.equal(pick([rat(0, -4.5)]), null, '4.5 m ahead: too far');
assert.equal(pick([rat(0, -2.0, { held: true })]), null, 'one somebody is carrying is skipped');
// the nearer one wins over a far one in view
const near = rat(1.0, 0.5), far = rat(0, -3);
assert.equal(pick([far, near]), near, 'the one next to you comes first');
// pigeons (on the ground) and pond frogs count too
ctx.critters = []; ctx.birds = [{ state: 'down', held: false, g: { position: new T.Vector3(0, 0.05, -3), visible: true } }];
assert.ok(ctx.deadNear(), 'a dead pigeon 3 m ahead'); ctx.birds = [];
ctx.pondFrogs = [{ state: 'hit', held: false, g: { position: new T.Vector3(0.3, 0.2, -2.8) } }]; assert.ok(ctx.deadNear(), 'a dead pond frog 2.8 m ahead'); ctx.pondFrogs = [];
// the launcher's corn carry no longer takes critters (it would carry them with no eat and no power)
assert.ok(launcher.includes("if(t.held||t.net==='them'||t.isCritter||"), 'the corn carry skips dead critters');
// and X tries the eating pickup before the corn carry
const xi = html.indexOf("{ const m = P3.critterPick(); if (m) { toast(m); return; } }"), ci = html.indexOf('const r = P3.kiaToggle() || P3.radioToggle()');
assert.ok(xi > 0 && ci > xi, 'X: critterPick runs before the launcher-patched interact line (where cornInteract goes)');
// v1.97.151, owner: "add eat button only visible when holding something edible" - a phone button that is on screen only while a
// corpse you can eat is in your hands, does exactly what B does, and never appears in a vehicle or behind a modal/pad.
assert.ok(html.includes('<button id="eatBtn" aria-label="Eat what you are carrying">🍖</button>'), 'the button exists in the HUD');
assert.ok(html.includes('#eatBtn{display:none;') && html.includes('body.walking:not(.pc):not(.driving).canEat #eatBtn{display:block}'),
  'hidden by default, shown only while walking, on touch, out of a vehicle, with the canEat class');
assert.ok(html.includes('body.driving #eatBtn{display:none!important}') && html.includes('body.padmode #eatBtn{display:none!important}'),
  'and never over the driving controls or the pad mode');
assert.ok(html.includes('get canEat() { return !!(heldDead && !heldDead.eating); }'), 'P3.canEat is exactly "a corpse is in my hands and I am not already chewing it"');
assert.ok(html.includes("bodyCls('canEat', P3.walking && !P3.driving && !!P3.canEat);"), 'the frame body drives the class from that (v1.97.196: through bodyCls, which only writes on a change)');
assert.ok(html.includes("$('eatBtn').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); const m = P3.critterEat(); if (m) toast(m); });"),
  'and the button does what B does, with the same toast');
console.log('PASS: every dead critter you can pick up can be eaten (eating pickup reaches 2.2 m round you or 3.8 m where you look; the corn carry leaves critters alone), and on a phone there is an Eat button that only shows while something edible is in your hands');
