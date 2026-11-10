// Run from the test/ directory: node validate-psx-textures.cjs
// Guards TEST v1.97.65: "PSX Textures Free" by heyheythere (CC BY 4.0) across the plant (owner: "Everything they fit"). The 16 PNGs
// ship unchanged with the pack's licence and are credited; grass, asphalt, concrete, rusty corrugated siding and roofs, the office
// drop ceiling and tile floors, the scale house's wood doors and a blood splatter under a fallen zombie use them. A textured surface
// keeps its old average colour (tint = old / texture average), starts with a 1 px white map so the swap is never a new shader, and
// gets world-space UVs (metres / tile) before the static merge, which keeps them.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const NAMES = ['asphalt', 'blood_splatter', 'brick_red', 'ceiling_tiles', 'concrete', 'corrugated_rusty', 'door_wood', 'grass', 'paint_mint', 'plaster_cracked', 'sign_exit', 'steel_rusty', 'tiles_lino', 'tiles_white_dirty', 'wainscot_tiles', 'wood_floor'];
// the files, the licence and the credits
for (const n of NAMES) { const b = fs.readFileSync(path.join(root, 'assets/textures/psx', n + '.png')); assert.equal(b.toString('latin1', 1, 4), 'PNG', n + '.png'); assert.ok(b.length < 16000, n + ' is a small indexed PNG'); }
assert.ok(/PSX Textures Free by heyheythere - https:\/\/heyheythere\.itch\.io\/psx-textures-free - CC BY 4\.0/.test(fs.readFileSync(path.join(root, 'assets/textures/psx/LICENSE.txt'), 'utf8')), 'the pack licence ships with it');
const credits = fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8');
assert.ok(credits.includes('PSX Textures Free') && credits.includes('heyheythere') && credits.includes('https://heyheythere.itch.io/psx-textures-free') && credits.indexOf('PSX Textures Free') < credits.indexOf('## First-party assets'), 'credited in CREDITS.md');
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')).assets.find(a => a.id === 'itch-heyheythere-psx-textures-free');
assert.ok(reg && reg.license_name === 'CC BY 4.0' && reg.creator === 'heyheythere' && reg.status === 'in-use', 'registered (credits.html reads the registry)');
for (const n of NAMES) assert.ok(reg.files.includes('assets/textures/psx/' + n + '.png'), n + ' listed');
for (const f of reg.files) assert.ok(fs.existsSync(path.join(root, f)), f + ' exists');

// the engine, run for real
const lib = { window: {}, console }; vm.runInNewContext([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const src = html.slice(html.indexOf('// ---------- PSX TEXTURES'), html.indexOf('const GROUND = {};'));
const scene = new T.Scene(), ctx = { T, Math, scene, renderer: null, GB: () => -14 };
vm.createContext(ctx); vm.runInContext(src + '\nthis.PSX = PSX; this.psxMat = psxMat; this.psxFace = psxFace; this.psxUVAll = psxUVAll; this.psxTint = psxTint; this.psxLoad = psxLoad; this.PSX_TILE = PSX_TILE; this.BLOOD = BLOOD; this.bloodStep = bloodStep;', ctx);
const { PSX } = ctx;
assert.equal(PSX.dir, '/corn-souls/assets/textures/psx/', 'served from the repo assets');
const m = ctx.psxMat(new T.MeshLambertMaterial({ color: 0x8d9196 }), 'concrete');
assert.ok(m.map && m.map.image && m.map.image.width === 1, 'a 1 px white map from the start (the swap is not a new shader)');
assert.equal(m.color.getHex(), 0x8d9196, 'looks as it did until the picture lands');
assert.ok(PSX.list.includes(m) && m.userData.psx.tile === 2, 'concrete: 2 m a copy, and the merge keeps it');
// the picture lands: it is tinted to keep the colour it had
ctx.PSX.tex.concrete = null;
{ const avg = [0.2, 0.25, 0.3], got = []; PSX.wait.concrete.forEach(f => f(new T.Texture(), avg)); 
  const want = new T.Color(0x8d9196); assert.ok(Math.abs(m.color.r * avg[0] - want.r) < 1e-6 && Math.abs(m.color.b * avg[2] - want.b) < 1e-6, 'tint x texture average = the old colour'); }
{ const g = new T.MeshLambertMaterial(); ctx.psxTint(g, 0xffffff, [0.1, 0.1, 0.1]); assert.equal(g.color.r, 2, 'capped (2 by default) so a dark picture is not blown out'); ctx.psxTint(g, 0xffffff, [0.1, 0.1, 0.1], 3.5); assert.equal(g.color.r, 3.5, 'grass may go further'); }
// world UVs: the same texel size on any box, wherever it stands; floors look down, walls by the way they face
{ const wall = ctx.psxMat(new T.MeshLambertMaterial({ color: 0xa7afb8 }), 'corrugated_rusty');
  assert.equal(wall.userData.psx.tile, 1.5); assert.equal(wall.userData.psx.tall, 4, 'rust streaks run 4 m up a wall');
  const floor = new T.Mesh(new T.BoxGeometry(10, 0.1, 6), m), w = new T.Mesh(new T.BoxGeometry(12, 8, 0.3), wall), other = new T.Mesh(new T.BoxGeometry(3, 3, 3), new T.MeshLambertMaterial());
  floor.position.set(-300, 0.05, 220); w.position.set(80, 4, -40); scene.add(floor, w, other);
  assert.ok(ctx.psxUVAll() >= 2);
  const span = (o, pick, c) => { let lo = Infinity, hi = -Infinity; const uv = o.geometry.attributes.uv, n = o.geometry.attributes.normal; for (let i = 0; i < uv.count; i++) if (pick(n.getX(i), n.getY(i), n.getZ(i))) { const v = c ? uv.getY(i) : uv.getX(i); lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; };
  assert.ok(Math.abs(span(floor, (x, y) => y > 0.5) - 5) < 1e-6 && Math.abs(span(floor, (x, y) => y > 0.5, 1) - 3) < 1e-6, 'a 10 x 6 m slab: 5 x 3 copies of a 2 m concrete');
  assert.ok(Math.abs(span(w, (x, y, z) => Math.abs(z) > 0.5) - 8) < 1e-6, 'a 12 m wall: 8 copies of 1.5 m along it');
  assert.ok(Math.abs(span(w, (x, y, z) => Math.abs(z) > 0.5, 1) - 2) < 1e-6, 'and 8 m up it is 2 copies of the 4 m streaks');
  assert.equal(span(other, (x, y, z) => Math.abs(z) > 0.5), 1, 'untextured boxes untouched');
  const merged = new T.Mesh(new T.BoxGeometry(1, 1, 1), m); merged.userData.merged = true; scene.add(merged); const u0 = merged.geometry.attributes.uv.getX(0);
  ctx.psxUVAll(); assert.equal(merged.geometry.attributes.uv.getX(0), u0, 'merged meshes (already in world space) are not redone'); }
// a door shows one whole picture per face
{ const d = ctx.psxFace(new T.MeshLambertMaterial({ color: 0x8a6a45 }), 'door_wood'); assert.ok(d.map && !d.userData.psx, 'its own UVs, not world tiles'); }
// blood: kept to a handful, gone after a minute and a half
{ assert.equal(ctx.BLOOD.max, 14); assert.equal(ctx.BLOOD.life, 90);
  const fake = () => ({ m: new T.Object3D(), t: 90 }); for (let i = 0; i < 3; i++) { const b = fake(); scene.add(b.m); ctx.BLOOD.list.push(b); }
  ctx.bloodStep(89); assert.equal(ctx.BLOOD.list.length, 3); ctx.bloodStep(2); assert.equal(ctx.BLOOD.list.length, 0, 'cleared'); }

// where they are used
for (const [k, why] of [
  ["function ribWall(m) { psxMat(m, 'corrugated_rusty'); ribMats.push(m); return m; }", 'every ribWall siding is rusty corrugated'],
  ["wm.userData.ribbed = 0.3048; psxMat(wm, 'corrugated_rusty', 0, { base: 0xeceeef });", 'and the process building and maintenance shop'],
  ["const roof = psxMat(new T.MeshLambertMaterial({ color: 0x4a5058, transparent: true, opacity: 0.42, depthWrite: false }), 'corrugated_rusty');", 'the metal buildings\' roofs'],
  ["m.userData.ground = 'pad'; return psxMat(m, 'concrete'); })());", 'the concrete pad layer'],
  ["function concreteFloor(x0, x1, z0, z1) { box(x1 - x0 - 0.3, 0.1, z1 - z0 - 0.3, concM(0x8d9196),", 'the simple concrete floors'],
  ["psxMat(conc, 'concrete');", 'the process building slab'],
  ["psxMat(ceilM, 'ceiling_tiles');", 'the office drop ceiling'],
  ["'tiles_lino', 0.61, { base: 0xb4975f })", 'the office floor, 1 ft lino'],
  ["psxMat(matU(0x8a7f6c), 'tiles_lino', 0.61)", 'the scale house floor'],
  ["const doorM = psxFace(matU(0x8a6a45), 'door_wood');", 'the scale house\'s inside doors'],
  ["if (kind === 'grass' || kind === 'asphalt') {", 'the grass and asphalt ground'],
  ["if (!z.blood) { z.blood = true; if (typeof bloodSplat === 'function') bloodSplat(z.x, z.y, z.z); }", 'a zombie bleeds where it falls (on every end: the dead branch runs for puppets too)'],
  ["lightBuild(); ribAll(); psxUVAll(); mergeStatic();", 'world UVs before the merge'],
  ["...wallMats, ...ribMats, ...PSX.list,", 'the merge folds textured psx surfaces together'],
  ["stepSafe('blood', () => bloodStep(dt));", 'the splatters age'],
]) assert.ok(html.includes(k), why);
assert.ok((html.match(/concM\(0x/g) || []).length >= 14, 'concrete pieces round the plant');
console.log('PASS: PSX textures (16 files + licence + credits; colour-keeping tint, white placeholder map, world-metre UVs before the merge, grass / asphalt / concrete / corrugated / ceiling / lino / wood door / blood)');
