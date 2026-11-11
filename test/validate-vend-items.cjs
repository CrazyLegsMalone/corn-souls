// Run from the test/ directory: node validate-vend-items.cjs
// Guards TEST v1.97.78: the owner sent product art for Milorade, WET water and Chippys corn chips as GLBs that were only a box with
// the picture card wrapped round it; scripts/make_vend_items.py builds real items from the pictures. Owner: "Replace the shifty corn
// chips". Milorade replaces the Milo-Rade can, WET the water can. Runs the game's own GLB reader on the real files.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T0 = lib.window.THREE, T = Object.create(T0, { TextureLoader: { value: class { load() { return new T0.Texture(); } } } });
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i); return html.slice(i, j); };
const ctx = { T, console, TextDecoder, Blob: class {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} } };
vm.createContext(ctx); vm.runInContext(cut('const GLB_CT = {', 'function loadGlbModel(') + '\nthis.glbBuild = glbBuild;', ctx);
const root = path.join(__dirname, '..');
const SIZE = { milorade_bottle: [0.2, 0.06, 0.11], wet_water_bottle: [0.22, 0.06, 0.11], chippys_bag: [0.21, 0.15, 0.19] };   // height, min / max width
for (const [f, [h, w0, w1]] of Object.entries(SIZE)) {
  const b = fs.readFileSync(path.join(root, 'assets/models', f + '.glb')), d = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.equal(b.readUInt32LE(8), b.length, f + ': whole GLB');
  const pr = d.meshes[0].primitives[0];
  assert.ok(pr.attributes.NORMAL !== undefined && pr.attributes.TEXCOORD_0 !== undefined && d.images.length === 1, f + ': normals (so it is not drawn black), UVs and its picture');
  assert.match(d.asset.extras.made_by, /make_vend_items\.py/);
  const r = ctx.glbBuild(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); r.root.updateMatrixWorld(true);
  const bb = new T.Box3().setFromObject(r.root), s = bb.getSize(new T.Vector3());
  assert.ok(Math.abs(s.y - h) < 0.005, f + ' ' + s.y.toFixed(3) + ' m tall');
  assert.ok(s.x > w0 && s.x < w1, f + ' ' + s.x.toFixed(3) + ' m wide');
  assert.ok(Math.abs(bb.min.y) < 1e-4, f + ': stands on its base');
  assert.ok(Math.abs(bb.min.x + bb.max.x) < 0.01 && Math.abs(bb.min.z + bb.max.z) < 0.01, f + ': centred');
  const n = r.root.children[0].children.find(o => o.isMesh) || (() => { let m; r.root.traverse(o => { if (o.isMesh) m = o; }); return m; })();
  const N = n.geometry.attributes.normal; let bad = 0; for (let i = 0; i < N.count; i++) if (Math.abs(Math.hypot(N.getX(i), N.getY(i), N.getZ(i)) - 1) > 0.01) bad++;
  assert.equal(bad, 0, f + ': unit normals');
  assert.ok(fs.existsSync(path.join(root, 'assets/models/source/vend_cards', f.replace(/_(bottle|bag)$/, '') + '_card.png')), f + ': source picture kept');
}
assert.ok(fs.existsSync(path.join(root, 'scripts/make_vend_items.py')), 'the build script is kept');
// the game uses them
assert.ok(html.includes("{ key: 'CORN_CHIPS', file: 'chippys_bag.glb', name: 'Chippys: Extra Corn!' },"), 'Chippys replaces the Shifty corn chips');
assert.ok(!/file: 'shifty_corn_chips\.glb'|'milo_rade_can\.glb'|'water_can\.glb'/.test(html), 'the old chips, can and water can are not dispensed any more');
assert.equal((html.match(/file: 'milorade_bottle\.glb', name: 'Milorade'/g) || []).length, 2, 'both Milo-Rade buttons (one line per machine path)');
assert.equal((html.match(/file: 'wet_water_bottle\.glb', name: 'WET Water', water: true/g) || []).length, 2, 'v1.97.79: WATER gives a WET bottle, in both machine paths');
// v1.97.79, owner: "Drinks should be grabbed from the dispensor door. There shouldn't be any bottles on floor at all"
assert.ok(!/vendSpawn\(/.test(html), 'nothing vended is placed on the floor');
assert.ok(html.includes("setTimeout(() => { VEND.busy = false; vendSpawnIn(M, file, name, null, water); }, 500);"), 'a dispensed item lands in its machine (the WATER flag goes with it)');
assert.ok(html.includes("M.flap = null; M.drop = c || null;") && html.includes("M.drop = c || null;   // v1.97.79: drinks come out behind the dispenser door"), 'drinks: behind the Milo-Rade dispenser door, in both machine paths');
assert.ok(html.includes("M.drop = byName['DISPENSED_CORN_CHIPS'] || byName['DISPENSED_POPCORN'] || byName['DISPENSED_ROASTED_CORN'] || null;"), 'snacks: in the bin behind the flap');
assert.ok(html.includes("if (p.M && p.M.item === p) p.M.item = null;"), 'taking it empties the dispenser');
// v1.97.80, owner: "What happens after you pick up the snacks" - "Both" (carry it, and eat / drink it from your hands)
{ const blk = cut('const VEND_GOOD = {', 'function vendPress()');
  const c2 = { heldDead: null, HP: { hp: 40, max: 100 }, walk: { on: true, toxic: 12, yaw: 0 }, NH3: { exp: 0.8 }, DMG_NOTIFY: null, VEND: { loose: [], picks: [], eaten: 0 },
    camera: { attach(g) { g.parent = this; } }, deadDrop() { c2.dropped = true; }, corpseRest() {} };
  vm.createContext(c2); vm.runInContext(blk + '\nthis.vendTake = vendTake; this.vendGood = vendGood; this.vendLoose = vendLoose;', c2);
  const g = { position: { set() {} }, rotation: { set() {} }, parent: null }, M = { item: null };
  const pick = { g, name: 'Chippys: Extra Corn!', file: 'chippys_bag.glb', M }; M.item = pick; c2.VEND.picks.push(pick);
  assert.match(c2.vendTake(pick), /^Took the Chippys - B to eat it, X to put it down, fire to throw it\.$/);
  assert.ok(c2.heldDead && c2.heldDead.vend && c2.heldDead.o.held && g.parent === c2.camera && !c2.VEND.picks.length && M.item === null, 'in your hands, out of the machine');
  assert.match(c2.vendGood(c2.heldDead.o), /You ate the Chippys/); assert.equal(c2.HP.hp, 60, 'chips: +20 HP');
  const w = c2.vendLoose({}, 'WET Water', 'wet_water_bottle.glb', true); assert.ok(w.drink && w.water);
  assert.match(c2.vendGood(w), /You drank the WET Water/); assert.ok(c2.walk.toxic === 0 && c2.NH3.exp < 0.3, 'WET washes out the pond and the ammonia');
  c2.vendGood(c2.vendLoose({}, 'Milorade', 'milorade_bottle.glb')); assert.equal(c2.HP.hp, 100, 'Milorade +30, capped at full');
  assert.equal(c2.VEND.eaten, 3); }
assert.ok(html.includes("if (o.vend) return vendHold(o);") && html.includes("for (const v of VEND.loose) if (!v.held && !v.thrown) cand.push(v);"), 'one put down or thrown can be picked up again with X');
assert.ok(html.includes("if (o.vend) { vendRest(g, o, false); return nm; }") && html.includes("if (b.o.vend) vendRest(g, b.o, true);"), 'put down it stands / lies flat; thrown it lands on its side');
assert.ok(html.includes("if (h.vend) { vendGone(h.o); if (heldDead === h) heldDead = null; vendGood(h.o); return; }"), 'finishing it: gone, and it does you good');
assert.ok(html.includes("if (P3.carrying) return false;   // hands full: X puts it down instead of buying another"), 'X with your hands full puts it down, not another purchase');
// credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets;
for (const f of Object.keys(SIZE)) assert.ok(reg.some(a => a.status === 'in-use' && a.files.includes('assets/models/' + f + '.glb')), f + ' registered');
assert.ok(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8').includes('`wet_water_bottle.glb`, `chippys_bag.glb`'), 'credited');
console.log('PASS: vending items from the owner\'s art (Milorade + WET bottles lathed from the pictures, the Chippys bag; normals, size, base, credits; Chippys replaces the corn chips, Milorade the can, WET the water can)');
