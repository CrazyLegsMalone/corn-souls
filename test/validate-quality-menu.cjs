// Run from the test/ directory: node validate-quality-menu.cjs
// Guards the pause-menu Quality choice (TEST v1.97.23): Auto / Low / Medium / High is stored as cs_perf (which perfTier
// obeys), the menu shows what is running, and a change offers a restart (warning that it leaves a 2 player game).
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = html.slice(html.indexOf('const QUALITY = ['), html.indexOf('function menu() {'));
assert.ok(src.includes('function qualityMenu()'), 'the quality menu is in the game');

const make = (stored, running, twoP) => {
  const store = new Map(stored ? [['cs_perf', stored]] : []), dialogs = [], toasts = [];
  const c = { localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    P3: { tier: { name: running }, net: { on: !!twoP } }, modal: (h, b) => dialogs.push({ h, b }), toast: t => toasts.push(t), menu: () => dialogs.push({ menu: true }),
    location: { reload: () => { c.reloaded = true; } }, reloaded: false };
  vm.createContext(c); vm.runInContext(src + '\nthis.qualityMenu = qualityMenu; this.qualityLabel = qualityLabel;', c);
  return { c, store, dialogs, toasts, press: label => { const d = dialogs.at(-1); const btn = d.b.find(x => x[0].replace('● ', '').startsWith(label)); assert.ok(btn, 'button ' + label); btn[1](); } };
};

{ // Auto on a phone: the label says what Auto chose; picking Medium stores it and offers a restart
  const t = make(null, 'low', false);
  assert.equal(t.c.qualityLabel(), 'Auto (low)', 'the pause menu shows Auto and what it picked');
  t.c.qualityMenu();
  assert.ok(t.dialogs[0].h.includes('Running now: <b>low</b>'), 'the Quality page says what is running');
  assert.equal(t.dialogs[0].b.length, 5, 'Auto, Low, Medium, High and Back');
  assert.ok(t.dialogs[0].b[0][0].startsWith('● Auto'), 'the current choice is marked');
  t.press('Medium');
  assert.equal(t.store.get('cs_perf'), 'medium', 'Medium is saved (perfTier reads cs_perf)');
  assert.ok(t.dialogs.at(-1).h.includes('takes effect when the game restarts') && !t.dialogs.at(-1).h.includes('2 player'), 'a restart is offered');
  t.press('Restart now'); assert.equal(t.c.reloaded, true, 'and Restart now restarts');
}
{ // picking what is already running needs no restart
  const t = make(null, 'low', false); t.c.qualityMenu(); t.press('Low');
  assert.equal(t.store.get('cs_perf'), 'low'); assert.ok(t.toasts.at(-1).startsWith('Quality: Low')); assert.ok(t.dialogs.at(-1).menu, 'straight back to the pause menu');
}
{ // back to Auto clears the override; in a 2 player game the restart warns first, and Later keeps playing
  const t = make('high', 'high', true);
  assert.equal(t.c.qualityLabel(), 'High');
  t.c.qualityMenu(); t.press('Auto');
  assert.equal(t.store.has('cs_perf'), false, 'Auto removes the override');
  assert.ok(t.dialogs.at(-1).h.includes('Restarting now leaves the 2 player game.'), 'the 2 player warning');
  t.press('Later'); assert.equal(t.c.reloaded, false); assert.ok(t.dialogs.at(-1).menu, 'Later goes back to the pause menu');
}
{ // a junk stored value reads as Auto
  const t = make('ultra', 'medium', false); assert.equal(t.c.qualityLabel(), 'Auto (medium)');
}
// the stored choice is what perfTier obeys, ahead of the device guess
{ const tierSrc = html.slice(html.indexOf('const TIERS = {'), html.indexOf('const TIER = perfTier();'));
  const pick = (v) => { const ctx = { navigator: { maxTouchPoints: 5, deviceMemory: 8, hardwareConcurrency: 8 }, window: { innerWidth: 640, innerHeight: 480 }, localStorage: { getItem: () => v } }; vm.createContext(ctx); vm.runInContext(tierSrc + '\nthis.t = perfTier();', ctx); return ctx.t.name; };
  assert.equal(pick(null), 'low', 'a small handheld guesses Low'); assert.equal(pick('medium'), 'medium', 'but a Medium choice wins'); }
// wired into the pause menu without disturbing the launcher's patch anchor right after it
assert.ok(html.includes("['⚙️ Quality: ' + qualityLabel(), () => qualityMenu()], ['Reset all setpoints', resetAll]];"), 'Quality sits on the pause menu');
assert.ok(fs.readFileSync('index.html', 'utf8').includes(`[", ['Reset all setpoints', resetAll]", ""]`), 'and the launcher still removes Reset all setpoints after it');
console.log('PASS: quality menu (v1.97.23: Auto / Low / Medium / High on the pause menu, stored as cs_perf which perfTier obeys; shows what is running; restart offered with a 2 player warning; same choice needs no restart)');
