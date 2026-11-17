#!/usr/bin/env node
// Lists every line the NPCs can say, per person, for the recorded voices (v1.97.86).
//   node scripts/npc_voice_lines.cjs [out.json]      (default: build/npc_lines.json)
// Reads test/game.html and game.html (TEST and LIVE), so clips exist for both. Uses the game's own voiceNorm / voiceKey /
// voiceSegments (cut out of test/game.html), so the keys always match what the game looks up.
// What is collected:
//   - every fixed line: greetings, fallbacks, topic answers, situational and bark lines, goodbyes, Brenda's "enough questions"
//   - Rick's radio call-outs (COOL_NOTIFY) and Board Op lines
//   - lines built from live values (cooler temperature, props, Rick's job / joke picks): their functions are run against many made-up
//     plant states, and anything with a number is cut into pieces (text between numbers and punctuation) that the game joins
//   - the numbers 0-100 and "percent" for every person
// Output: { lines: { op: [{ key, text }], brenda: [...], tammy: [...], vern: [...] }, counts }
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const WHO = ['op', 'brenda', 'tammy', 'vern'];

function cut(src, a, b, file) {
  const i = src.indexOf(a), j = src.indexOf(b, i + 1);
  if (i < 0 || j < 0) throw Error(file + ': cannot find ' + JSON.stringify(a) + ' .. ' + JSON.stringify(b));
  return src.slice(i, j);
}

// the key functions, from the TEST game (the one that plays the clips)
const testHtml = fs.readFileSync(path.join(ROOT, 'test/game.html'), 'utf8');
const keySrc = cut(testHtml, 'function voiceNorm(t)', 'function voiceIndexLoad()', 'test/game.html');
const K = {}; vm.runInNewContext(keySrc + '\nthis.voiceNorm = voiceNorm; this.voiceKey = voiceKey; this.voiceSegments = voiceSegments;', K);

const lines = {}; for (const w of WHO) lines[w] = new Map();
function addWhole(w, t) {   // a fixed line: one clip
  const n = K.voiceNorm(t); if (!n || !/[a-z]/i.test(n)) return;
  lines[w].set(K.voiceKey(n), n);
}
function addLive(w, t) {   // a line built from live values: one clip if it has no numbers, else its pieces
  const n = K.voiceNorm(t); if (!n) return;
  if (K.voiceSegments(n).some(g => g.num != null)) addPieces(w, n); else addWhole(w, n);
}
function addPieces(w, t) {   // a line with live numbers: its pieces
  for (const g of K.voiceSegments(t)) if (g.text != null) lines[w].set(K.voiceKey(g.text), g.text);
}

function strings(src) {   // the single-quoted / double-quoted string literals in a bit of source
  const out = []; const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g; let m;
  while ((m = re.exec(src))) { const raw = m[1] != null ? m[1] : m[2]; try { out.push(JSON.parse('"' + raw.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"')); } catch (e) { out.push(raw); } }
  return out;
}
const sentence = s => /^[A-Z*]/.test(s) && /[a-z]/.test(s) && (s.includes(' ') || /[.!?]$/.test(s));

function fromGame(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (!html.includes('const NPC_DEF = {')) return;
  const data = cut(html, 'const pick = a =>', 'const NPC_POOL =', file);
  // a made-up plant to run the line functions against
  const P3 = { cooler: null, alarms: [], weather: 'sunny', pigeonHits: 0, powerOutage: false, nh3: 0, npcs: [], walkPos: { x: 0, z: 0 },
    dbg: { CREEP: { kills: 0, bites: 0, list: [] }, HP: { hp: 100, max: 100 } } };
  const sim = { prop: null, yb: { q: 1 } };
  const ctx = { P3, sim, Math: Object.create(Math), console, performance: { now: () => 0 }, gameDate: () => ({ getHours: () => 12 }), $: () => null };
  vm.createContext(ctx);
  vm.runInContext(data + '\nthis.NPC_DEF = NPC_DEF; this.NPC_DIALOGUE = NPC_DIALOGUE;', ctx);
  const D = ctx.NPC_DEF, X = ctx.NPC_DIALOGUE, POOL = { op: 'rick', brenda: 'brenda', tammy: 'tammy', vern: 'vern' };
  const STATES = ['empty', 'filling', 'propping', 'ready', 'pitching', 'cleaning'];
  const randomPlant = () => {
    const r = Math.random;
    P3.cooler = r() < 0.15 ? null : { T: Math.round(20 + r() * 60), alarm: r() < 0.5, open: (r() * 4) | 0 };
    P3.pigeonHits = (r() * 101) | 0;
    sim.prop = r() < 0.1 ? null : [0, 1].map(() => ({ state: STATES[(r() * STATES.length) | 0], grow: r(), to: (r() * 7) | 0 }));
    sim.yb = { q: r() < 0.5 ? 1 : 0.5 };
  };
  for (const w of WHO) {
    const d = D[w]; if (!d) continue;
    for (const t of [...d.hi, ...d.fallback]) addWhole(w, t);
    for (const id in d.topics) {
      const T = d.topics[id];
      if (Array.isArray(T.say)) T.say.forEach(t => addWhole(w, t));
      else if (typeof T.say === 'string') addWhole(w, T.say);
      else if (typeof T.say === 'function') {
        if (/alarmSay|wxSay/.test(String(T.say))) continue;   // free text (alarm names, the weather readout): device voice / mumble
        for (let i = 0; i < 400; i++) { randomPlant(); try { addLive(w, T.say()); } catch (e) {} }
      }
    }
    for (const n of (X[POOL[w]] || {}).nodes || []) {
      for (const l of n.lines || []) addWhole(w, typeof l === 'string' ? l : l.text);
      for (const l of n.exhaustedLines || []) addWhole(w, l);
    }
  }
  // the quiet-board line of alarmSay is fixed text
  for (const t of strings(cut(html, 'const alarmSay', '\n', file))) if (sentence(t) && !/^Right now/.test(t)) addWhole('op', t);
  // goodbyes (anyone) and Brenda's "that is enough questions"
  const talk = cut(html, 'function talk(id, topic, heard) {', '\nfunction reply(', file);
  const bye = talk.match(/pick\(\[([^\]]*)\]\)/); if (bye) for (const t of strings(bye[1])) for (const w of WHO) addWhole(w, t);
  const enough = talk.match(/npcLine\(id, \[([^\]]*)\]\)/); if (enough) for (const t of strings(enough[1])) addWhole('brenda', t);
  // Rick's radio call-outs from the plant (COOL_NOTIFY('Board Op', ...)): fixed ones whole, the ones with a temperature in pieces
  for (const m of html.matchAll(/COOL_NOTIFY\('Board Op', ([^\n]*?)\); \}/g)) {
    const lits = strings(m[1]);
    if (/Math\.round|\+ /.test(m[1].replace(/'[^']*'/g, ''))) lits.forEach(t => addPieces('op', t));
    else lits.filter(sentence).forEach(t => addWhole('op', t));
  }
}

fromGame('test/game.html');
try { fromGame('game.html'); } catch (e) { console.log('(LIVE game.html has the older dialogue layout; its lines come once TEST is promoted)'); }
for (const w of WHO) { for (let n = 0; n <= 100; n++) lines[w].set(K.voiceKey(String(n)), String(n)); lines[w].set(K.voiceKey('percent'), 'percent'); }

const out = { lines: {}, counts: {} };
for (const w of WHO) { out.lines[w] = [...lines[w]].map(([key, text]) => ({ key, text })).sort((a, b) => a.key < b.key ? -1 : 1); out.counts[w] = out.lines[w].length; }
const dest = process.argv[2] || path.join(ROOT, 'build/npc_lines.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1));
console.log('NPC lines: ' + WHO.map(w => w + ' ' + out.counts[w]).join(', ') + ' -> ' + path.relative(ROOT, dest));
