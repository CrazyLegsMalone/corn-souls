// Run from the test/ directory: node validate-game-clock.cjs
// v1.97.102: debug day/night controls. Everything that goes by time of day reads gameDate(): the device clock until the
// debug menu sets an hour, nudges it, or runs the fast cycle (a day in 4 minutes). This runs the game's own clock code
// against a fake Date.now and checks the wiring and the debug menu rows.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const a = html.indexOf('// ---------- GAME CLOCK'), b = html.indexOf('dayT = 99;   // re-light right away\n}', a);
assert.ok(a > 0 && b > a, 'the game clock is in the engine');
let now = new Date(2026, 10, 3, 14, 13, 0).getTime();
const RealDate = Date;
class FakeDate extends RealDate { constructor(...x) { super(...(x.length ? x : [now])); } static now() { return now; } }
const ctx = { Date: FakeDate, root: {}, dayT: 0 };
vm.createContext(ctx);
vm.runInContext('let dayT = 0;\n' + html.slice(a, b + 'dayT = 99;   // re-light right away\n}'.length) + '\nthis.GT = GT; this.gameDate = gameDate; this.set = gameTimeSet; this.dt = () => dayT;', ctx);
const hm = () => { const d = ctx.gameDate(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
assert.equal(ctx.root.gameDate, ctx.gameDate, 'exported on window for the UI script');
assert.equal(hm(), '14:13', 'real time by default'); now += 60e3; assert.equal(hm(), '14:14', 'and it follows the device clock');
ctx.set({ hour: 3 }); assert.equal(hm(), '3:00', 'set an hour'); assert.equal(ctx.dt(), 99, 'the sky re-lights right away');
now += 10 * 60e3; assert.equal(hm(), '3:10', 'a set time keeps running at normal speed');
ctx.set({ shift: 1 }); assert.equal(hm(), '4:10', '+1 hour'); ctx.set({ shift: -2 }); assert.equal(hm(), '2:10', '-1 hour twice');
ctx.set({ hour: 21.5 }); assert.equal(hm(), '21:30', 'half hours');
ctx.set({ rate: 360 }); now += 60e3; assert.equal(hm(), '3:30', 'fast cycle: one real minute is six game hours');
now += 3 * 60e3; assert.equal(hm(), '21:30', 'a whole day in 4 minutes');
ctx.set({ hour: 12 }); assert.equal(ctx.GT.rate, 360, 'setting an hour keeps the fast cycle running');
ctx.set({ rate: 1 }); now += 60e3; assert.equal(hm(), '12:01', 'fast cycle off: back to normal speed from where it was');
ctx.set({ real: true }); assert.equal(ctx.gameDate().getTime(), now, 'real time again'); assert.equal(ctx.GT.rate, 1);

// wiring: nothing that goes by time of day reads the device clock directly any more
assert.ok(html.includes('if (dayT > (GT.rate > 1 ? 0.2 : 20)) { dayT = 0; const d = gameDate(); daylight('), 'sky and light (re-lit 5x a second in the fast cycle)');
assert.ok(html.includes('const d = gameDate(), h = (d.getHours() + d.getMinutes() / 60 + 9) % 12,'), 'beer well transfer schedule');
assert.ok(html.includes('function tick() { const d = gameDate();') && html.includes('tick(); setInterval(tick, 1000);'), 'HUD clock, every second');
assert.ok(html.includes('const h = gameDate().getHours();') && html.includes('drawSky(); setInterval(drawSky, 2000);'), 'sun/moon badge');
assert.ok(html.includes('function pickTrack() { const part = gameDate().getHours() < 12'), 'AM / PM music track');
const eng = html.slice(html.indexOf("(function (root) {\n'use strict';"));
assert.ok(!/new Date\(\)\.getHours|const d = new Date\(\)/.test(eng), 'no direct device-clock reads left');
// the debug menu
assert.ok(html.includes("['🕐 Time of day: ' + timeLabel(), () => timeMenu(code)]"), 'Time of day row on the debug menu');
const tm = html.slice(html.indexOf('function timeMenu(code) {'), html.indexOf('function debugMenu(code) {'));
for (const r of ["'⏱ Real time (device clock)'", "['🌅 Sunrise (8 AM)', 8]", "['☀️ Midday (2 PM)', 14]", "['🌇 Sunset (8 PM)', 20]", "['🌙 Night (11 PM)', 23]", "['🌑 Deep night (2 AM)', 2]", "'⏩ +1 hour'", "'⏪ −1 hour'", 'Fast cycle', "'Back to debug'"])
  assert.ok(tm.includes(r), 'time menu row ' + r);
assert.ok(tm.includes('go({ rate: P3.time.fast ? 1 : 360 })'), 'fast cycle toggles');
assert.ok(html.includes('time: { set: o => gameTimeSet(o), date: () => gameDate(),'), 'exported as Plant3D.time');
// v1.97.103: eight looks, one every 3 hours, on the same hours as the sun/moon badge; night falls at 10 PM
{ const ls = html.slice(html.indexOf('const LOOKS = ['), html.indexOf('].map(', html.indexOf('const LOOKS = [')) + 1);
  const L = JSON.parse(JSON.stringify(vm.runInNewContext(ls.replace('const LOOKS = ', '(') + ')')));   // out of the vm realm
  assert.deepEqual(L.map(l => l.at), [7, 10, 13, 16, 19, 22, 1, 4], 'eight looks, every 3 hours, in order round the clock');
  const slots = [...html.slice(html.indexOf('const SKY_SLOTS = ['), html.indexOf('let skySlot')).matchAll(/\[(\d+), '(sun|moon)'/g)].map(m => +m[1]);
  assert.deepEqual(L.map(l => l.at).sort((x, y) => x - y), slots.sort((x, y) => x - y), 'same hours as the sun/moon badge');
  const hk = h => L.find(l => l.at === h).hk;
  assert.ok(hk(22) < 0.7 && hk(1) < hk(22) && hk(1) === Math.min(...L.map(l => l.hk)), 'night at 10 PM, deep night at 1 AM the darkest');
  assert.ok(hk(1) >= 0.5, 'deep night still lets you make out the plant');
  assert.ok(L.filter(l => l.hk >= 1.06).every(l => [10, 13, 16].includes(l.at)), 'full daylight 10 AM to 7 PM (yard lamps off)');
  assert.ok((1.06 - hk(22)) / 0.4 >= 1, 'the yard lamps are fully on by night'); }
console.log('PASS: game clock (real / set hour / +-1 h / fast cycle), every time-of-day reader wired to it, debug Time of day menu, eight 3-hour looks');
