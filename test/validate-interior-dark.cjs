// Interiors during a power outage: there is no baked light in this world, so the sky light lights a room exactly like the
// yard. Rather than tint the whole screen, each roofed building registers an envelope and its windows, and on an outage
// the interior SURFACES are dimmed per mesh - dark in the middle, brighter near a window - then restored exactly. This
// suite runs the game's own engine over a small scene to prove the numbers, the nesting and the restore.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console };
vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;

// ---------------------------------------------------------------- the source
const dataSrc = html.slice(html.indexOf('const ENCL = [];'), html.indexOf('// ---------- gray metal building'));
const dimSrc = html.slice(html.indexOf('const INTERIOR = {'), html.indexOf('// ---------- POWER OUTAGE: a real power cut.'));
assert.ok(dataSrc.includes('function enclosure(') && dataSrc.includes('function glazing('), 'the envelope model is in the game');
assert.ok(dimSrc.includes('function enclAt(') && dimSrc.includes('function interiorLight(') && dimSrc.includes('function applyInteriorDark('),
  'the dimming engine is in the game');
assert.ok(html.includes('applyInteriorDark(true);') && html.includes('applyInteriorDark(false);'), 'the outage switch drives it both ways');
assert.ok(html.includes("if (m.userData && (m.userData.gridLight || m.userData.batteryLight || m.userData.keepLit)) return;"),
  'fixtures and battery gear are left to the existing outage code');
assert.ok(html.includes('INTERIOR.walls = new Set(wallMats)') && html.includes('INTERIOR.walls.has(m)'),
  'the wall shells are skipped: setWallsSolid() owns their opacity');
assert.ok(html.includes('return 0.10 + 0.70 * d;'), 'no daylight = a tenth of the light, a window = 80%');

// ---------------------------------------------------------------- the scene: a windowless room, a windowed room, a nested room, outdoors
const scene = new T.Scene(), camera = new T.PerspectiveCamera();
const wallMats = [];
const wallMat = new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }); wallMats.push(wallMat);
const mk = (mat, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(1, 1, 1), mat); o.position.set(x, y, z); scene.add(o); return o; };
const interior = () => new T.MeshLambertMaterial({ color: 0xffffff });
const darkRoom = interior(), nearWin = interior(), deepRoom = interior(), nested = interior(), outdoor = interior(), lamp = interior();
lamp.userData.gridLight = true;
const mDark = mk(darkRoom, 0, 1, 0), mNear = mk(nearWin, 25, 1, -4.4), mDeep = mk(deepRoom, 1, 1, 4.4),
  mNested = mk(nested, 25, 1, 4.4), mOut = mk(outdoor, 60, 1, 60), mShell = mk(wallMat, 2, 1, 2), mLamp = mk(lamp, 3, 1, 3);

const ctx = { T, scene, camera, wallMats, console, Math, performance };
vm.createContext(ctx);
vm.runInContext(dataSrc + '\n' + dimSrc + '\nthis.ENCL = ENCL; this.INTERIOR = INTERIOR;', ctx);
ctx.enclosure(-5, 5, -5, 5, 4);                                   // windowless room
const lit = ctx.enclosure(20, 30, -5, 5, 4);                      // a room with one window on its north wall
ctx.glazing(lit, 25, 1.5, -5, 4);
const inner = ctx.enclosure(23, 27, 3, 5, 2.5);                   // a cupboard inside it, with no window of its own
assert.equal(ctx.ENCL.length, 3, 'three envelopes registered');

ctx.applyInteriorDark(true);
const g = o => +o.material.color.g.toFixed(2);
assert.ok(g(mDark) <= 0.11, 'a windowless room goes dark (' + g(mDark) + ')');
assert.ok(g(mNear) > 0.6, 'right at the window it stays bright (' + g(mNear) + ')');
assert.ok(g(mDeep) <= 0.11 && g(mNested) <= 0.11, 'and away from it, dark again (' + g(mNested) + ')');
assert.equal(mOut.material, outdoor, 'outdoors is untouched');
assert.equal(mShell.material, wallMat, 'the wall shell is untouched (setWallsSolid owns it)');
assert.equal(mLamp.material, lamp, 'a gridLight fixture is left to the outage code');
assert.ok(g(mNear) > g(mNested), 'the window reaches its own room, not the cupboard inside it');

// the registration work: each roofed building declares its envelope, and only windows are daylight
assert.ok(/enclosure\(x0, x1, z0, z1, h\);/.test(html), 'the generic building() registers its own envelope');
assert.ok(/for \(const \[c, ow\] of nop\) glazing\(/.test(html), 'and its door openings as daylight');
assert.ok(html.includes('enclosure(WW, EW, NZ, WZS, PH)'), 'the process building west block');
assert.ok(html.includes('enclosure(FXW, FXE, ZN, SZ, PH)'), 'the fermentation alley');
assert.ok(html.includes('enclosure(WW, EW, OZN, OZS, OH)'), 'the office block, nested inside the shed');
assert.ok(html.includes('enclosure(FXE, MX1, SZ, -10, PH)'), 'the shop floor');
assert.ok(/enclosure\(bx0 \+ GDX, bx1 \+ GDX, bz0 \+ GDZ, bz1 \+ GDZ, wallH\)/.test(html), 'the receiving building, in shifted coordinates');
assert.ok(/enclosure\(X0 \+ SH_DX, X1 \+ SH_DX, ZN, ZS, FY \+ H\)/.test(html), 'the scale house, in its shifted coordinates');
assert.ok(/glazing\(E, WINX \+ SH_DX, FY \+ 1\.65, ZN, 3\.6\)/.test(html), 'its two drive-through windows are daylight');
assert.ok(/glazing\(E, EW - 0\.135, 1\.5, OZN \+ 1\.6, 3\.6\)/.test(html), "and the office block's own windows");
assert.ok(!/glazing\([^)]*open/.test(html), 'door leaves are not treated as glazing');

// ---------------------------------------------------------------- power comes back and everything is exactly as it was
ctx.applyInteriorDark(false);
assert.equal(mDark.material, darkRoom, 'the dark room is restored');
assert.equal(mNear.material, nearWin, 'the windowed room is restored');
assert.equal(mNested.material, nested, 'the cupboard is restored');
assert.equal(ctx.INTERIOR.saved.length, 0, 'nothing is left holding a dimmed clone');
assert.equal(ctx.INTERIOR.on, false, 'the engine is off again');

ctx.applyInteriorDark(true);                                       // and it is idempotent: a second call changes nothing
const again = ctx.INTERIOR.saved.length;
ctx.applyInteriorDark(true);
assert.equal(ctx.INTERIOR.saved.length, again, 'a repeated outage call does not double-dim');

for (const script of scripts) if (script.trim()) new vm.Script(script);
console.log('PASS: interiors go dark on an outage, windows are the only daylight, nested rooms stay dark, and power restores them exactly');
