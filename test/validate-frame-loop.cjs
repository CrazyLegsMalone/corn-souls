// Run from the test/ directory: node validate-frame-loop.cjs
// v1.97.153. The frame loop is a separate <script> block from the engine, so it cannot see anything the engine declares with
// let / const / function - it only has P3 (window.Plant3D). v1.97.149 added `titleFrames++` to frame() and every frame threw
// `ReferenceError: titleFrames is not defined` at the top of the loop, so the game never drew: the title screen stayed up and
// behind it nothing ran. 45 source-slicing suites and a whole-file syntax parse all passed, because a slice never asks which
// block a name comes from and a parse only asks whether the block is valid on its own.
// This suite runs the loop's own frame() for real, in a vm where the engine block does not exist: anything it borrows from the
// engine without going through the bridge throws here, exactly as it does in the browser. The P3 stub only answers with names
// the real bridge declares, so a call to a bridge entry that does not exist is caught too.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const loopSrc = blocks.filter(b => b.includes('function frame(now) {'))[0];
assert.ok(loopSrc, 'the frame loop block is found');
const fn = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && --d === 0) break; } return src.slice(i, j + 1); };
const line = (src, needle) => { const i = src.indexOf(needle); assert.ok(i >= 0, needle + ' is in the loop block'); return src.slice(src.lastIndexOf('\n', i) + 1, src.indexOf('\n', i)); };

// ---------------------------------------------------------------- what the bridge really offers
const bridge = html.slice(html.indexOf('root.Plant3D = {'), html.indexOf('root.Plant3D = {') + 20000);
const bridgeKeys = new Set();
for (const m of bridge.matchAll(/(?:^|[,{])\s*(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*(?=[:,}(])/g)) bridgeKeys.add(m[1]);
assert.ok(bridgeKeys.has('update') && bridgeKeys.has('perf') && bridgeKeys.has('viewmodel'), 'the bridge was read (' + bridgeKeys.size + ' entries)');

// ---------------------------------------------------------------- run the loop's own frame()
const seen = [], unknown = [];
const P3 = new Proxy({}, {
  has: () => true,
  get: (_, k) => {
    if (typeof k === 'symbol') return undefined;
    if (!bridgeKeys.has(k)) { unknown.push(k); return undefined; }
    seen.push(k);
    if (k === 'perf') return { frame: 6.2, errs: 0, err: '', title: true };
    if (k === 'tier') return { name: 'high', fps: 0 };
    if (k === 'viewmodel') return { held: 'gun', gun: true, third: false };
    if (k === 'walking' || k === 'driving') return true;
    if (k === 'drawCalls' || k === 'triCount') return 0;
    return () => undefined;                                         // every other bridge entry is a function here
  }
});
const el = () => ({ textContent: '', classList: { contains: () => false, add() {}, remove() {}, toggle() {} }, style: {}, dataset: {} });
const ctx = {
  P3, Math, performance: { now: () => 1234 }, document: { getElementById: el, body: { classList: el().classList } }, window: {},
  $: el, requestAnimationFrame: () => 0, console,
  frameBody: () => { ctx.bodies++; }, bodies: 0
};
vm.createContext(ctx);
vm.runInContext([
  line(loopSrc, 'let fpsN = 0, fpsT = 0;'),
  line(loopSrc, 'const FPS_CAP ='),
  line(loopSrc, 'const PACE ='),
  fn(loopSrc, 'paceUpdate'),
  fn(loopSrc, 'frame'),
  'this.frame = frame; this.PACE = PACE;'
].join('\n'), ctx);
ctx.frame(1000);
ctx.frame(1016);
assert.equal(unknown.length, 0, 'the loop asks the bridge for entries that do not exist: ' + unknown.join(', '));
assert.equal(ctx.bodies, 2, 'the frame body ran on both frames');
assert.ok(seen.includes('frameDrawn'), 'the drawn-frame counter goes through the bridge (P3.frameDrawn), not a bare engine name');
assert.equal(seen.filter(k => k === 'frameDrawn').length, 2, 'once per frame drawn');
// ---------------------------------------------------------------- the bug this exists for
assert.ok(!fn(loopSrc, 'frame').includes('titleFrames'), 'frame() does not mention the engine block\'s titleFrames at all');
assert.ok(html.includes('frameDrawn: () => { titleFrames++; },'), 'the bridge owns the counter (v1.97.153)');
{ // the fake P3 above has no `frameDrawn` if the bridge loses it: prove the check above is not vacuous
  const other = new Proxy({}, { has: () => true, get: (_, k) => k === 'perf' ? {} : (k === 'tier' ? { name: 'x' } : (k === 'viewmodel' ? {} : undefined)) });
  const c2 = { P3: other, Math, performance: { now: () => 0 }, document: { getElementById: el }, $: el, requestAnimationFrame: () => 0, window: {}, frameBody: () => {}, console };
  vm.createContext(c2);
  vm.runInContext([line(loopSrc, 'let fpsN = 0, fpsT = 0;'), line(loopSrc, 'const FPS_CAP ='), line(loopSrc, 'const PACE ='), fn(loopSrc, 'paceUpdate'), fn(loopSrc, 'frame'), 'this.frame = frame;'].join('\n'), c2);
  assert.throws(() => c2.frame(2000), /frameDrawn/, 'a bridge without frameDrawn fails the loop loudly, the way the missing titleFrames did');
}
console.log('PASS: the loop runs frame() for real with no engine block behind it - only P3 reaches it (' + bridgeKeys.size + ' bridge entries, ' + seen.length + ' bridge reads, no unknown ones), and a missing bridge entry or a bare engine name throws');
