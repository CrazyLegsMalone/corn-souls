// Run from repository root: node test/validate-rail-phone.cjs
// Exercises the Road P dispatcher phone: call-and-hold, send-on, call-through,
// the five-minute auto-release, and the guest -> host request path.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const html = fs.readFileSync('test/game.html', 'utf8');

function slice(from, to) {
  const a = html.indexOf(from), b = html.indexOf(to, a);
  assert.ok(a > 0 && b > a, `could not slice ${from}`);
  return html.slice(a, b);
}
const phoneSrc = slice('function railPhoneNear()', 'function crossingBell(');
const railSrc = slice('function updateRail(dt) {', 'function loopAt(s) {');

function makeCtx() {
  const train = dir => ({ dir, off: dir > 0 ? 1 : -1, u: -1, wait: 1e9, horn: false, state: 'wait', speed: 22, target: null, heldT: 0, warned: false,
    cars: [{ off: 0, g: { visible: false, position: { set() {} }, rotation: {} } },
           { off: 18, g: { visible: false, position: { set() {} }, rotation: {} } }] });
  const sent = [];
  const ctx = {
    console, Math, Date,
    RAIL_PHONE: { x: 250, z: -40, r: 2.3, notice: '' },
    RXING: { x: 300, z: 0, active: false, gates: [], flash: [[], []], tip: [], blink: 0, bellT: 0, warn: 0 },
    THRUS: [train(1), train(-1)],
    MAIN_DIR: { x: 1, z: 0 },
    mainTrack: () => [[0, 0], [1000, 0]],
    walk: { on: true, dead: false, x: 250, z: -40 },
    NET: { conn: null, host: true },
    sent, netSend: m => { sent.push(m); },
    camera: { position: { distanceTo: () => 999 } },
    tsnd: { ctx: null },
    trainHorn() {}, crossingBell() {}, panOf: () => 0,
    V3: () => ({})
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(phoneSrc + '\n' + railSrc, ctx);
  return ctx;
}
const step = (ctx, seconds) => { const n = Math.round(seconds / 0.1); for (let i = 0; i < n; i++) ctx.updateRail(0.1); };

// ---------------------------------------------------------------- proximity
{
  const c = makeCtx();
  assert.equal(c.railPhoneNear(), true, 'phone reachable at its cabinet');
  c.walk.x += 8;
  assert.equal(c.railPhoneNear(), false, 'phone out of reach 8 m away');
  c.walk.on = false; c.walk.x -= 8;
  assert.equal(c.railPhoneNear(), false, 'phone only usable on foot');
}

// ------------------------------------------------------------ call and hold
{
  const c = makeCtx();
  assert.match(c.railPhoneApply('hold'), /holding the Road P crossing in about \d+ s/);
  const R = c.THRUS[0];
  const target = R.target;
  assert.equal(R.state, 'run');
  assert.equal(target, 314, 'stop target = crossing distance + half the consist');
  assert.equal(R.cars[0].g.visible, true, 'consist becomes visible');
  assert.equal(c.railPhoneState().running, 1, 'one consist on the line');
  assert.equal(c.railPhoneState().held, false, 'nothing holding yet');
  assert.equal(c.railPhoneState().moving, false, 'and it is not at the crossing yet');

  step(c, 40);
  assert.equal(R.state, 'hold', 'train parks and holds');
  assert.ok(Math.abs(R.u - target) < 0.01, 'stops exactly on the target');
  assert.equal(R.speed, 0, 'stopped');
  assert.equal(c.RXING.active, true, 'crossing stays active while held: gates down, bell ringing');
  assert.equal(c.railPhoneState().held, true);
  assert.match(c.railPhoneApply('hold'), /already holding/, 'cannot hold twice');

  // ------------------------------------------------------------- send it on
  assert.match(c.railPhoneApply('send'), /rolling again/);
  assert.equal(R.state, 'leave');
  assert.equal(R.target, null);
  step(c, 3);
  assert.ok(R.u > target, 'train accelerates away from the crossing');
  step(c, 70);
  assert.equal(R.u, -1, 'clears the block and resets to waiting');
  assert.equal(R.state, 'wait');
  assert.equal(c.RXING.active, false, 'crossing releases once the train is gone');
}

// -------------------------------------------------------------- call through
{
  const c = makeCtx();
  assert.match(c.railPhoneApply('through'), /called through Road P/);
  const R = c.THRUS[0];
  assert.equal(R.target, null, 'a through call never sets a stop target');
  let sawActive = false;
  for (let i = 0; i < 700 && R.u >= 0; i++) { c.updateRail(0.1); if (c.RXING.active) sawActive = true; }
  assert.ok(sawActive, 'crossing activates as the train passes');
  assert.equal(R.state, 'wait', 'and then resets');
}

// ------------------------------------------------- five-minute auto-release
{
  const c = makeCtx();
  c.railPhoneApply('hold');
  const R = c.THRUS[0];
  step(c, 40);
  assert.equal(R.state, 'hold');

  R.heldT = 284; step(c, 0.2);                  // still inside the window
  assert.equal(c.RAIL_PHONE.notice, '');
  R.heldT = 286; step(c, 0.2);                  // warning
  assert.match(c.RAIL_PHONE.notice, /expires in 15 seconds/);
  assert.match(c.railPhoneNotice(), /expires/, 'notice is handed to the UI once');
  assert.equal(c.RAIL_PHONE.notice, '', 'and cleared');

  R.heldT = 301; step(c, 0.2);                  // expires
  assert.equal(R.state, 'leave', 'hold releases itself after five minutes');
  assert.equal(c.RXING.active, true, 'still on the crossing as it starts moving');
}

// ------------------------------------------------------- guest -> host radio
{
  const c = makeCtx();
  c.NET = { conn: {}, host: false };
  assert.match(c.railPhoneAction('hold'), /sent to the host/);
  assert.equal(c.sent.length, 1);
  assert.equal(c.sent[0].t, 'rp', 'request packet type');
  assert.equal(c.sent[0].a, 'hold', 'request packet action');
  assert.equal(c.THRUS[0].u, -1, 'the guest does not move trains locally');

  const h = makeCtx();
  h.NET = { conn: {}, host: true };
  assert.match(h.railPhoneAction('hold'), /holding the Road P crossing/);
  assert.equal(h.THRUS[0].u, 0, 'the host applies it');
}

// -------------------------------------- a train elsewhere must not block the call
{
  const c = makeCtx();
  c.THRUS[1].u = 100; c.THRUS[1].state = 'run';   // westbound, mid-line, 600 m from the crossing
  assert.match(c.railPhoneApply('hold'), /holding the Road P crossing/, 'an unrelated running train does not block the call');
  assert.equal(c.THRUS[0].state, 'run', 'the nearer (waiting) consist is the one called');
  assert.equal(c.THRUS[1].target, null, 'the far train is left alone');
}

// ------------------------------------- a train actually on the crossing does block
{
  const c = makeCtx();
  c.THRUS[0].u = 300; c.THRUS[0].state = 'run';   // sitting right on the crossing
  assert.match(c.railPhoneApply('hold'), /on the crossing right now/);
}

// ------------------------------------------- an inbound train can be halted on it
{
  const c = makeCtx();
  c.THRUS[0].u = 60; c.THRUS[0].state = 'run'; c.THRUS[0].cars.forEach(x => { x.g.visible = true; });
  assert.match(c.railPhoneApply('hold'), /holding the Road P crossing/, 'an inbound freight is halted at the crossing');
  assert.equal(c.THRUS[0].u, 60, 'its progress is kept, not reset');
  assert.equal(c.THRUS[0].target, 314, 'and it is given the same stop point');
  step(c, 40);
  assert.equal(c.THRUS[0].state, 'hold');
}

console.log('PASS: dispatcher phone proximity, hold/stop, send-on, call-through, 5-minute release and guest relay');
