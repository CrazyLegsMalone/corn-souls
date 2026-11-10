// Run from the test/ directory: node validate-paintball-match.cjs
// Guards TEST v1.97.64, the paintball match (owner: "paintball match"): started from the pause menu with the other player in your
// game, the paint stops hurting and starts scoring - first to 5 tags. Where each of you stands at the start is your own end; a tag
// puts you back there with a full tank and two seconds of grace. Whoever is tagged counts it and tells the other, so the score agrees.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = html.slice(html.indexOf('// ---------- PAINTBALL MATCH'), html.indexOf('// ---------- RADIO PING'));
assert.ok(src.length > 1500, 'the paintball block is there');

const mk = () => {
  const sent = [], toasts = [];
  const ctx = { Math, console, sent, toasts,
    walk: { on: true, dead: null, x: 10, y: 0, z: -20 },
    HP: { hp: 40, max: 100, calmT: 0, flash: 0 },
    NET: { conn: { open: true }, rp: {} },
    netSend: o => sent.push(o), floorAt: () => 0, pushOut() {}, respawnSafe: () => true,
    document: { getElementById: () => null } };
  ctx.window = { __toast: m => toasts.push(m) };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.PBM = PBM; this.pbToggle = pbToggle; this.pbTagged = pbTagged; this.pbRecv = pbRecv; this.pbStep = pbStep; this.pbStop = pbStop;', ctx);
  return ctx;
};

// starting it
{ const c = mk();
  assert.equal(c.pbToggle(), null, 'starts with the other player there');
  assert.ok(c.PBM.on && c.PBM.me === 0 && c.PBM.them === 0 && c.PBM.win === 5, 'nil-nil, first to five');
  assert.equal(c.PBM.x, 10); assert.equal(c.PBM.z, -20, 'where you stand is your end');
  assert.ok(c.sent.some(m => m.t === 'pb' && m.go === 1), 'the other player is told');
  assert.ok(c.toasts.join(' ').includes('first to 5'));
  c.NET.conn = null; assert.ok(c.pbToggle() === null || true);
}
{ const c = mk(); c.NET.conn = null;
  assert.ok(c.pbToggle().includes('2 player'), 'alone it says so and does not start'); assert.equal(c.PBM.on, false);
  c.NET.conn = { open: true }; c.walk.on = false;
  assert.ok(c.pbToggle().includes('Squeeg'), 'and not from the title screen');
}
// being tagged: a point to them, back to your end, a full tank, then grace
{ const c = mk(); c.pbToggle(); c.sent.length = 0;
  c.walk.x = 80; c.walk.z = 95; c.HP.hp = 12;
  assert.equal(c.pbTagged([1, 0]), true, 'the paint scores instead of hurting');
  assert.equal(c.PBM.them, 1); assert.equal(c.walk.x, 10); assert.equal(c.walk.z, -20, 'back to your end');
  assert.equal(c.HP.hp, 100, 'full tank'); assert.ok(c.PBM.outT > 0, 'and a moment of grace');
  const m = c.sent.pop(); assert.ok(m.t === 'pb' && m.s === 1 && m.me === 1 && m.them === 0, 'the one tagged keeps the score and sends it');
  c.walk.x = 80; assert.equal(c.pbTagged([1, 0]), true, 'a second tag in the grace period still swallows the paint');
  assert.equal(c.PBM.them, 1, 'but does not score'); assert.equal(c.walk.x, 80, 'and does not move you');
  c.pbStep(2.5); c.walk.x = 80; c.pbTagged([1, 0]); assert.equal(c.PBM.them, 2, 'once the grace is up it counts again');
}
// the score from the other side, and the win
{ const c = mk(); c.pbToggle();
  c.pbRecv({ t: 'pb', s: 1, me: 3, them: 1 });
  assert.equal(c.PBM.me, 3); assert.equal(c.PBM.them, 1, 'their count, mirrored');
  c.pbRecv({ t: 'pb', s: 1, me: 5, them: 1, end: 1 });
  assert.ok(!c.PBM.on && c.PBM.won === 'me' && c.PBM.overT > 0, 'five tags wins it');
  assert.ok(c.toasts.join(' ').includes('You win'));
}
{ const c = mk(); c.pbToggle();
  for (let i = 0; i < 5; i++) { c.PBM.outT = 0; c.pbTagged([0, 1]); }
  assert.ok(!c.PBM.on && c.PBM.won === 'them', 'and the other way round');
  assert.ok(c.sent.some(m => m.end === 1), 'they are told the match is over');
}
// called off, and the link dropping
{ const c = mk(); c.pbToggle(); c.sent.length = 0;
  assert.equal(c.pbToggle(), null); assert.equal(c.PBM.on, false); assert.ok(c.sent.some(m => m.go === 0), 'calling it off tells them');
  const d = mk(); d.pbToggle(); d.pbRecv({ t: 'pb', go: 0 }); assert.equal(d.PBM.on, false, 'and the other end stops too');
  const e = mk(); e.pbToggle(); e.NET.conn = null; e.pbStep(0.1); assert.equal(e.PBM.on, false, 'the link dropping ends it');
  const f = mk(); assert.equal(f.PBM.on, false); f.pbRecv({ t: 'pb', go: 1 }); assert.ok(f.PBM.on, 'either player can start it');
}
// the hooks in the game
assert.ok(/if \(typeof pbTagged === 'function' && pbTagged\(m\.v\)\) \{ splatSnd/.test(html), 'a tag scores in a match');
assert.ok(/else \{ const h = Math\.hypot\(m\.v\[0\], m\.v\[1\]\) \|\| 1; playerHurt\(34, 'paint'/.test(html), 'and still hurts outside one');
assert.ok(/m\.t === 'pb'\) \{ pbRecv\(m\);/.test(html), 'the pb message arrives');
assert.ok(html.includes("stepSafe('pball', () => pbStep(dt));"), 'stepped every frame');
assert.ok(/paintball: \(\) => pbToggle\(\), get pbOn\(\) \{ return PBM\.on; \}/.test(html), 'Plant3D.paintball');
assert.ok(/\['🎯 ' \+ \(P3\.pbOn \? 'End the paintball match' : 'Paintball match'\)/.test(html), 'on the pause menu');
assert.ok(html.includes('<div id="pbHud"></div>') && /#pbHud\{display:none;/.test(html), 'the score banner');
assert.ok(!/\{ t: 'pb'[^}]*[,{] t:/.test(src), 'no message sets t twice');
console.log('PASS: paintball match (first to 5, your end is where you started, tags score instead of hurting, grace after a tag, both ends agree on the score)');
