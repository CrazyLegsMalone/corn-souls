// Run from the test/ directory: node validate-npc-voices.cjs
// Guards the recorded NPC voices (TEST v1.97.86): the clip keys, how a line is cut into pieces and numbers, which clips play a line,
// that the line list the build records (scripts/npc_voice_lines.cjs) covers the game's lines with the same keys, and the wiring:
// Auto plays a recorded clip first and falls back to the device voice / mumble; the workflow, credits and registry are in place.
const fs = require('fs'), vm = require('vm'), os = require('os'), path = require('path'), cp = require('child_process'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, 'found ' + a); return html.slice(i, j); };
const c = { Set, Map, Math, console, Promise };
vm.createContext(c);
vm.runInContext(cut('function voiceNorm(t)', 'function voiceIndexLoad()') + cut('function voicePlan(text, V)', 'async function voiceGet(') +
  '\nthis.norm = voiceNorm; this.key = voiceKey; this.segs = voiceSegments; this.plan = voicePlan;', c);

// ---- keys: FNV-1a of the normalized lower-cased text (same as an independent implementation)
const fnv = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
assert.equal(c.key('Yeah? Make it useful.'), fnv('yeah? make it useful.'));
assert.equal(c.key('  Radio: Another wave.   Count your shells. '), c.key('Another wave. Count your shells.'), '"Radio:" and spacing do not change the clip');
assert.equal(c.key('*sighs* Hm.'), c.key('Hm.'), '*actions* are not spoken');
assert.equal(c.norm('*looks north*'), '', 'an action alone says nothing');

// ---- pieces: standalone numbers split out, "4x4" stays text
const s = c.segs('Yeast cooler is at 47 degrees and alarming. Somebody left 2 doors open. Go shut it.');
assert.equal(JSON.stringify(s), JSON.stringify([{ text: 'Yeast cooler is at' }, { num: 47, pct: false }, { text: 'degrees and alarming.' }, { text: 'Somebody left' }, { num: 2, pct: false }, { text: 'doors open.' }, { text: 'Go shut it.' }]));
assert.ok(c.segs('The green 4x4. Mine.').every(g => g.num == null), '"4x4" is not a number');
assert.equal(JSON.stringify(c.segs('Prop 1 is 80% grown, Prop 2 is empty.').filter(g => g.num != null)), JSON.stringify([{ num: 1, pct: false }, { num: 80, pct: true }, { num: 2, pct: false }]));

// ---- which clips play a line
const V = { set: new Set(['yeast cooler is at', 'degrees and alarming.', 'somebody left', 'doors open.', 'go shut it.', '47', '2', 'percent', 'yeah? make it useful.'].map(c.key)) };
assert.equal(JSON.stringify(c.plan('Yeah? Make it useful.', V)), JSON.stringify([c.key('Yeah? Make it useful.')]), 'a whole line plays its own clip');
assert.equal(c.plan('Yeast cooler is at 47 degrees and alarming. Somebody left 2 doors open. Go shut it.', V).length, 7, 'a live line joins pieces and numbers');
assert.equal(c.plan('Yeast cooler is at 48 degrees and alarming.', V), null, 'a number without a clip: not recorded (falls back)');
assert.equal(c.plan('Yeast cooler is at 470 degrees and alarming.', V), null, 'over 100: falls back');
assert.equal(c.plan('Something nobody recorded.', V), null, 'an unknown line falls back');

// ---- the build's line list matches the game
const tmp = path.join(os.tmpdir(), 'npc_lines_test.json');
cp.execFileSync('node', [path.join('..', 'scripts', 'npc_voice_lines.cjs'), tmp], { stdio: 'pipe' });
const L = JSON.parse(fs.readFileSync(tmp, 'utf8')).lines, has = {};
for (const w of ['op', 'brenda', 'tammy', 'vern']) { assert.ok(L[w] && L[w].length > 100, w + ' has lines to record'); has[w] = { set: new Set(L[w].map(x => x.key)) };
  for (const x of L[w]) assert.equal(x.key, c.key(x.text), 'the build keys the way the game does: ' + x.text);
  for (let n = 0; n <= 100; n++) assert.ok(has[w].set.has(c.key(String(n))), w + ' says ' + n); }
for (const [w, t] of [['op', "You're bleeding on my floor."], ['op', 'Radio: Is that my truck. Tell me that\'s not my truck.'], ['op', 'The green 4x4. Mine. Keep your hands off it and we will get along almost adequately.'],
  ['op', 'Ammonia leak at the ammonia tank! Everybody get upwind, and somebody shut that drain valve!'], ['op', 'See ya.'], ['brenda', 'That is enough questions. Vern is over in grain.'],
  ['tammy', 'Is that my car?! Bring it back!'], ['vern', 'Mine.'], ['vern', 'Here they come.']])
  assert.ok(c.plan(t, has[w]), w + ' has a recording for: ' + t);
for (const t of ['Yeast cooler is at 47 degrees and alarming. Somebody left 2 doors open. Go shut it.', 'Yeast cooler is reading 38 degrees. That\'s fine. Leave the doors shut.',
  'Yeast cooler is still 52 degrees. Doors are still open out there.', 'They roost all over the plant. You\'ve gotten 12 of them so far. Paintballs are cheaper than spikes.'])
  assert.ok(c.plan(t, has.op), 'Rick can say the live line: ' + t);
assert.ok(!c.plan('Right now I\'ve got 2 alarms: hi temp, low level. Fun day.', has.op), 'free-text alarm names are not recorded (device voice / mumble)');

// ---- wiring
assert.ok(/if \(mode === 'auto' && typeof voicePlay === 'function' && voicePlay\(text, who, opt, \(\) => npcVoiceFallback\(u, text, who, opt\)\)\)/.test(html), 'Auto tries the recording first, with the old way as the fallback');
assert.ok(html.includes("const w = who === 'radio' ? 'op' : who"), 'radio calls use Rick\'s recordings');
assert.ok(html.includes("base: '/corn-souls/assets/voices/'"), 'clips come from assets/voices');
const wf = fs.readFileSync('../.github/workflows/npc-voices.yml', 'utf8');
assert.ok(wf.includes('node scripts/npc_voice_lines.cjs build/npc_lines.json') && wf.includes('python scripts/make_npc_voices.py') && /contents: write/.test(wf), 'the workflow records and commits the clips');
const cfg = JSON.parse(fs.readFileSync('../scripts/npc_voices.json', 'utf8'));
assert.equal(cfg.model, 'en_US-libritts-high', 'the CC BY 4.0 LibriTTS voice trained from scratch');
const reg = JSON.parse(fs.readFileSync('../assets/registry.json', 'utf8')).assets.find(a => a.id === 'piper-libritts-high-npc-voices');
assert.ok(reg && reg.status === 'in-use' && /CC BY 4\.0/.test(reg.license_name), 'registry entry');
assert.ok(fs.readFileSync('../CREDITS.md', 'utf8').includes('en_US-libritts-high'), 'credited');
assert.ok(fs.existsSync('voice-audition.html'), 'the audition page');

console.log('PASS validate-npc-voices: keys, pieces and numbers, which clips play a line, the build list matches the game, Auto tries recordings first, workflow / credits / registry');
