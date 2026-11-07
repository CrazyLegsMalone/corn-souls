// Run from the test/ directory: node validate-player-health.cjs
// Guards TEST v1.97.35 (owner: "add a basic damage system to start with. including damage between player 1 and 2"):
// 100 HP, hits knock some off and push you back, 0 puts you down with that cause, six quiet seconds then 8 HP a second back;
// the other player's paintballs take a third (three tags, not one), their tool swings take the tool's damage, creature bites a
// third, hard landings below the fatal height hurt; the bar shows only while hurt.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const src = html.slice(html.indexOf('const HP = { max'), html.indexOf('function takeSquish('));
const sent = [], notes = [], bodies = [];
const ctx = { Math, walk: { on: true, dead: null, x: 0, y: 0, z: 0, yaw: 0 }, NET: { conn: { open: true }, rp: null }, TOOLS: { sledge: { L: 0.9 }, knife: { L: 0.32 } },
  held: 'sledge', netSend: m => sent.push(m), gunClick() {}, pushOut() {}, layBody: (...a) => bodies.push(a), passExit() {}, mowExit() {}, utvExit() {},
  DMG_NOTIFY: s => notes.push(s), navigator: {}, document: undefined };
vm.createContext(ctx); vm.runInContext(src + '\nthis.HP = HP; this.TOOL_DMG = TOOL_DMG; this.playerHurt = playerHurt; this.hpUpdate = hpUpdate; this.pvpMelee = pvpMelee;', ctx);
const { HP, walk } = ctx;
// hits, knock-back, message
assert.equal(ctx.playerHurt(34, 'paint', 0.3, 0, '🎯 Tagged by the other player'), false); assert.equal(HP.hp, 66); assert.equal(walk.x, 0.3, 'pushed back');
assert.match(notes.at(-1), /Tagged by the other player · 66 HP/);
ctx.playerHurt(34, 'paint'); assert.equal(walk.dead, null, 'two tags: still up');
assert.equal(ctx.playerHurt(34, 'paint'), true, 'the third tag puts you down'); assert.equal(walk.dead, 'paint'); assert.equal(bodies.length, 1, 'with the ragdoll');
assert.equal(ctx.playerHurt(50, 'melee'), false, 'nothing more while down');
// healing: nothing for six quiet seconds, then 8 a second
walk.dead = null; HP.hp = 40; HP.calmT = 0; ctx.hpUpdate(5); assert.equal(HP.hp, 40, 'no healing straight after a hit');
ctx.hpUpdate(0.9); assert.equal(HP.hp, 40, 'still nothing at 5.9 s'); ctx.hpUpdate(1.1); assert.ok(Math.abs(HP.hp - 48.8) < 1e-9, 'then 8 HP a second: ' + HP.hp);
for (let i = 0; i < 20; i++) ctx.hpUpdate(1); assert.equal(HP.hp, 100, 'up to full, no further');
// PvP melee: in front and in reach, the tool's damage goes to the other player
walk.x = 0; walk.z = 0; const dir = { x: 0, y: 0, z: -1 };
ctx.NET.rp = { walk: true, drive: false, x: 0, y: 0, z: -1.6 };
assert.equal(ctx.pvpMelee(dir), true); assert.deepEqual([sent.at(-1).t, sent.at(-1).n, sent.at(-1).k], ['mh', 40, 'sledge'], 'a sledgehammer hit: 40');
ctx.NET.rp.z = 1.6; assert.equal(ctx.pvpMelee(dir), false, 'behind you: no hit');
ctx.NET.rp.z = -4; assert.equal(ctx.pvpMelee(dir), false, 'out of reach: no hit');
ctx.held = 'knife'; ctx.NET.rp.z = -1.3; assert.equal(ctx.pvpMelee(dir), true); assert.equal(sent.at(-1).n, 15, 'a knife: 15');
ctx.NET.rp.drive = true; assert.equal(ctx.pvpMelee(dir), false, 'not through a vehicle');
ctx.NET.rp.drive = false; ctx.NET.conn = null; assert.equal(ctx.pvpMelee(dir), false, 'and not alone');
for (const k in ctx.TOOL_DMG) assert.ok(ctx.TOOL_DMG[k] > 0 && ctx.TOOL_DMG[k] <= 40, k);
// the wiring in the game
assert.ok(html.includes("} else if (m.t === 'mh') {") && html.includes("playerHurt(n, 'melee',"), 'a swing from the other player hurts');
assert.ok(html.includes("playerHurt(34, 'paint',") && !html.includes("walk.dead = 'paint';"), 'their paintball takes a third, no longer an instant kill');
assert.ok(html.includes('if (pvpMelee(dir)) return;'), 'my swings check for the other player first');
assert.ok(html.includes("playerHurt(Math.round(dmg * 34),"), 'creature bites are damage');
assert.ok(html.includes("if (drop > fatal * 0.62 && drop <= fatal && !walk.dead) playerHurt("), 'hard landings hurt');
assert.ok(html.includes("stepSafe('hp', () => hpUpdate(dt));") && html.includes("function takeSquish() { const k = walk.dead; if (k) { HP.hp = HP.max;"), 'heals each frame, full again after a death');
assert.ok(html.includes("hit === 'melee' ? 'Squeeg got beaten down by the other player!'"), 'its own death message');
// v1.97.37 (owner: "jumping shouldnt cause fall damage"): a jump on flat ground went 1.8 m up and landed as a 1.8 m "fall" (hurt from 1.49 m)
assert.ok(html.includes("walk.vy = POWER.kind === 'frog' ? 8.4 : 5.94; walk.jumpFrom = walk.y;"), 'a jump remembers the floor it left');
assert.ok(html.includes('const drop = walk.jumpFrom != null ? Math.max(0, walk.jumpFrom - f) : walk.peakY - f;'), 'and only the height below that floor counts');
assert.ok(!html.includes('walk.peakY = null;') && html.split('walk.peakY = walk.jumpFrom = null').length > 10, 'cleared wherever the fall is reset (ladders, climbs, chutes)');
{ const drop = (jumpFrom, f) => Math.max(0, jumpFrom - f), hurtAt = 2.4 * 0.62;
  assert.ok(drop(0, 0) < hurtAt && drop(0, 1.2) === 0, 'a jump on flat ground, or up onto a ledge: nothing');
  assert.ok(drop(2, 0) > hurtAt, 'jumping off a 2 m ledge still hurts'); }
console.log('PASS: player health (jumps never count as falls, 100 HP, knock-back, three paint tags, tool damage between players in front and in reach, 6 s then 8 HP/s healing, bites and hard landings, full after a death)');
