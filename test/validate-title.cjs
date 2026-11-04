// Run from the test/ directory: node validate-title.cjs
// v1.97.131: the "Cry & Dry" title screen (the owner's Abyssal Harvest Fire design) in the splash: a 3D PS1 cob bonfire, the
// title and menu on the left, CRT lines and a tuner. Checks the menu still drives the real game actions, the tuner's 6 toggles
// and 5 sliders, that the tuner's keys/taps don't start the game, that the 3D scene is torn down with the splash, and that no
// class in the splash collides with one of the game's own global styles (the game's .tb touch buttons hid the tuner once).
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const m0 = html.indexOf('<div id="splash"'), m1 = html.indexOf('<script>', m0);
assert.ok(m0 > 0 && m1 > m0, 'the splash markup');
const mk = html.slice(m0, m1);
const s0 = m1, s1 = html.indexOf('</script>', s0), js = html.slice(s0, s1);
// the menu: themed names, the same four actions (one / host / join / ctl) and the join box
for (const a of ['one', 'host', 'join', 'ctl', 'joingo', 'back']) assert.ok(mk.includes('data-a="' + a + '"'), 'menu action ' + a);
for (const id of ['spEmb', 'spTap', 'spMain', 'spJoin', 'spCode', 'spVer', 'spTuner', 'spTunerHead', 'spTunerReset']) assert.ok(mk.includes('id="' + id + '"'), '#' + id);
assert.ok(/NEW HARVEST[\s\S]*KINDLE A BONFIRE[\s\S]*JOIN A BONFIRE[\s\S]*RITES &amp; CONTROLS/.test(mk), 'the themed menu, in order');
assert.ok(mk.includes('<span>CORN</span><span>SOULS</span>') && mk.includes('<b>Cry</b> &amp; <b>Dry</b>'), 'the title and subtitle');
// the tuner: 6 toggles, 5 sliders, all known settings, remembered on the device (guarded)
const toggles = [...mk.matchAll(/type="checkbox" data-k="(\w+)"/g)].map(m => m[1]), sliders = [...mk.matchAll(/type="range" data-k="(\w+)"/g)].map(m => m[1]);
assert.deepEqual(toggles, ['bonfire', 'sil', 'embers', 'pixel', 'crt', 'audio'], 'six layer toggles');
assert.deepEqual(sliders, ['intensity', 'hue', 'size', 'x', 'z'], 'five sliders');
const tdef = js.match(/var TDEF = (\{[^}]*\})/); assert.ok(tdef, 'TDEF');
const TDEF = Function('return ' + tdef[1])();
for (const k of toggles.concat(sliders)) assert.ok(k in TDEF, 'default for ' + k);
for (const k of toggles) assert.equal(TDEF[k], true, k + ' on by default');
assert.ok(/try \{ var sv0 = JSON\.parse\(localStorage\.getItem\('cs_title'\)/.test(js) && /function tsSave\(\) \{ try \{ localStorage\.setItem\('cs_title'/.test(js), 'settings load/save are wrapped in try/catch');
// the tuner's own input never starts the game
assert.ok(/function inTuner\(e\)/.test(js), 'inTuner');
assert.ok(/if \(!live \|\| modalOpen\(\) \|\| window\.__wnClose \|\| inTuner\(e\)\) return;/.test(js), 'keys typed in the tuner are left alone');
assert.ok(/addEventListener\('pointerdown', function \(e\) \{ if \(inTuner\(e\)\) return;/.test(js), 'taps on the tuner do not leave the title');
assert.ok(/shownAt < 350 \|\| inTuner\(e\)\) return;/.test(js), 'clicks on the tuner do not pick a menu item');
// the 3D scene: waits for THREE, comes in with the menu, goes with the splash, and frees its WebGL context
assert.ok(/function title3D\(T\)/.test(js) && /function wait3D\(\) \{ if \(!live\) return; if \(window\.THREE\)/.test(js), 'the 3D scene starts once THREE is loaded');
assert.equal(html.split('function frame(now) {').length, 2, 'the title scene\'s loop has its own name (other suites slice the game at its frame())');
assert.ok(/stop: function \(\) \{ run = false; window\.removeEventListener\('resize', resize\)/.test(js) && /forceContextLoss/.test(js), 'stop() unhooks and drops the GL context');
assert.ok(/R3\.flare\(1\.6\)/.test(js), 'the fire roars up as the menu comes in');
// go(): every statement on its line runs (a // comment mid-line once swallowed the body class removal)
const goLine = js.split('\n').find(l => l.includes('live = false; boom();'));
const code = goLine.split('//')[0];
assert.ok(code.includes("document.body.classList.remove('splash')") && code.includes("window.removeEventListener('keydown', key, true)"), 'go() leaves the splash state (not commented out)');
assert.ok(/if \(R3\) setTimeout\(function \(\) \{ if \(R3\) \{ R3\.stop\(\); R3 = null; \} \}, 1300\);/.test(js), 'the 3D title scene stops after the fade');
// no class inside the splash has a global (unscoped) game style
const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const classes = new Set([...mk.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)));
const clash = [...classes].filter(c => new RegExp('(^|[},])\\s*\\.' + c + '(?![-\\w])[^{]*\\{', 'm').test(css));
assert.deepEqual(clash, [], 'splash classes with a global game style: ' + clash.join(', '));
// the fonts, with a fallback offline
assert.ok(html.includes('family=Cinzel') && /'Cinzel',Georgia/.test(css), 'Cinzel / Cormorant Garamond with Georgia fallback');
console.log('PASS: Cry & Dry title screen (themed menu on the real actions; tuner 6 toggles + 5 sliders, saved safely, never starts the game; 3D bonfire torn down with the splash; no class clashes)');
