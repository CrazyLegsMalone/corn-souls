// Run from the test/ directory: node validate-grass-grid.cjs
// v1.97.158, owner: "ground still flickers green especially when looking down at it from high places like the top of tin bin 4".
// The grass under the whole world was one 16 km shape with holes, triangulated into a few slivers kilometres long that fanned into
// the grain yard; depth across triangles that size is too coarse to stay under overlays a couple of centimetres up. Runs the
// game's own grassGeometry / grassRefine / grassRaycast with the game's real holes: small triangles everywhere near the plant, the
// same area and the same holes as the old shape, watertight (no T-junction cracks), the flat raycast hitting exactly what the
// triangles do, and the other big ground planes cut into ~30 m cells.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const src = cut('const GRASS_FINE = [', '// the other big ground planes get cells') + cut('const GSEG = ', '\n');
const ctx = { T, Math, Infinity, Map, Float32Array }; vm.createContext(ctx);
vm.runInContext(src + '\nthis.grassGeometry = grassGeometry; this.grassRaycast = grassRaycast; this.GSEG = GSEG;', ctx);

// the game's holes: the two ponds (rotated squares), the tank-farm pit, the receiving pits and the basement stair
const num = name => { const m = html.match(new RegExp('const ' + name + ' = ([^;]+);')); return Function('return ' + m[1])(); };
const PONDS = Function(html.match(/const PONDS = (\[\[[^;]+\]);/)[0].replace('const PONDS = ', 'return ').replace(/;$/, ''))();
PONDS.phi = Math.atan(0.756); PONDS.hole = +html.match(/PONDS\.hole = ([\d.]+);/)[1];
const TPIT = num('TPIT'), RPITS = num('RPITS'), RSTAIR = num('RSTAIR'), GDX = 0, GDZ = 0;
const holes = [], c = Math.cos(PONDS.phi), sn = Math.sin(PONDS.phi), H = PONDS.hole;
for (const [px, pz] of PONDS) holes.push([[-H, -H], [-H, H], [H, H], [H, -H]].map(([lx, lz]) => new T.Vector2(px + lx * c + lz * sn, -(pz - lx * sn + lz * c))));
{ const P = TPIT; holes.push([[P.x0, P.z0], [P.x0, P.z1], [P.x1, P.z1], [P.x1, P.z0]].map(([a, b]) => new T.Vector2(a, -b))); }
for (const [x, z, w, d] of [...RPITS, RSTAIR]) { const X = x + GDX, Z = z + GDZ; holes.push([[X - w / 2, Z - d / 2], [X - w / 2, Z + d / 2], [X + w / 2, Z + d / 2], [X + w / 2, Z - d / 2]].map(([a, b]) => new T.Vector2(a, -b))); }
// the game builds exactly these holes
assert.ok(html.includes('for (const [px, pz] of PONDS) holes.push([[-H, -H], [-H, H], [H, H], [H, -H]].map(([lx, lz]) => new T.Vector2(px + lx * c + lz * sn, -(pz - lx * sn + lz * c))));'), 'pond holes as in the game');
assert.ok(html.includes("const gp = add(grassGeometry(holes), groundMat('grass', true), 0, 0, 0, null, true); gp.rotation.x = -Math.PI / 2; grassRaycast(gp, holes);"), 'the grass is built from the grid, with the flat raycast');
assert.ok(!html.includes("add(new T.ShapeGeometry(g), groundMat('grass'"), 'not the one big shape any more');

const g = ctx.grassGeometry(holes), P = g.attributes.position, I = g.index;
const tri = k => [I.getX(k * 3), I.getX(k * 3 + 1), I.getX(k * 3 + 2)], xy = i => [P.getX(i), P.getY(i)];
let area = 0, maxNear = 0, nTri = I.count / 3;
for (let k = 0; k < nTri; k++) { const [a, b, cc] = tri(k).map(xy); const s = (b[0] - a[0]) * (cc[1] - a[1]) - (b[1] - a[1]) * (cc[0] - a[0]); assert.ok(s > 0, 'every triangle faces up (+z before the -90 deg turn)'); area += s / 2;
  if (Math.abs(a[0]) < 1500 && Math.abs(a[1]) < 1500) maxNear = Math.max(maxNear, Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(cc[0] - b[0], cc[1] - b[1]), Math.hypot(a[0] - cc[0], a[1] - cc[1])); }
const holeArea = holes.reduce((s, h) => s + Math.abs(T.ShapeUtils.area(h)), 0);
assert.ok(Math.abs(area - (16000 * 16000 - holeArea)) < 1, 'the same ground as before: 16 km square less the holes (' + Math.round(area) + ')');
assert.ok(maxNear <= 40, 'no triangle edge over 40 m within 1.5 km of the plant (longest ' + maxNear.toFixed(1) + ' m; the old shape had slivers kilometres long)');
assert.ok(nTri < 70000, 'and still a light mesh: ' + nTri + ' triangles, one draw call');
// watertight: every edge is shared by two triangles, except the 16 km border and the hole outlines - no T-junction cracks
{ const pk = i => P.getX(i).toFixed(4) + ',' + P.getY(i).toFixed(4), E = new Map();
  for (let k = 0; k < nTri; k++) { const t = tri(k).map(pk); for (let e = 0; e < 3; e++) { const a = t[e], b = t[(e + 1) % 3], key = a < b ? a + '|' + b : b + '|' + a; E.set(key, (E.get(key) || 0) + 1); } }
  const onHole = (x, y) => holes.some(h => h.some((p, i) => { const q = h[(i + 1) % h.length], L = Math.hypot(q.x - p.x, q.y - p.y), cr = Math.abs((q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x)) / L, t = ((x - p.x) * (q.x - p.x) + (y - p.y) * (q.y - p.y)) / (L * L); return cr < 1e-3; }));   // (on a hole side or its line: the triangulator runs one edge along two pits' collinear sides, as the old shape did)
  let bad = 0; for (const [key, n] of E) { if (n === 2) continue; const [a, b] = key.split('|').map(s => s.split(',').map(Number)); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (n === 1 && (Math.abs(Math.abs(mx) - 8000) < 1e-3 || Math.abs(Math.abs(my) - 8000) < 1e-3 || onHole(mx, my))) continue; bad++; }
  assert.equal(bad, 0, 'open or doubled edges inside the ground (cracks): ' + bad); }

// the flat raycast hits exactly where the triangles do (tuft probes, shots and splats see the same ground, ~400x cheaper)
const mesh = new T.Mesh(g, new T.MeshLambertMaterial()); mesh.rotation.x = -Math.PI / 2; mesh.updateMatrixWorld(true); ctx.grassRaycast(mesh, holes);
const rc = new T.Raycaster(), down = new T.Vector3(0, -1, 0); let mism = 0;
const probe = (x, z) => { rc.set(new T.Vector3(x, 6, z), down); const a = []; T.Mesh.prototype.raycast.call(mesh, rc, a); const f = rc.intersectObject(mesh, false); return [a.length ? a[0].point.y : null, f.length ? f[0].point.y : null, f[0]]; };
const pts = [[-603, 429], [-451, 309], [-150, 237], [-186, 0], [-196, 0], [-191.6, -3], [-130, -70], [0, 0], [7000, -7000]];
let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let k = 0; k < 300; k++) pts.push([-800 + rnd() * 1000, -200 + rnd() * 800]);
for (const [x, z] of pts) { const [a, f] = probe(x, z); if ((a === null) !== (f === null) || (a !== null && Math.abs(a - f) > 1e-4)) mism++; }
assert.equal(mism, 0, 'flat raycast vs triangles: ' + mism + ' disagree');
assert.equal(probe(-603, 429)[1], null, 'a pond is still a hole'); assert.equal(probe(-150, 237)[1], null, 'the tank-farm pit too'); assert.equal(probe(-196, 0)[1], null, 'and the rail pit');
{ const h = probe(-130, -70)[2]; assert.ok(h && Math.abs(h.point.y) < 1e-9 && h.object === mesh, 'a hit on the grass at y 0');
  const n = h.face.normal.clone().transformDirection(mesh.matrixWorld); assert.ok(n.y > 0.999, 'with the face pointing up (splats lie flat on it)'); }
rc.set(new T.Vector3(10, -5, 10), new T.Vector3(0, 1, 0)); assert.equal(rc.intersectObject(mesh).length, 0, 'not from underneath (front side only, as before)');

// the other big flat ground pieces are cut into ~30 m cells too
assert.equal(ctx.GSEG(300), 10); assert.equal(ctx.GSEG(8), 1);
const planes = [...html.matchAll(/new T\.PlaneGeometry\(([^\n]*?)\)\.rotateX\(-Math\.PI \/ 2\), groundMat\(/g)];
assert.ok(planes.length >= 10 && planes.every(m => /GSEG\(/.test(m[1])), 'every ground plane passes its cell counts (' + planes.length + ')');
assert.ok(html.includes('add(new T.PlaneGeometry(EXR - WXR, SZR - NROAD, GSEG(EXR - WXR), GSEG(SZR - NROAD)).rotateX(-Math.PI / 2), groundMat(\'dirt\''), 'the 300 m dirt yard (two triangles before)');
console.log('PASS: grass grid (' + nTri + ' triangles, none over 40 m near the plant, same area and holes, watertight; flat raycast = triangle raycast; big ground planes in ~30 m cells)');
