// Run from the test/ directory: node validate-npc-dialogue.cjs
// Guards the situational NPC dialogue (TEST v1.97.25): Rick, Brenda, Tammy and Vern open with what is going on in the plant
// (blackout, ammonia, the corn field creatures, night), in their own voices; repeats get irritated; unprompted lines share one
// voice slot and only Rick radios across the plant. Runs the real engine, data and bark loop in a sandbox.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const a = html.indexOf('// ---------- SITUATIONAL DIALOGUE + BARKS'), b = html.indexOf('function npcSay(D, text) {', a);
assert.ok(a > 0 && b > a, 'the dialogue block is in the game');
const src = html.slice(a, b);
assert.ok(!/virgil/i.test(html), 'no Virgil anywhere in the game (owner: Rick only)');
let tick = null; const toasts = [], radios = [];
const P3 = { powerOutage: false, nh3: 0, walking: true, npcs: [{ id: 'op', x: 0, z: 0 }, { id: 'brenda', x: 100, z: 0 }, { id: 'tammy', x: 104, z: 0 }, { id: 'vern', x: 300, z: 0 }], walkPos: { x: 50, z: 50 },
  dbg: { CREEP: { kills: 0, bites: 0, list: [] } } };
let clock = 0, hour = 12;
const NPC_DEF = { op: { name: 'Rick · Board Op', hi: ['Yeah? Make it useful.'] }, brenda: { name: 'Brenda · Inbound Scale', hi: ['What?'] }, tammy: { name: 'Tammy · Outbound Scale', hi: ['Hey!'] }, vern: { name: 'Vern · Grain Receiving', hi: ['Yeah?'] } };
const c = { P3, NPC_DEF, Math, console, performance: { now: () => clock }, gameDate: () => ({ getHours: () => hour }), toast: t => toasts.push(t), radio: (w, t) => radios.push(w + ': ' + t),
  $: () => ({ classList: { contains: () => false } }), setInterval: f => { tick = f; }, setTimeout: f => f() };
vm.createContext(c); vm.runInContext(src + '\nthis.npcOpening = npcOpening; this.RICK_STATE = RICK_STATE; this.DLG = RICK_DLG; this.DATA = NPC_DIALOGUE;', c);
const open = id => { clock += 1000; return c.npcOpening(id); };
const ids = { op: 'rick', brenda: 'brenda', tammy: 'tammy', vern: 'vern' };
const lineOf = (pool, node) => c.DATA[pool].nodes.find(n => n.id === node).lines;
// normal day: everyday lines, which include each person's existing greetings
for (const id in ids) { const l = open(id); assert.ok(lineOf(ids[id], 'baseline').includes(l), id + ' opens with an everyday line: ' + l); }
// blackout: each reacts in their own voice; Rick sets the objective
P3.powerOutage = true; toasts.length = 0;
for (const id in ids) { const l = open(id); assert.ok(lineOf(ids[id], id === 'op' ? 'blackout_go' : 'blackout').includes(l), id + ' reacts to the blackout: ' + l); }
assert.ok(toasts.some(t => t.includes('📋 Reset the main breaker at the substation')), 'Rick gives the breaker objective');
// repeats get irritated, and the streak forgets after a break
let last; for (let i = 0; i < 3; i++) last = open('op');
assert.ok(c.DATA.rick.nodes.find(n => n.id === 'blackout_go').exhaustedLines.includes(last), 'clicking Rick again and again: ' + last);
clock += 30000; assert.ok(lineOf('rick', 'blackout_go').includes(open('op')), 'leave him alone a while and he talks normally again');
// power back: one "lights are back", then normal
P3.powerOutage = false; c.RICK_STATE.objective = '';
assert.ok(open('op').startsWith('Lights are back'), 'Rick notices the power coming back'); assert.ok(lineOf('rick', 'baseline').includes(open('op')), 'once');
// ammonia: Rick's hazard lines
P3.nh3 = 0.5; assert.ok(lineOf('rick', 'ammonia').includes(open('op')), 'Rick tells you to get out of the ammonia'); P3.nh3 = 0;
// creatures: stage ladder from the corn field state
const C = P3.dbg.CREEP; C.kills = 1; C.list = [{ kind: 'stalker', hp: 3, state: 'roam' }];
assert.ok(lineOf('rick', 'stalkers').includes(open('op')), 'stage 1: something in the corn'); assert.ok(lineOf('vern', 'creatures').includes(open('vern')), 'Vern has seen it before');
C.list.push({ kind: 'nibbler', hp: 1, state: 'hunt' }); assert.ok(lineOf('rick', 'nibblers').includes(open('op')), 'stage 2: nibblers'); assert.ok(lineOf('tammy', 'creatures').includes(open('tammy')), 'Tammy is scared to walk to her car');
C.list.push({ kind: 'nibbler', hp: 1, state: 'hunt', zombie: true }); assert.ok(lineOf('rick', 'zombies').includes(open('op')), 'stage 3: they got back up');
C.list.push({ kind: 'daddy', hp: 30, state: 'hunt' }); assert.ok(lineOf('rick', 'daddy').includes(open('op')), 'stage 4: Daddy Cob Legs'); assert.ok(lineOf('brenda', 'daddy').includes(open('brenda')), 'Brenda\'s drivers won\'t get out');
C.list = []; C.kills = 0;
// night
hour = 2; assert.ok(lineOf('brenda', 'night').includes(open('brenda')), 'night shift lines at night'); hour = 12;
// ---------------------------------------------------------------- barks: one voice at a time, only Rick on the radio
P3.powerOutage = true; toasts.length = 0; radios.length = 0; clock = 1e6;
P3.walkPos = { x: 101, z: 0 };   // standing between Brenda and Tammy, far from Rick
for (let s = 0; s < 60; s++) { clock += 1000; tick(); }
const said = [...radios.map(r => ['radio', r]), ...toasts.filter(t => !t.startsWith('📋')).map(t => ['near', t])];
assert.ok(radios.length > 0 && radios.every(r => r.startsWith('Rick:')), 'only Rick radios across the plant');
assert.ok(toasts.some(t => /^(Brenda|Tammy):/.test(t)), 'the people you are standing with mutter');
assert.ok(!toasts.some(t => t.startsWith('Vern:')), 'Vern, 200 m away, says nothing');
assert.ok(said.length <= 8, 'at most one unprompted line every 8 s (' + said.length + ' in 60 s)');
{ // never two at once: replay with a timeline
  const at = []; const tR = c.radio, tT = c.toast; c.radio = (w, t) => at.push(clock); c.toast = t => { if (!t.startsWith('📋')) at.push(clock); };
  vm.runInContext('radio = this.radio; toast = this.toast;', c);
  for (let s = 0; s < 120; s++) { clock += 1000; tick(); }
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 8000, 'lines at least 8 s apart');
}
P3.walking = false; const before = radios.length; clock += 20000; tick(); assert.equal(radios.length, before, 'nothing while not playing');
// every line fits a small box
for (const pool in c.DATA) for (const n of c.DATA[pool].nodes) for (const l of [...n.lines, ...(n.exhaustedLines || [])]) assert.ok(String(l).length <= 140, 'short line: ' + l);
assert.ok(html.includes("  if (!topic) { say = npcOpening(id) || npcLine(id, D.hi); opts = D.start; }"), 'the opening line comes from it, topics unchanged');
console.log('PASS: NPC dialogue (v1.97.25: Rick, Brenda, Tammy, Vern open with blackout / ammonia / corn field creatures / night / everyday lines in their own voices; irritated repeats that forget after a break; Rick sets objectives; one unprompted line every 8 s, only Rick on the radio; no Virgil)');
