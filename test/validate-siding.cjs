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
const scene = new T.Scene(), ctx = { T, scene, document: { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) } };
vm.createContext(ctx); vm.runInContext(html.slice(a, b) + '\nthis.ribWall = ribWall; this.ribGeo = ribGeo; this.ribAll = ribAll;', ctx);
const umax = (geo, axis) => { let m = 0; const uv = geo.attributes.uv, n = geo.attributes.normal; for (let i = 0; i < uv.count; i++) if (Math.abs(axis === 'x' ? n.getX(i) : n.getZ(i)) > 0.5) m = Math.max(m, uv.getX(i)); return m; };
const m = ctx.ribWall(new T.MeshLambertMaterial({ color: 0xa7afb8 }));
assert.ok(m.map && m.userData.ribSiding, 'a siding material: rib texture, keeps its colour'); assert.equal(m.color.getHex(), 0xa7afb8);
const long = new T.Mesh(new T.BoxGeometry(30.48, 8, 0.3), m), short = new T.Mesh(new T.BoxGeometry(0.3, 4, 3.048), m), other = new T.Mesh(new T.BoxGeometry(5, 5, 5), new T.MeshLambertMaterial());
scene.add(long, short, other); ctx.ribAll();
assert.ok(Math.abs(umax(long.geometry, 'z') - 100) < 1e-4, 'a 100 ft wall along x: 100 ribs on its faces');
assert.ok(Math.abs(umax(short.geometry, 'x') - 10) < 1e-4, 'a 10 ft wall along z: 10 ribs on its faces');
assert.ok(Math.abs(umax(long.geometry, 'x') - 0.3 / 0.3048) < 1e-4, 'its 0.3 m end: about one');
assert.equal(umax(other.geometry, 'z'), 1, 'other materials are left alone');
ctx.ribAll(); assert.ok(Math.abs(umax(long.geometry, 'z') - 100) < 1e-4, 'running it twice does not double the ribs');
// every building's outside walls
for (const [k, why] of [
  ["const wall = ribWall(new T.MeshLambertMaterial({ color: 0xa7afb8, transparent: true, opacity: 0.5, depthWrite: false }));", 'the gray metal buildings (energy center, MCCs, yeast cooler ...)'],
  ["tw = ribWall(new T.MeshLambertMaterial({ color: 0xe9ebe6,", 'the evap tower enclosure'],
  ["const wm = ribWall(new T.MeshLambertMaterial({ color: 0xf1f1ee,", 'the scale house'],
  ["const wood = ribWall(new T.MeshLambertMaterial({ color: 0xb59a5e,", 'the storage shed'],
  ["const wm = ribWall(new T.MeshLambertMaterial({ color: 0xc9c4b8,", 'the DDG building'],
  ["wall = ribWall(new T.MeshLambertMaterial({ color: 0xf4c430 }))", 'the receiving building (its own copy of the yellow)'],
  ["wm.userData.ribbed = 0.3048;", 'the process building and maintenance shop (they always had it)']]) assert.ok(html.includes(k), why);
assert.ok(html.includes('lightBuild(); ribAll(); mergeStatic();'), 'ribs laid out once the plant is built, before the static merge');
assert.ok(html.includes('const withUV = !!G.m.map && parts.every(g => g.attributes.uv);') && html.includes("if (uvs) geo.setAttribute('uv', new T.BufferAttribute(uvs, 2));"), 'the static merge keeps texture coordinates for textured walls (it used to drop them, flattening the ribs)');
console.log('PASS: ribbed metal siding on every building\'s outside walls (a rib a foot along any wall, other materials untouched)');
