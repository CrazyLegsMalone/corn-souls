// Run from the test/ directory: node validate-npc-mumble.cjs
// Guards the NPC mumble voice (TEST v1.97.83): where the device has no text-to-speech (or it never starts), Rick, Brenda, Tammy,
// Vern and the radio talk in a mumble synthesized from the actual line. Runs the real code in a sandbox with a mock Web Audio API.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const a = html.indexOf('// ---------- NPC MUMBLE VOICE'), b = html.indexOf('window.__mumble = {', a);
assert.ok(a > 0 && b > a, 'the mumble block is in the game');
const src = html.slice(a, html.indexOf('\n', b) + 1);

// ---- the game wiring
const say = html.slice(html.indexOf('function npcSay(D, text) {'), html.indexOf('// ---------- NPC MUMBLE VOICE'));
assert.ok(/npcVoiceSay\(u, text, who\)/.test(say), 'talking to someone goes through npcVoiceSay');
assert.ok(!/speechSynthesis\.speak/.test(say), 'npcSay no longer speaks on its own (npcVoiceSay decides)');
const radio = html.slice(html.indexOf('function radio(who, text) {'), html.indexOf('P3.coolerNotify = (who, text) => radio(who, text);'));
assert.ok(/npcVoiceSay\(u, text, w, \{ radio: true/.test(radio) && !/speechSynthesis\.speak/.test(radio), 'radio calls mumble over the radio too');
assert.ok(/function listenTalk[\s\S]{0,200}mumbleStop\(\)/.test(html), 'the mic button cuts off a mumble like it cuts off the device voice');
const ss = fs.readFileSync('sound-settings.js', 'utf8');
assert.ok(/'NPC voices: '\+soundNpcVoiceLabel\(\)/.test(ss) && /cs_npc_voice/.test(ss), 'Sound menu has the NPC voices choice');

// ---- a mock Web Audio API that records what is scheduled
function makeCtx() {
  const log = { osc: 0, noise: 0, events: [], started: 0, stopped: 0 };
  const param = name => ({ value: 0, setValueAtTime(v, t) { log.events.push([name, v, t]); }, setTargetAtTime(v, t) { log.events.push([name, v, t]); }, linearRampToValueAtTime(v, t) { log.events.push([name, v, t]); }, cancelScheduledValues() {} });
  const node = extra => Object.assign({ connect() {}, disconnect() {} }, extra);
  const C = { currentTime: 0, sampleRate: 8000, state: 'running', destination: node(), resume() {},
    createGain: () => node({ gain: param('gain') }),
    createBiquadFilter: () => node({ type: '', frequency: param('freq'), Q: param('q') }),
    createWaveShaper: () => node({ curve: null }),
    createOscillator: () => { log.osc++; return node({ type: '', frequency: param('f0'), start() { log.started++; }, stop() { log.stopped++; }, onended: null }); },
    createBuffer: (ch, n) => ({ getChannelData: () => new Float32Array(n) }),
    createBufferSource: () => { log.noise++; return node({ buffer: null, loop: false, start() {}, stop() {} }); } };
  return { C, log };
}
let timers = [];
const store = {};
const c = { console, Math, String, Float32Array, Object, setTimeout: (f, ms) => timers.push([f, ms]), localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } };
c.window = c;
vm.createContext(c);
vm.runInContext(src + '\nthis.mumbleSyllables = mumbleSyllables; this.mumble = mumble; this.npcVoiceSay = npcVoiceSay; this.setCtx = f => { mumbleCtx = f; }; this.MV = MUMBLE_VOICE;', c);

// ---- the line becomes syllables
const syl = c.mumbleSyllables("Radio: Pit's clear. *looks north* Is the cooler okay? Hm, strength!");
const voiced = syl.filter(x => !x.pause);
assert.equal(voiced.length, 10, 'syllables follow the words: ' + voiced.map(x => x.on + x.v + x.coda).join(' '));
assert.ok(!voiced.some(x => /look|north/.test(x.on + x.v + x.coda)), '*stage directions* are not spoken');
assert.ok(!voiced.some(x => /radio/.test(x.on + x.v)), 'the "Radio:" prefix is not spoken');
assert.ok(syl.some(x => x.end === '?') && syl.some(x => x.end === '!') && syl.some(x => x.end === '.'), 'sentence ends are marked');
assert.ok(syl.filter(x => x.pause).length >= 4, 'commas and full stops are pauses');
assert.equal(c.mumbleSyllables('*looks north*').length, 0, 'a line that is only an action is silent');

// ---- it makes sound, each person at their own pitch, a question goes up
for (const who of ['op', 'brenda', 'tammy', 'vern', 'radio']) assert.ok(c.MV[who], who + ' has a mumble voice');
assert.ok(c.MV.vern.f0 < c.MV.op.f0 && c.MV.op.f0 < c.MV.brenda.f0 && c.MV.brenda.f0 < c.MV.tammy.f0, 'Vern lowest, then Rick, Brenda, Tammy highest');
const pitches = {};
for (const who of ['op', 'vern', 'brenda', 'tammy']) {
  const { C, log } = makeCtx(); c.setCtx(() => C);
  const d = c.mumble('Is the cooler okay?', who);
  assert.ok(d > 0.4 && d < 3, who + ' mumbles for a sensible time: ' + d.toFixed(2) + ' s');
  assert.equal(log.osc, 1, 'one oscillator per line'); assert.equal(log.noise, 1, 'one noise source per line');
  const f = log.events.filter(e => e[0] === 'f0').map(e => e[1]);
  pitches[who] = f[1];
  assert.ok(f[f.length - 1] > f[f.length - 2] * 1.3, who + ': the question rises at the end');
  assert.ok(log.events.some(e => e[0] === 'gain' && e[1] > 0.3), who + ': the voice is actually turned up');
}
assert.ok(pitches.vern < pitches.op && pitches.op < pitches.brenda, 'pitches heard in that order');
{ const { C } = makeCtx(); c.setCtx(() => C); const long = c.mumble('word '.repeat(200) + '.', 'op'); assert.ok(long < 8, 'long speeches stop after about 7 s (' + long.toFixed(1) + ')'); }
{ const { C } = makeCtx(); c.setCtx(() => C); assert.equal(c.mumble('', 'op'), 0, 'nothing to say: no sound'); }

// ---- device voice or mumble
let spoke = 0, cancelled = 0; const utter = () => ({});
const tts = { speak: () => { spoke++; }, cancel: () => { cancelled++; }, getVoices: () => [] };
function run(mode, ttsOn, ttsState) {
  store.cs_npc_voice = mode; spoke = 0; timers = [];
  if (ttsOn) { c.speechSynthesis = tts; c.SpeechSynthesisUtterance = function () {}; } else { delete c.speechSynthesis; delete c.SpeechSynthesisUtterance; }
  vm.runInContext('ttsWorks = ' + JSON.stringify(ttsState) + ';', c);
  const { C, log } = makeCtx(); c.setCtx(() => C);
  const u = ttsOn ? utter() : null; c.npcVoiceSay(u, 'Hey there.', 'tammy');
  return { log, u };
}
let r = run('auto', false, null); assert.equal(r.log.osc, 1, 'no text-to-speech on this device: Tammy mumbles');
r = run('auto', true, true); assert.ok(spoke === 1 && r.log.osc === 0, 'device voice works: it talks, no mumble');
r = run('auto', true, false); assert.ok(spoke === 0 && r.log.osc === 1, 'device voice failed before: mumble from then on');
r = run('mumble', true, true); assert.ok(spoke === 0 && r.log.osc === 1, 'Sound menu set to Mumble: always mumble');
r = run('device', false, null); assert.ok(spoke === 0 && r.log.osc === 0, 'set to Device voice with none: silent, as before');
// first line: the device says it can talk but never starts -> that line is mumbled and the game stays on mumble
r = run('auto', true, null); assert.ok(spoke === 1 && r.log.osc === 0 && typeof r.u.onstart === 'function', 'first line tries the device voice and watches it');
{ const { C, log } = makeCtx(); c.setCtx(() => C); timers[0][0](); assert.equal(log.osc, 1, 'it never started: mumbled instead'); assert.equal(vm.runInContext('ttsWorks', c), false, 'and remembered'); }
r = run('auto', true, null); r.u.onstart(); { const { C, log } = makeCtx(); c.setCtx(() => C); timers[0][0](); assert.equal(log.osc, 0, 'it started: no mumble on top'); assert.equal(vm.runInContext('ttsWorks', c), true); }
r = run('auto', true, null); { const { C, log } = makeCtx(); c.setCtx(() => C); r.u.onerror({ error: 'synthesis-failed' }); assert.equal(log.osc, 1, 'an error from the device voice: mumble'); }
r = run('auto', true, null); { const { C, log } = makeCtx(); c.setCtx(() => C); r.u.onerror({ error: 'interrupted' }); assert.equal(log.osc, 0, 'cut off by the next line is not a failure'); }

console.log('PASS validate-npc-mumble: syllables, voices, question rise, length cap, device voice / mumble choice and fallback');
