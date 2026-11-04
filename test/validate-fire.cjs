// Run from the test/ directory: node validate-fire.cjs
// v1.97.142, owner (an animated pixel-art fire GIF): "can we use this for fires". The GIF is kept as sent; fire-atlas.png is its 8
// frames at 1x (32 x 24), background keyed out, in one strip. Burning vehicles draw it: crisp pixels, the GIF's 90 ms a frame,
// anchored at the flames' base, standing on the wreck; the old code-drawn flipbook only stands in until it loads.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8'), root = path.join(__dirname, '..');
const gif = fs.readFileSync(path.join(root, 'assets/textures/fire/fire.gif')), png = fs.readFileSync(path.join(root, 'assets/textures/fire/fire-atlas.png'));
// the GIF as sent: 256 x 192, looping, 8 frames at 90 ms
assert.equal(gif.toString('latin1', 0, 6), 'GIF89a'); assert.equal(gif.readUInt16LE(6), 256); assert.equal(gif.readUInt16LE(8), 192);
const gce = [...gif.toString('latin1').matchAll(/\x21\xf9\x04[\s\S]([\s\S]{2})/g)].map(m => Buffer.from(m[1], 'latin1').readUInt16LE(0));
assert.equal(gce.length, 8, 'eight frames'); assert.ok(gce.every(d => d === 9), 'each 90 ms (9 hundredths)');
// the strip: a 256 x 24 RGBA PNG, transparent background, eight 32 x 24 frames each with flames in them, sitting on row 21
assert.equal(png.toString('latin1', 1, 4), 'PNG'); assert.equal(png.readUInt32BE(16), 256); assert.equal(png.readUInt32BE(20), 24); assert.equal(png[25], 6, 'RGBA');
let idat = []; for (let o = 8; o < png.length;) { const n = png.readUInt32BE(o), t = png.toString('latin1', o + 4, o + 8); if (t === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + n)); o += 12 + n; }
const raw = zlib.inflateSync(Buffer.concat(idat)), W = 256, H = 24, bpp = 4, px = Buffer.alloc(W * H * bpp);
for (let y = 0, prev = Buffer.alloc(W * bpp); y < H; y++) { const f = raw[y * (W * bpp + 1)], line = raw.subarray(y * (W * bpp + 1) + 1, (y + 1) * (W * bpp + 1)), out = px.subarray(y * W * bpp, (y + 1) * W * bpp);
  for (let i = 0; i < W * bpp; i++) { const a = i >= bpp ? out[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    out[i] = (line[i] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : (pa <= pb && pa <= pc ? a : pb <= pc ? b : c))) & 255; } prev = out; }
const A = (x, y) => px[(y * W + x) * 4 + 3];
for (let f = 0; f < 8; f++) { let n = 0, low = 23, semi = 0; for (let y = 0; y < H; y++) for (let x = f * 32; x < f * 32 + 32; x++) { const a = A(x, y); if (a === 255) { n++; low = Math.min(low, 23 - y); } else if (a) semi++; }
  assert.ok(n > 60, 'frame ' + f + ' has flames (' + n + ' px)'); assert.equal(semi, 0, 'frame ' + f + ': crisp pixels, fully on or off'); }
assert.equal(A(0, 0), 0, 'the dark background is transparent');
// registered and credited
const reg = JSON.parse(fs.readFileSync(path.join(root, 'assets/registry.json'), 'utf8')), all = Object.values(reg).filter(Array.isArray).flat();
const e = all.find(x => x && x.id === 'first-party-pixel-fire'); assert.ok(e && e.status === 'in-use' && e.files.includes('assets/textures/fire/fire-atlas.png') && e.files.includes('assets/textures/fire/fire.gif'), 'registered');
assert.ok(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8').includes('Pixel-art fire'), 'credited');
// the game draws it
assert.ok(html.includes("new T.TextureLoader().load('/corn-souls/assets/textures/fire/fire-atlas.png'"), 'fires load the owner\'s strip');
assert.ok(html.includes('FLAME_FPS = 1000 / 90') && html.includes('t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter;'), 'at the GIF\'s speed, crisp');
assert.ok(html.includes('if (art) s.center.set(0.5, FLAME_BASE)') && html.includes('FLAME_BASE = 2 / 24'), 'anchored at the flames\' base');
assert.ok(html.includes('% FLAME_N) + FLAME_N) % FLAME_N'), 'the frame index never goes negative (a negative offset showed a blank frame)');
assert.ok(html.includes('try { flameArt(); } catch (e) {}'), 'fetched at start');
console.log('PASS: fires use the owner\'s pixel fire (GIF kept as sent; 8 crisp 32 x 24 frames, transparent background; 90 ms a frame; registered and credited)');
