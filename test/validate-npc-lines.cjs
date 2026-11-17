// Run from the test/ directory: node validate-npc-lines.cjs
// Guards the v1.97.85 lines (owner-approved draft): Rick, Brenda, Tammy and Vern have topics for what was added after v1.97.25
// (vending, fridge, chiller, fire, weapons, getting hurt, animals, the shed cat, ponds, horde, paintball, Player 2), their quick-reply
// buttons all land on a topic, the vehicles are generic, and the new situations (hurt, horde, paintball, a snack in hand, Rick's
// truck, Tammy's car) pick the right lines. Runs the real data, matcher and dialogue engine in a sandbox.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, 'found ' + a); return html.slice(i, j); };
const data = cut('const NPC_DEF = {', 'const NPC_POOL =');
const match = cut('function npcMatch(D, said) {', 'const voiceCan =');
const P3 = { powerOutage: false, nh3: 0, walking: true, npcs: [], walkPos: { x: 0, z: 0 }, dbg: { CREEP: { kills: 0, bites: 0, list: [] }, HP: { hp: 100, max: 100 } },
  hordeOn: false, pbOn: false, holdingSnack: false, driving: false, carName: '', pigeonHits: 3, cooler: null };
let clock = 0;
const c = { P3, Math, console, performance: { now: () => clock }, gameDate: () => ({ getHours: () => 12 }), pick: a => a[0],
  coolerSay: () => 'cooler', propSay: () => 'props', alarmSay: () => 'alarms', wxSay: () => 'weather' };
vm.createContext(c);
vm.runInContext(data + '\n' + match + '\nthis.NPC_DEF = NPC_DEF; this.npcMatch = npcMatch; this.DLG = RICK_DLG; this.S = RICK_STATE; this.upd = rickStateUpdate; this.DATA = NPC_DIALOGUE;', c);
const D = c.NPC_DEF;

// ---- no brand names anywhere a person says something
const said = [];
for (const id in D) { const d = D[id]; for (const k of ['hi', 'fallback', 'start']) said.push(...d[k]); for (const t in d.topics) { const T = d.topics[t]; if (Array.isArray(T.say)) said.push(...T.say); else if (typeof T.say === 'string') said.push(T.say); said.push(...(T.opts || [])); } }
for (const pool in c.DATA) for (const n of c.DATA[pool].nodes) said.push(...(n.lines || []).map(l => l.text || l), ...(n.exhaustedLines || []));
const brands = /\b(jeep|gladiator|renegade|crown vic|silverado|kia|ford|chevy|ranger)\b/i;
for (const l of said) assert.ok(!brands.test(l), 'no vehicle brand in: ' + l);

// ---- each new question reaches its topic
const asks = {
  op: [['what\'s in the vending machine', 'vending'], ['I want some Chippys', 'vending'], ['what about the fridge', 'fridge'], ['what does the chiller do', 'chiller'],
    ['where is a fire extinguisher', 'fire'], ['why is there a machete', 'weapons'], ['who left the golf club', 'weapons'], ['I keep dying', 'hurt'], ['how do I respawn', 'hurt'],
    ['what about the cows', 'animals'], ['the cat scared me', 'cat'], ['are there fish in the pond', 'ponds'], ['tips for the zombie horde', 'horde'],
    ['how do I play paintball', 'paintball'], ['what about the other player', 'partner'], ['tell me about your truck', 'jeep'], ['is the green 4x4 yours', 'jeep'],
    ['where are the keys', 'keys'], ['how do the prop tanks work', 'props']],
  brenda: [['why are the drivers honking', 'drivers'], ['whose golf club is that', 'golf'], ['what about the cows', 'animals'], ['is there a vending machine', 'vending']],
  tammy: [['want a snack from the vending machine', 'vending'], ['the cat scared me', 'cat'], ['who is driving the cars', 'cars'], ['do you like the cows', 'animals'], ['is the white suv yours', 'car']],
  vern: [['is that your sickle', 'blades'], ['whose machete', 'blades'], ['nice cows', 'animals'], ['the cat', 'cat'], ['want a milorade', 'vending'], ['zombies', 'zombies']] };
for (const id in asks) for (const [q, want] of asks[id]) { const T = c.npcMatch(D[id], q); assert.equal(T && T.id, want, id + ': "' + q + '" -> ' + (T && T.id)); }
// the old questions still land where they did
for (const [q, want] of [['how does cook work', 'cook'], ['any alarms', 'alarms'], ['do you drink coffee', 'coffee'], ['where\'s the mower', 'mower'], ['pigeons', 'pigeons']])
  assert.equal(c.npcMatch(D.op, q).id, want, 'Rick still answers "' + q + '"');
// every quick-reply button goes somewhere real
for (const id in D) for (const t in D[id].topics) for (const o of D[id].topics[t].opts || []) {
  if (/^bye\.?$/i.test(o) || /^(okay\.\.\.|never mind\.?)$/i.test(o)) continue;
  assert.ok(c.npcMatch(D[id], o), id + '.' + t + ': the button "' + o + '" reaches a topic');
}
assert.equal(c.npcMatch(D.op, 'What about the chiller?').id, 'chiller'); assert.equal(c.npcMatch(D.op, 'What about the cat?').id, 'cat');
assert.equal(c.npcMatch(D.op, 'What\'s in the vending machine?').id, 'vending'); assert.equal(c.npcMatch(D.op, 'How do I play paintball?').id, 'paintball');
assert.ok(D.op.topics.job.say.toString().includes('Milorade'), 'Rick\'s job list has the new jobs');

// ---- situations
const talk = (pool) => { clock += 60000; c.upd(); const r = c.DLG.talk(pool); return r && r.nodeId; };
const bark = (pool, step = 120000) => { clock += step; c.upd(); const r = c.DLG.bark(pool); return r && r.nodeId; };
assert.equal(talk('rick'), 'baseline', 'a normal day');
P3.dbg.HP.hp = 30; for (const [p, n] of [['rick', 'hurt'], ['brenda', 'hurt'], ['tammy', 'hurt'], ['vern', 'hurt']]) assert.equal(talk(p), n, p + ' sees you are hurt');
P3.dbg.HP.hp = 0; assert.equal(talk('rick'), 'baseline', 'down is not "hurt" (the death scene has its own)'); P3.dbg.HP.hp = 100;
P3.holdingSnack = true; assert.equal(talk('rick'), 'snack', 'walk up holding a snack'); P3.holdingSnack = false;
P3.hordeOn = true;
for (const [p, n] of [['rick', 'horde'], ['brenda', 'horde'], ['tammy', 'horde'], ['vern', 'horde']]) assert.equal(talk(p), n, p + ' during a horde');
assert.equal(bark('rick'), 'bark_horde', 'Rick radios during a horde'); assert.equal(bark('vern'), 'bark_horde');
P3.hordeOn = false;
P3.pbOn = true; assert.equal(bark('rick'), 'bark_paintball', 'Rick radios about the paintball match'); assert.equal(bark('rick', 20000), null, 'once a minute, and never idle chatter on the radio'); P3.pbOn = false;
P3.driving = true; P3.carName = 'green 4x4'; assert.equal(bark('rick'), 'bark_truck', 'Rick sees you in his truck');
P3.carName = 'white compact SUV'; assert.equal(talk('tammy'), 'my_car', 'Tammy sees her car'); assert.equal(bark('tammy'), 'bark_car');
P3.carName = 'black pickup'; assert.notEqual(bark('rick'), 'bark_truck', 'any other car: nothing'); P3.driving = false; P3.carName = '';
// the bark loop treats these as radio-worthy for Rick
assert.ok(/emergency = S\.blackout \|\| S\.hazardZone \|\| S\.horrorStage >= 2 \|\| S\.horde \|\| S\.paintball \|\| S\.rickTruck;/.test(html), 'Rick radios for the horde, paintball and his truck');
assert.ok(/get carName\(\) \{ return CAR_ON \? CAR_ON\.name : ''; \}, get holdingSnack\(\) \{ return !!\(heldDead && heldDead\.vend\); \}/.test(html), 'the game tells the dialogue which car you are in and whether you hold a snack');

console.log('PASS validate-npc-lines: new topics for all four, buttons land, no brand names, hurt / horde / paintball / snack / truck / car situations');
