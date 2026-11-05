// Run from the test/ directory: node validate-minimap.cjs
// v1.97.159, owner: "mini map to bottom right" (asked for a real one). A round map in the bottom-right corner while walking or
// driving, turned with your view, baked once from a top-down picture of the plant a tile a frame. Runs the game's own bake against a
// stand-in renderer that paints each pixel from its world position, so a tile in the wrong place or flipped shows up; checks the
// materials are swapped back, the moving things are left out, the widget's placement and its turning sense.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const src = cut('const MMAP = {', 'function mmapGuard(f)');

// a tiny 2D canvas: enough for the bake (fill, image data, drawImage of one canvas onto another)
function Canvas() { const c = { width: 0, height: 0, buf: null, getContext: () => ctx2 }; const ensure = () => { if (!c.buf || c.buf.length !== c.width * c.height * 4) c.buf = new Uint8ClampedArray(c.width * c.height * 4); };
  const ctx2 = { fillStyle: '', fillRect(x, y, w, h) { ensure(); const v = parseInt(String(this.fillStyle).slice(1), 16); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * c.width + i) * 4; c.buf[k] = v >> 16; c.buf[k + 1] = (v >> 8) & 255; c.buf[k + 2] = v & 255; c.buf[k + 3] = 255; } },
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData(im) { c.width = im.width; c.height = im.height; ensure(); c.buf.set(im.data); },
    drawImage(src, x, y) { ensure(); for (let j = 0; j < src.height; j++) for (let i = 0; i < src.width; i++) { const X = x + i, Y = y + j; if (X >= c.width || Y >= c.height) continue; const s = (j * src.width + i) * 4, d = (Y * c.width + X) * 4; if (src.buf[s + 3]) { c.buf[d] = src.buf[s]; c.buf[d + 1] = src.buf[s + 1]; c.buf[d + 2] = src.buf[s + 2]; c.buf[d + 3] = 255; } } } };
  return c; }
const document = { createElement: () => Canvas() };

// the world: a 600 x 300 m block of buildings (x -100..500, z 0..300) and a truck that must not be on the map
const scene = new T.Scene();
const block = new T.Mesh(new T.BoxGeometry(600, 10, 300), new T.MeshLambertMaterial({ color: 0x884422 })); block.position.set(200, 5, 150); scene.add(block);
const truck = new T.Mesh(new T.BoxGeometry(4, 3, 8), new T.MeshLambertMaterial({ color: 0x0000ff })); truck.position.set(0, 1.5, 100); scene.add(truck);
const shader = new T.ShaderMaterial(); const water = new T.Mesh(new T.PlaneGeometry(20, 20), shader); water.position.set(300, 0.1, 100); scene.add(water);
const origBlock = block.material;
// stand-in GPU: pixel colour = world position (red = x, green = z), only where the block is, and only for meshes on the map layer
const pending = [], data = new Map(); let swapped = 0, drew = 0;
const renderer = { capabilities: { maxTextureSize: 4096 }, info: { render: { calls: 3, triangles: 9 } }, shadowMap: { autoUpdate: true, needsUpdate: false }, _rt: null,
  getClearColor: c => c, getClearAlpha: () => 1, getRenderTarget: () => renderer._rt, setRenderTarget(rt) { renderer._rt = rt; }, setClearColor() {}, clear() {},
  render(sc, cam) { drew++;
    assert.ok(block.material.isMeshBasicMaterial && block.material.color.getHex() === 0x884422, 'drawn unlit, in its own colour'); if (block.material !== origBlock) swapped++;
    assert.equal(water.material, shader, 'shader materials draw as they are'); assert.ok(!truck.layers.test(cam.layers), 'the truck is not on the map layer'); assert.equal(sc.fog, null);
    renderer.info.render.calls += 9;
    const rt = renderer._rt, n = rt.width, px = new Uint8Array(n * n * 4), s = (cam.right - cam.left) / n;
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) { const x = cam.position.x + cam.left + (col + 0.5) * s, z = cam.position.z - (cam.bottom + (row + 0.5) * s);
      if (x < -100 || x > 500 || z < 0 || z > 300) continue; const k = (row * n + col) * 4; px[k] = Math.floor((x + 100) / 600 * 255); px[k + 1] = Math.floor(z / 300 * 255); px[k + 2] = 7; px[k + 3] = 255; }
    data.set(rt, px); },
  readRenderTargetPixelsAsync(rt, x, y, w, h, buf) { const px = data.get(rt); return new Promise(res => pending.push(() => { buf.set(px); res(buf); })); } };
const ctx = { T, Math, console, Map, Set, Float32Array, Uint8Array, Infinity, document, scene, renderer, PERF: { errs: 0 }, roofMapSkip: () => new Set([truck]) };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.MMAP = MMAP; this.mmapBakeStart = mmapBakeStart; this.mmapStep = mmapStep; this.mmapMeshes = mmapMeshes;', ctx);
const M = ctx.MMAP, tick = () => new Promise(r => setImmediate(r));

(async () => {
  assert.ok(!ctx.mmapMeshes().includes(truck), 'moving things (the roof map\'s skip list) are left out');
  assert.equal(ctx.mmapBakeStart(), true); const J = M.job;
  assert.ok(J.x0 <= -160 && J.z0 <= -60 && J.x0 + J.W * J.mpp >= 500 && J.x0 + J.W * J.mpp < 502, 'the picture covers the plant with a 60 m margin, cut at the edge of the play area (x 500)');
  let frames = 0; while (M.job && frames < 500) { const d0 = drew; ctx.mmapStep(); assert.ok(drew - d0 <= 1, 'one tile a frame'); while (pending.length) pending.shift()(); await tick(); frames++; }
  assert.equal(M.job, null, 'the bake finishes'); assert.equal(M.bakes, 1); assert.equal(drew, J.tiles.length, 'each tile once'); assert.ok(J.tiles.length > 1, 'several tiles');
  assert.equal(block.material, origBlock, 'every mesh has its own material back'); assert.equal(renderer.info.render.calls, 3, 'kept out of the fps readout'); assert.equal(renderer._rt, null);
  assert.ok(!block.layers.test(Object.assign(new T.Layers(), { mask: 1 << 29 })), 'and leaves the map layer');
  // every pixel shows the spot of the world it covers: x across, z down (north at the top)
  const C = M.cv, px = (x, z) => { const i = Math.floor((x - M.x0) / M.mpp), j = Math.floor((z - M.z0) / M.mpp), k = (j * C.width + i) * 4; return [C.buf[k], C.buf[k + 1], C.buf[k + 2]]; };
  let bad = 0; for (let x = -95; x < 500; x += 13) for (let z = 3; z < 300; z += 11) { const [r, g] = px(x, z), er = Math.floor((x + 100) / 600 * 255), eg = Math.floor(z / 300 * 255); if (Math.abs(r - er) > 2 || Math.abs(g - eg) > 2) bad++; }
  assert.equal(bad, 0, 'pixels in the wrong place: ' + bad);
  assert.deepEqual(px(-150, 150).slice(0, 3), [0x76, 0xbd, 0x62], 'empty ground shows the grass colour');
  // a second bake reuses the flat materials (new ones were the slow part)
  const n0 = M.flat.size; ctx.mmapBakeStart(); while (M.job) { ctx.mmapStep(); while (pending.length) pending.shift()(); await tick(); } assert.equal(M.flat.size, n0, 'the flat stand-ins are kept between bakes'); assert.equal(M.bakes, 2);

  // the widget: bottom right, only while walking, lifted over the touch buttons; turned so what is ahead is up
  const css = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  assert.ok(html.includes('<canvas id="mmap" aria-hidden="true"></canvas>') && css.includes('body.walking #mmap{display:block}'), 'bottom right, shown while walking');
  // v1.97.162, owner: "minimal needs to me a little smaller and out of way of the gun magazine so you can keep track of ammo"
  assert.ok(/#mmap\{display:none;position:fixed;right:calc\(16px[^}]*bottom:calc\(24vh \+ 8px[^}]*width:118px;height:118px/.test(css), 'smaller (150 -> 118 px) and lifted a quarter of the screen up, over the gun\'s magazine (which scales with the window height)');
  assert.ok(/body\.walking:not\(\.pc\):not\(\.padmode\) #mmap\{width:100px;height:100px;bottom:calc\(214px/.test(css) && css.includes('#mmap{bottom:auto;top:calc(58px + env(safe-area-inset-top,0px));width:84px;height:84px}'), 'touch: 100 px above the buttons, 84 px under the pause button on a short landscape phone');
  // v1.97.162, owner: "Mini map needs a on and off toggle in pause menu"
  assert.ok(css.includes('body.walking.nomap #mmap{display:none}'), 'off: hidden');
  assert.ok(html.includes("['🗺️ Mini map: ' + (mapOn ? 'on' : 'off'), () => { mapSet(!mapOn); toast('Mini map ' + (mapOn ? 'on' : 'off')); menu(); }]"), 'a pause-menu item that flips it and shows the new state');
  assert.ok(html.includes("let mapOn = true; try { mapOn = localStorage.getItem('cs_minimap') !== 'off'; } catch (e) {}") && html.includes("function mapSet(on) { mapOn = !!on; document.body.classList.toggle('nomap', !mapOn); try { localStorage.setItem('cs_minimap', mapOn ? 'on' : 'off'); } catch (e) {} }\nmapSet(mapOn);"), 'remembered on this device (on by default)');
  { const cls = new Set(), store = {}; const doc = { body: { classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c) } } };
    const m = html.match(/let mapOn = true;[^\n]*\nfunction mapSet\(on\) \{[^\n]*\}\nmapSet\(mapOn\);/)[0];
    const c2 = { document: doc, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } } }; vm.createContext(c2); vm.runInContext(m + '\nthis.get = () => mapOn; this.mapSet = mapSet;', c2);
    assert.equal(c2.get(), true); assert.ok(!cls.has('nomap'), 'on by default');
    c2.mapSet(false); assert.ok(cls.has('nomap') && store.cs_minimap === 'off', 'off: hidden, remembered');
    const c3 = { document: doc, localStorage: c2.localStorage }; vm.createContext(c3); vm.runInContext(m + '\nthis.get = () => mapOn;', c3); assert.equal(c3.get(), false, 'still off next time'); }
  assert.ok(html.includes("stepSafe('minimap', () => minimapUpdate(dt));"), 'updated every frame under its own guard');
  const up = cut('function minimapUpdate(dt) {', '\n}\n');
  assert.ok(up.includes('yaw = Math.atan2(-dir.x, -dir.z)') && up.includes('g.rotate(yaw)') && up.includes('g.translate(-pos.x, -pos.z)'), 'the map turns with the view');
  // turning sense: canvas rotate(yaw) must carry the way you face to "up" on the screen
  for (const yaw of [0, Math.PI / 2, -2.2, 3]) { const fx = -Math.sin(yaw), fz = -Math.cos(yaw), sx = fx * Math.cos(yaw) - fz * Math.sin(yaw), sy = fx * Math.sin(yaw) + fz * Math.cos(yaw); assert.ok(Math.abs(sx) < 1e-9 && Math.abs(sy + 1) < 1e-9, 'ahead is up (yaw ' + yaw + ')'); }
  assert.ok(up.indexOf('if (!el || !el.getClientRects().length) return;') < up.indexOf('mmapBakeStart'), 'off or hidden: no bake and no drawing (offsetParent is always null on a fixed element)');
  assert.ok(up.includes('MMAP.again = 14'), 'baked on the first walk and once more for the late models');
  console.log('PASS: mini map (bottom right while walking, clear of the gun magazine and the touch buttons; on/off in the pause menu, remembered; ' + J.tiles.length + ' tiles a frame each, every pixel in place, materials swapped back, moving things left out, flat materials kept; turns with the view)');
})().catch(e => { console.error(e); process.exit(1); });
