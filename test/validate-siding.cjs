// Run from the test/ directory: node validate-siding.cjs
// v1.97.117: every building's outside walls use the process building's ribbed metal siding. Runs the game's own ribGeo on
// boxes (one texture repeat per foot along each face, ribs running up the wall) and checks each building's wall material.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const a = html.indexOf('// ---------- METAL SIDING (v1.97.117'), b = html.indexOf('\n// ---------- ROOMS FOR THE LIGHTING PASS', a);
assert.ok(a > 0 && b > a, 'the siding code');
const scene = new T.Scene(), ctx = { T, scene, renderer: null, document: { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) } };
const p0 = html.indexOf('// ---------- PSX TEXTURES'), p1 = html.indexOf('const GROUND = {};', p0);
assert.ok(p0 > 0 && p1 > p0, 'the PSX texture code');
vm.createContext(ctx); vm.runInContext(html.slice(p0, p1) + html.slice(a, b) + '\nthis.ribWall = ribWall; this.ribGeo = ribGeo; this.ribAll = ribAll; this.psxUVAll = psxUVAll; this.PSX = PSX;', ctx);
// v1.97.65: the siding is the PSX rusty corrugated, tiled in world metres (1.5 m a copy), in the wall's own colour
const urange = (geo, pick) => { let lo = Infinity, hi = -Infinity; const uv = geo.attributes.uv, n = geo.attributes.normal; for (let i = 0; i < uv.count; i++) if (pick(n.getX(i), n.getY(i), n.getZ(i))) { lo = Math.min(lo, uv.getX(i)); hi = Math.max(hi, uv.getX(i)); } return hi - lo; };
const m = ctx.ribWall(new T.MeshLambertMaterial({ color: 0xa7afb8 }));
assert.ok(m.map && m.userData.psx && m.userData.psx.name === 'corrugated_rusty' && m.userData.psx.tile === 1.5, 'a siding material: rusty corrugated, 1.5 m a copy');
assert.equal(m.color.getHex(), 0xa7afb8, 'its colour stays until the picture lands (then it is tinted to keep the same average colour)');
assert.ok(ctx.PSX.list.includes(m), 'and the static merge knows it');
const long = new T.Mesh(new T.BoxGeometry(30, 8, 0.3), m), short = new T.Mesh(new T.BoxGeometry(0.3, 4, 3), m), other = new T.Mesh(new T.BoxGeometry(5, 5, 5), new T.MeshLambertMaterial());
long.position.set(115, 4, 40); short.position.set(-7, 2, 12); scene.add(long, short, other); ctx.psxUVAll();
assert.ok(Math.abs(urange(long.geometry, (x, y, z) => Math.abs(z) > 0.5) - 20) < 1e-4, 'a 30 m wall along x: 20 copies along its faces, wherever it stands');
assert.ok(Math.abs(urange(short.geometry, (x, y, z) => Math.abs(x) > 0.5) - 2) < 1e-4, 'a 3 m wall along z: 2');
assert.ok(Math.abs(urange(long.geometry, (x, y, z) => Math.abs(y) > 0.5) - 20) < 1e-4, 'its top too');
assert.equal(urange(other.geometry, (x, y, z) => Math.abs(z) > 0.5), 1, 'other materials are left alone');
{ const u0 = long.geometry.attributes.uv.getX(0); ctx.psxUVAll(); assert.equal(long.geometry.attributes.uv.getX(0), u0, 'running it twice changes nothing'); }
{ const geo = new T.BoxGeometry(2, 2, 0.3), a1 = new T.Mesh(geo, m), a2 = new T.Mesh(geo, m); a1.position.set(0, 1, 0); a2.position.set(50, 1, 0); scene.add(a1, a2); ctx.psxUVAll();
  assert.ok(a1.geometry !== a2.geometry, 'two meshes sharing one box get one each (their world UVs differ)'); }
// every building's outside walls
for (const [k, why] of [
  ["const wall = ribWall(new T.MeshLambertMaterial({ color: 0xa7afb8, transparent: true, opacity: 0.5, depthWrite: false }));", 'the gray metal buildings (energy center, MCCs, yeast cooler ...)'],
  ["tw = ribWall(new T.MeshLambertMaterial({ color: 0xe9ebe6,", 'the evap tower enclosure'],
  ["const wm = ribWall(new T.MeshLambertMaterial({ color: 0xf1f1ee,", 'the scale house'],
  ["const wood = ribWall(new T.MeshLambertMaterial({ color: 0xb59a5e,", 'the storage shed'],
  ["const wm = ribWall(new T.MeshLambertMaterial({ color: 0xc9c4b8,", 'the DDG building'],
  ["wall = ribWall(new T.MeshLambertMaterial({ color: 0xf4c430 }))", 'the receiving building (its own copy of the yellow)'],
  ["wm.userData.ribbed = 0.3048;", 'the process building and maintenance shop (they always had it)']]) assert.ok(html.includes(k), why);
assert.ok(html.includes('lightBuild(); ribAll(); psxUVAll(); mergeStatic();'), 'world texture coordinates laid out once the plant is built, before the static merge');
assert.ok(html.includes('const withUV = !!G.m.map && parts.every(g => g.attributes.uv);') && html.includes("if (uvs) geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));"), 'the static merge keeps texture coordinates for textured walls (it used to drop them, flattening the ribs)');
console.log('PASS: rusty corrugated siding (PSX) on every building\'s outside walls, tiled in world metres, other materials untouched');
