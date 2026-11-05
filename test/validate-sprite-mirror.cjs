// Run from the test/ directory: node validate-sprite-mirror.cjs
// v1.97.161, owner: "ducks swim backwards". The ducks (and the flying vulture and the nibblers) turn to face the way they go with
// a negative sprite scale.x, which three.js ignores (its sprite shader uses the length of the scale). The game now patches the sprite
// vertex shader: a sprite whose matrix is mirrored (det < 0) reads its picture right to left. Checks the patch lands in the shader,
// the mirror test it uses (the sign of the matrix's determinant) for the cases the game has, and the ducks' facing rule.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const html = fs.readFileSync('game.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const lib = { window: {}, console }; vm.runInNewContext(scripts.find(s => s.includes('window.THREE=eu')), lib);
const T = lib.window.THREE;
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i >= 0 && j > i, 'found ' + a.slice(0, 50)); return html.slice(i, j); };
const before = T.ShaderLib.sprite.vertexShader;
assert.ok(!before.includes('SPRITE_MIRROR') && /length\( modelMatrix\[ 0 \]\.xyz \)/.test(before), 'stock three.js: the sprite scale is a length (the sign is lost) - the reason for the patch');
const ctx = { T }; vm.createContext(ctx);
vm.runInContext(cut('const SPRITE_MIRROR = (function () {', '// ducks on the ponds:') + '\nthis.SPRITE_MIRROR = SPRITE_MIRROR;', ctx);
const vs = T.ShaderLib.sprite.vertexShader;
assert.equal(ctx.SPRITE_MIRROR, true, 'the patch applied');
const i0 = vs.indexOf('#include <uv_vertex>'), i1 = vs.indexOf('SPRITE_MIRROR'), i2 = vs.indexOf('vec2 scale = vec2(');
assert.ok(i0 > 0 && i1 > i0 && i1 < i2, 'right after the uv is set, before the quad is built');
assert.ok(vs.includes('if ( dot( cross( modelMatrix[ 0 ].xyz, modelMatrix[ 1 ].xyz ), modelMatrix[ 2 ].xyz ) < 0.0 ) vMapUv = ( mapTransform * vec3( 1.0 - MAP_UV.x, MAP_UV.y, 1.0 ) ).xy;'), 'a mirrored sprite reads its picture right to left (the quad is not flipped: that would cull it)');
assert.ok(vs.includes('vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );'), 'the quad size is left as it was');
vm.runInContext(cut('const SPRITE_MIRROR = (function () {', '// ducks on the ponds:'), vm.createContext({ T }));
assert.equal(T.ShaderLib.sprite.vertexShader.split('SPRITE_MIRROR').length, 2, 'patched once, however often it runs');
// the mirror test the shader makes, on the game's cases
const det = o => { o.updateMatrixWorld(true); const e = o.matrixWorld.elements, a = new T.Vector3(e[0], e[1], e[2]), b = new T.Vector3(e[4], e[5], e[6]), c = new T.Vector3(e[8], e[9], e[10]); return a.cross(b).dot(c); };
{ const s = new T.Sprite(); s.scale.set(0.75, 0.56, 1); assert.ok(det(s) > 0, 'a duck going right: not mirrored'); s.scale.x = -0.75; assert.ok(det(s) < 0, 'going left: mirrored'); }
{ const g = new T.Group(), s = new T.Sprite(); g.add(s); g.rotation.y = 2.1; g.position.set(5, 0, 3); s.scale.set(-0.62, 0.5, 1); assert.ok(det(s) < 0, 'a nibbler flipped inside its turning group: mirrored'); s.scale.x = 0.62; assert.ok(det(s) > 0, 'and not when it faces right'); }
// the ducks' rule: positive scale when swimming to the right on screen (the picture's bill points right)
const duck = cut('function updateDucks(dt) {', 'let WIND = {');
assert.ok(duck.includes('d.s.scale.x = (wx * right.x + wz * right.z >= 0 ? 1 : -1) * 0.75;'), 'the ducks pick their side from the way they swim against the camera\'s right');
assert.ok(/c\.fillStyle = '#f2a900'; c\.beginPath\(\); c\.moveTo\(108, 32\); c\.lineTo\(126, 38\)/.test(html), 'and the drawn duck\'s bill is on the right of its picture');
assert.ok(html.includes('sp.scale.x = (c.dir.x * r.x + c.dir.z * r.z >= 0 ? 1 : -1) * 0.3;') && html.includes('c.ellipse(96, 28, 13, 7, 0, 0, Math.PI * 2); c.fill();                                   // head'), 'the wall lizards: same rule, head drawn on the right');
console.log('PASS: sprite mirror (three.js drops the sign of a sprite\'s scale; patched so a mirrored sprite shows its picture flipped - the ducks swim bill first, lizards run head first, the vulture and nibblers face the way they go)');
