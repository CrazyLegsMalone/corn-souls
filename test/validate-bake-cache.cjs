// Run from the test/ directory: node validate-bake-cache.cjs
// Guards TEST v1.97.58 (owner: "Let's check and see if the code can be improved for better performance. It's still very choppy
// at the beginning."): the minimap and roof-height map are baked (whole-plant tile renders, ~20 extra shaders) only on the first
// start of a version, saved in IndexedDB per version and channel, and loaded on later starts with no bake; and models loaded
// after the start compile their shaders (compileAsync) before they are added to the world.
const fs = require('fs'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
assert.ok(html.includes("function bakeKey(name) { return name + '@' + BAKE.chan + '@' + (window.APP_VERSION || '?'); }"), 'saved per version');
assert.ok(/chan: \(typeof location !== 'undefined' && \/\\\/test\\\/\/\.test\(location\.pathname\)\) \? 'test' : 'live'/.test(html), 'TEST and LIVE kept apart (same origin)');
assert.ok(/function bakeGet\(name\)[\s\S]{0,400}res\(null\)/.test(html), 'a failed lookup just bakes as before');
// roof map
assert.ok(html.includes("bakeGet('roof').then(v => {") && html.includes("if (v && v.h && v.h.length === v.nx * v.nz && ROOFMAP.again === 0)"), 'roof map restored when it fits');
assert.ok(html.includes("ROOFMAP.tops = roofMapTops(v.cell); ROOFMAP.again = -1;"), 'and no rebuilds follow');
assert.ok(html.includes("if (ROOFMAP.again === -1 && ROOFMAP.cache !== 'hit' && typeof bakePut === 'function') bakePut('roof',"), 'only the late (complete) rebuild is saved');
// minimap
assert.ok(html.includes("bakeGet('mmap').then(mmapFromCache)") && html.includes("createImageBitmap(new Blob([v.png], { type: 'image/png' }))"), 'minimap restored from its PNG');
assert.ok(html.includes("Object.assign(MMAP, { cv, x0: v.x0, z0: v.z0, mpp: v.mpp, W: v.W, H: v.H }); MMAP.bakes = 2;"), 'counts as fully baked');
assert.ok(/if \(MMAP\.bakes >= 2 && !\(MMAP\.again > 0\) && MMAP\.cache !== 'hit'[^\n]*bakePut\('mmap'/.test(html), 'only the late minimap bake is saved');
assert.ok(html.includes("else if (MMAP.cache !== 'wait') { mmapGuard(mmapBakeStart); MMAP.again = 14; }"), 'no bake while the lookup is out');
// shader warm-up
const lg = html.slice(html.indexOf('function loadGlbModel('), html.indexOf('function loadGlbModel(') + 2500);
assert.ok(/renderer\.compileAsync\(r\.root, camera, scene\)\.then\(go, go\); setTimeout\(go, 1500\);/.test(lg), 'late models compile their shaders before they are added');
assert.ok(/try \{ onReady\(r\); \} catch \(err\) \{ console\.warn/.test(lg), 'a failing model is still reported, not lost in a promise');
console.log('PASS: bake cache (minimap + roof map once per version, then loaded) and shader warm-up for late models');
