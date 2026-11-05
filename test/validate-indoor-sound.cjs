// Run from the test/ directory: node validate-indoor-sound.cjs
// v1.97.168, owner: "shouldnt be able to hear the pigeons on the roof from inside the building". Runs the game's own enclAt /
// soundShutOut / pigeonCoo with a building envelope and a stand-in audio context: inside, a pigeon on the roof or out in the yard
// is not heard; in the same room, or with you outside, it is.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
let made = 0;
const node = () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, Q: { value: 0 }, type: '' });
const C = { currentTime: 0, destination: {}, createGain: () => { made++; return node(); }, createBiquadFilter: node, createOscillator: node };
const camera = new T.PerspectiveCamera();
const ctx = { T, Math, camera, tsnd: { ctx: C }, panner: () => ({ pan: { value: 0 }, connect() {} }), panOf: () => 0 };
vm.createContext(ctx);
vm.runInContext('const ENCL = [];\n' + cut('function enclAt(x, y, z) {', 'const boxDist') + cut('// v1.97.168, owner: "shouldnt be able to hear', 'function updateBirds(dt) {') +
  '\nthis.ENCL = ENCL; this.soundShutOut = soundShutOut; this.pigeonCoo = pigeonCoo;', ctx);
// a shop 20 x 10 m, roof at 6 m, with an office (4 x 4) inside it
ctx.ENCL.push({ x0: 0, x1: 20, z0: 0, z1: 10, top: 6, area: 200 }, { x0: 1, x1: 5, z0: 1, z1: 5, top: 3, area: 16 });
const heard = (cam, bird) => { camera.position.set(...cam); made = 0; ctx.pigeonCoo(1, new T.Vector3(...bird)); return made > 0; };
assert.equal(heard([10, 1.6, 5], [10, 6.05, 5]), false, 'inside: a pigeon on the roof is not heard');
assert.equal(heard([10, 1.6, 5], [12, 6.3, 9.9]), false, 'nor one on the roof edge');
assert.equal(heard([10, 1.6, 5], [30, 0.2, 5]), false, 'nor one out in the yard');
assert.equal(heard([10, 1.6, 5], [14, 2, 7]), true, 'one in the same room is');
assert.equal(heard([3, 1.6, 3], [10, 2, 7]), false, 'in the office, one out in the shop is shut out by its walls');
assert.equal(heard([-10, 1.6, 5], [10, 6.05, 5]), true, 'outside: the one on the roof is heard');
assert.equal(heard([10, 8, 5], [10, 6.05, 5]), true, 'up on the roof yourself: heard');
assert.ok(html.includes("const C = tsnd.ctx; if (!C || vol < 0.03 || (pos && soundShutOut(pos))) return;"), 'the coo checks it before making a sound');
console.log('PASS: indoor sound (inside a building you no longer hear pigeons on its roof or out in the yard; same room, outside, or on the roof: you do)');
