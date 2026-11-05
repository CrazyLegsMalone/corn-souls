// Run from the test/ directory: node validate-title.cjs
// v1.97.131: the "Cry & Dry" title screen (the owner's Abyssal Harvest Fire design) in the splash: a 3D PS1 cob bonfire, the
// title and menu on the left, CRT lines. Checks the menu drives the real game actions, the owner's fixed settings (v1.97.144: the
// tuner is gone), the magenta-pink title, that the 3D scene is torn down with the splash, and that no class in the splash collides
// with one of the game's own global styles.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const m0 = html.indexOf('<div id="splash"'), m1 = html.indexOf('<script>', m0);
assert.ok(m0 > 0 && m1 > m0, 'the splash markup');
const mk = html.slice(m0, m1);
const s0 = m1, s1 = html.indexOf('</script>', s0), js = html.slice(s0, s1);
// v1.97.144, owner: "set the menu the way the settings are in the menu tuner then remove the menu tuner. give Corn Souls the magenta
// pinkish color scheme matching the fire. remove the harvest remembers ... remove rites and controls. new harvest should be solo
// harvest. kindle a bonfire should be Host Multiplayer. join a bonfire should be Join Multiplayer. remove a tale of the north field."
for (const a of ['one', 'host', 'join', 'joingo', 'back']) assert.ok(mk.includes('data-a="' + a + '"'), 'menu action ' + a);
assert.ok(!mk.includes('data-a="ctl"') && !mk.includes('RITES'), 'no controls item on the title (the controls card is in the in-game menu)');
for (const id of ['spEmb', 'spTap', 'spMain', 'spJoin', 'spCode', 'spVer']) assert.ok(mk.includes('id="' + id + '"'), '#' + id);
assert.deepEqual([...mk.matchAll(/data-a="(one|host|join)">([A-Z ]+)</g)].map(m => m[2]).join('|'), 'SOLO HARVEST|HOST MULTIPLAYER|JOIN MULTIPLAYER', 'the menu, renamed, in order');
assert.ok(mk.includes('<span>CORN</span><span>SOULS</span>') && mk.includes('<div class="sub"><b>Cry</b> &amp; <b>Dry</b></div>'), 'the title and "Cry & Dry" (no "the harvest remembers")');
assert.ok(!mk.includes('NORTH FIELD') && !mk.includes('class="kick"'), 'no "A tale of the north field"');
// the tuner is gone; its settings are fixed at the owner's values
assert.ok(!html.includes('spTuner') && !html.includes('#splash .tuner') && !js.includes('cs_title') && !js.includes('inTuner'), 'no tuner left (markup, styles, storage, input guards)');
const ts = js.match(/var TS = (\{[^}]*\});/); assert.ok(ts, 'the fixed settings');
const TS = Function('return ' + ts[1])();
assert.equal(JSON.stringify(TS), JSON.stringify({ bonfire: true, sil: false, embers: true, pixel: true, crt: true, audio: false, intensity: 139, hue: 0, size: 100, x: 4.0, z: 2.8 }), 'exactly the owner\'s tuner settings');
assert.ok(js.includes("function music() {\n    if (!TS.audio) return;"), 'title music off, as set');
// magenta / pink title to match the fire
const css0 = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
assert.ok(/#splash h1\{[^}]*linear-gradient\(180deg,#ffe6f2 0%,#ff9fd0 26%,#ff4fa2 52%,#d81b6a 78%,#8c0d3f 100%\)/.test(css0) && css0.includes('--sp-ember:#ff3d8b'), 'CORN SOULS in magenta-pink, accents to match');
assert.ok(!/#splash h1\{[^}]*#e9c46a/.test(css0), 'not the old gold');
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
// v1.97.158, owner: "remove no kernel left unburnt from start menu, make version on start menu 10% bigger. add the crt shader and
// pixel effect from the bonfire onto the title and cry and dry"
assert.ok(!html.includes('NO KERNEL LEFT UNBURNT') && !mk.includes('class="foot"') && !css0.includes('#splash .foot'), 'no "No kernel left unburnt" footer');
assert.ok(css0.includes("#splash .sv{position:absolute;bottom:22px;right:3vw;font:12.1px 'Cinzel'"), 'the version 10% bigger (11px -> 12.1px)');
assert.ok(mk.includes('<div class="crt"><div class="lean"></div><div class="vig"></div><canvas id="spTxt"></canvas><div class="roll"></div><div class="lines"></div></div>'), 'the title text layer sits in the CRT stack: over the darkening, under the rolling band and the scan lines');
assert.ok(css0.includes('#splash canvas#spTxt{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated') && css0.includes('#splash.pxt h1,#splash.pxt .sub{opacity:0}'), 'drawn back up with hard pixels; the page text hidden (still there for screen readers) once it is drawn');
assert.ok(js.includes("var k = innerWidth < 720 ? 2.5 : 3.2,") && js.includes("function pixK() { return TS.pixel ? (innerWidth < 720 ? 2.5 : 3.2) : 1; }"), 'the same pixel size as the bonfire');
assert.ok(js.includes("var c = document.getElementById('spTxt'), g = c && c.getContext && c.getContext('2d'), h1 = sp.querySelector('h1'), sub = sp.querySelector('.sub')") && js.includes('function tick() { if (!live) return;') && js.includes("catch (e) { sp.classList.remove('pxt'); return; }"), 'CORN SOULS and Cry & Dry, redrawn while the title is up; a failure leaves the page text showing');
// the fonts, with a fallback offline
assert.ok(html.includes('family=Cinzel') && /'Cinzel',Georgia/.test(css), 'Cinzel / Cormorant Garamond with Georgia fallback');
console.log('PASS: Cry & Dry title screen (pixel + CRT title, no footer, bigger version; Solo Harvest / Host Multiplayer / Join Multiplayer on the real actions; the owner\'s settings fixed, tuner gone; magenta-pink title; 3D bonfire torn down with the splash; no class clashes)');
