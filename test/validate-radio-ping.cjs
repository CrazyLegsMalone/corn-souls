// Run from the test/ directory: node validate-radio-ping.cjs
// Guards TEST v1.97.62: the radio ping (owner: "I like the ping idea"). G / D-pad left / the 📍 button marks where you are looking,
// up to 220 m away; both players get a marker that shows through the plant, a diamond on the minimap pinned to the rim when it is
// off the edge, a walkie-talkie chirp and a toast with the bearing and distance. One marker each, fading after half a minute.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const block = html.slice(html.indexOf('// ---------- RADIO PING'), html.indexOf('// ---------- FISH ('));
assert.ok(block.length > 2000, 'the ping block is there');
assert.ok(/const PING = \{ mine: null, theirs: null, far: 220, life: 30 \};/.test(block), 'one marker each, 220 m, half a minute');
for (const f of ['pingAim', 'pingMarker', 'pingChirp', 'pingWhere', 'pingSet', 'pingDrop', 'pingStep', 'pingMap']) assert.ok(block.includes('function ' + f + '('), f);
assert.ok(/depthTest: false/.test(block) && /renderOrder = 999/.test(block), 'the marker is drawn through the plant');
assert.ok(/o\.userData\.noHit = true/.test(block), 'you cannot shoot or pick the marker');
assert.ok(/Math\.max\(1, Math\.min\(7,/.test(block), 'the marker grows with distance so it stays readable');
// controls: keyboard, controller, touch
assert.ok(/k === 'g'\) \{ e\.preventDefault\(\); if \(!e\.repeat\) P3\.ping\(\); return; \}/.test(html), 'G drops a ping');
assert.ok(/if \(n === 'LEFT' && !cur\) \{ P3\.ping\(\); return; \}/.test(html), 'D-pad left drops a ping');
assert.ok(html.includes('<button id="pingBtn" aria-label="Radio ping">📍</button>'), 'the touch button is in the HUD');
assert.ok(/body\.walking:not\(\.pc\):not\(\.driving\) #pingBtn\{display:block\}/.test(html), 'it shows on foot on a phone');
assert.ok(/body\.padmode #pingBtn,/.test(html), 'and hides with the rest in controller mode');
assert.ok(html.includes("$('pingBtn').addEventListener('pointerdown'"), 'the touch button is wired up');
assert.ok(/root\.Plant3D = \{ powerSet: on => powerSet\(on\), ping: \(\) => pingDrop\(\),/.test(html), 'Plant3D.ping');
assert.ok(/\['Radio ping[^\]]*'G', 'D-pad left', '📍'\]/.test(html), 'listed in the controls help');
// the wire, the per-frame step and the minimap
assert.ok(/netSend\(\{ t: 'pg', x: \+x\.toFixed\(2\), y: \+y\.toFixed\(2\), z: \+z\.toFixed\(2\) \}\)/.test(html), 'sent to the other player');
assert.ok(/m\.t === 'pg'\) \{ pingSet\('theirs', m\.x, m\.y, m\.z\); \}/.test(html.replace(/\s+\/\/[^\n]*/g, '')) || /m\.t === 'pg'\) \{ pingSet\('theirs', m\.x, m\.y, m\.z\);/.test(html), 'and shown on arrival');
assert.ok(html.includes("stepSafe('thrown', () => updateThrown(dt));") && /stepSafe\('ping', \(\) => pingStep\(dt\)\);/.test(html), 'stepped every frame, after the steps the power-outage test pins');
assert.ok(/if \(typeof pingMap === 'function'\) pingMap\(g, pos, yaw, k, r, dpr\);/.test(html), 'drawn on the minimap (guarded: the perf sandbox runs that function on its own)');
assert.ok(html.includes('window.__toast = toast;'), 'the game script can reach the toast');
// the bearing, and the minimap clamp, run for real
const src = block.slice(block.indexOf('const PING_DIR'), block.indexOf('function pingSet('));
const walk = { x: 100, z: 100 }, { pingWhere } = new Function('walk', src + '; return { pingWhere };')(walk);
for (const [dx, dz, want] of [[0, -50, 'N'], [50, -50, 'NE'], [50, 0, 'E'], [50, 50, 'SE'], [0, 50, 'S'], [-50, 50, 'SW'], [-50, 0, 'W'], [-50, -50, 'NW'], [0, -10, 'N']])
  assert.equal(pingWhere(100 + dx, 100 + dz).split(' ').pop(), want, 'bearing ' + want);
assert.equal(pingWhere(100, 40), '60 m N', 'distance in whole metres');
{ const r = 60, dpr = 1, k = 0.3, drawn = [];
  const g = { save() {}, restore() {}, rotate() {}, fillRect() {}, strokeRect() {}, translate(x, y) { drawn.push([x, y]); }, set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {} };
  const mapSrc = block.slice(block.indexOf('function pingMap('));
  const PING = { mine: { g: { visible: true, position: { x: 1000, z: 0 } } }, theirs: { g: { visible: true, position: { x: 2, z: 0 } } } };
  new Function('PING', 'g', 'pos', 'yaw', 'k', 'r', 'dpr', mapSrc + '; pingMap(g, pos, yaw, k, r, dpr);')(PING, g, { x: 0, z: 0 }, 0, k, r, dpr);
  assert.equal(drawn.length, 2, 'both markers drawn');
  assert.ok(Math.hypot(drawn[0][0] - r, drawn[0][1] - r) <= r - 11 * dpr + 0.01, 'a far ping is pinned to the rim');
  assert.ok(Math.abs(drawn[1][0] - (r + 2 * k)) < 0.01 && Math.abs(drawn[1][1] - r) < 0.01, 'a near one sits where it is');
}
console.log('PASS: radio ping (G / D-pad left / 📍, marker through the plant, minimap diamond with rim clamp, chirp, bearing toast, synced)');
