// Run from the test/ directory: node validate-gun-magazine.cjs
// The side magazine's witness slit shows the rounds: slot 0 sits against the receiver and slot 5 out at the closed end.
// The rounds have to leave from the GUN end - the owner's report, and the reason is that nothing in the model shows a
// spring or a follower, so a stack that emptied at the far end read as the magazine eating from the wrong end. This
// suite lifts the real setRounds() out of buildShotgun and runs it against stubs.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');

// ---------------------------------------------------------------- the slot layout the feed rule depends on
assert.ok(html.includes('for (let i = 0; i < MAG; i++) balls.push(add(new T.SphereGeometry(0.0057, 10, 8), M.paint[i % PAINT.length], 0.03 + i * 0.022, 0, 0.0118, mag));'),
  'six rounds sit in the magazine at 0.03 + i * 0.022, so index 0 is the one nearest the receiver');
assert.ok(html.includes('const mag = new T.Group(); mag.position.set(0.036, -0.006, 0.0);'), 'the magazine is mounted on the right and runs outward (+x)');
assert.ok(html.includes('const MAG = 6;'), 'a six round magazine');

// ---------------------------------------------------------------- the rule itself, out of the game
const open = 'setRounds(kind, n) {';
const start = html.indexOf(open);
assert.ok(start > 0, 'buildShotgun defines the feed rule');
const tail = 'wcol.position.x = 0.019 + (MAG - n) * 0.022 + wcol.scale.x / 2; }';
const end = html.indexOf(tail, start);
assert.ok(end > start, 'and the water level recedes from the same end (it carries the same (MAG - n) offset)');
const src = html.slice(start, end + tail.length);

const ctx = { MAG: 6, balls: Array.from({ length: 6 }, () => ({ visible: false })), wcol: { visible: false, scale: { x: 0 }, position: { x: 0 } }, console };
vm.createContext(ctx);
vm.runInContext('this.api = { kind: null, n: -1, ' + src + ' };', ctx);
const api = ctx.api;
const shown = () => ctx.balls.map(b => (b.visible ? '1' : '0')).join('');

api.setRounds('paint', 6);
assert.equal(shown(), '111111', 'a full magazine shows all six rounds');
api.setRounds('paint', 5);
assert.equal(shown(), '011111', 'firing takes the round NEAREST THE GUN (slot 0), not the far one');
api.setRounds('paint', 3);
assert.equal(shown(), '000111', 'and keeps taking them from that end');
api.setRounds('paint', 1);
assert.equal(shown(), '000001', 'the last round left is the one out at the closed end of the magazine');

// ---------------------------------------------------------------- the water window keeps up
api.setRounds('water', 6);
assert.equal(shown(), '000000', 'water hides the paintballs');
assert.equal(ctx.wcol.visible, true, 'and shows the column');
assert.equal(ctx.wcol.scale.x.toFixed(3), '0.130', 'six rounds of water fill the slit');
assert.equal(ctx.wcol.position.x.toFixed(3), '0.084', 'starting right at the gun end, 0.019');
api.setRounds('water', 1);
assert.equal(ctx.wcol.scale.x.toFixed(3), '0.020', 'one round of water is a stub in the slit');
assert.equal(ctx.wcol.position.x.toFixed(3), '0.139', 'sitting out under slot 5 (0.129..0.149), the same end the paintballs empty from');
api.setRounds('water', 0);
assert.equal(ctx.wcol.visible, false, 'an empty magazine shows nothing');

// ---------------------------------------------------------------- the repeat guard still short-circuits
ctx.balls.forEach(b => { b.visible = true; });
api.setRounds('water', 0);
assert.equal(shown(), '111111', 'repeating the same call returns immediately instead of repainting the slit');

// ---------------------------------------------------------------- v1.97.118: the colour you see is the colour that flies
assert.ok(html.includes('const PAINT = [0x2389bc, 0xa6d227, 0xf57c1a, 0xe54189];'), "the owner's decal colours: blue, lime, orange, pink");
assert.ok(html.includes('const slot = MAG - mags[ammo];   // the round leaving') && html.includes('const c = PAINT[slot % PAINT.length], m = new T.Mesh(ballGeo, ballMat(c));'), 'a shot takes the colour of the round leaving the magazine');
{ const PAINT = [1, 2, 3, 4], MAG = 6, slotCol = i => PAINT[i % PAINT.length];   // the magazine paints slot i with M.paint[i % PAINT.length]
  const fired = []; let n = MAG; while (n > 0) { const slot = MAG - n; fired.push(PAINT[slot % PAINT.length]); n--;
    api.setRounds('paint', n); const nearest = ctx.balls.findIndex(b => b.visible); if (n) assert.equal(slotCol(nearest), PAINT[(MAG - n) % 4], 'the next round showing nearest the gun is the next colour to fly'); }
  assert.deepEqual(fired, [1, 2, 3, 4, 1, 2], 'a full magazine fires its six rounds in the order they sit, gun end first'); }
assert.ok(html.includes("const t = new T.TextureLoader().load('/corn-souls/assets/textures/paintball/' + key + '.png'); t.magFilter = T.NearestFilter;"), "splats use the owner's PSX decals, crisp pixels");
assert.ok(html.includes('const dm = decalMat(c), s = dm ? new T.Mesh(decalGeo(), dm) : new T.Mesh(splatGeos[Math.random() * 3 | 0], paintMat(c));'), 'one decal per hit in the ball colour (any other colour still gets a cut-out splat)');
{ const fs2 = require('fs'), path = require('path'); for (const c of ['blue', 'lime', 'orange', 'pink']) for (let k = 1; k <= 5; k++) assert.ok(fs2.existsSync(path.join(__dirname, '..', 'assets', 'textures', 'paintball', c + '-impact-0' + k + '.png')), 'decal file ' + c + ' ' + k); }
console.log("PASS: the magazine feeds from the gun end - slot 0 (nearest the receiver) leaves first, the water level recedes from the same end, and the repeat guard still holds; shots fly in the colour of the round leaving; the owner's decals for splats");
