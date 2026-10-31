// Run from repository root. Exercise the LIVE launcher, not the TEST launcher.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
assert.equal(read('game.html'),read('test/game.html'),'promote the complete latest game');
assert.equal(read('sound-settings.js'),read('test/sound-settings.js'));
const loader=read('index.html'),sw=read('sw.js'),manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.id,'/corn-souls/');assert.equal(manifest.scope,'/corn-souls/');
assert.ok(loader.includes('<base href="/corn-souls/">'));
assert.ok(!loader.includes('/corn-souls/test/'));
assert.ok(loader.includes("scope:'/corn-souls/'"));
assert.ok(loader.includes("const TEST_VERSION='1.98'"));
assert.ok(loader.includes("'Alpha v\"+TEST_VERSION"));
assert.equal(JSON.parse(read('version.json')).version,'1.98');
assert.ok(sw.includes("corn-souls-live-shell-v7"));
assert.ok(sw.includes("url.pathname.startsWith(ROOT+'test/')"),'live worker excludes TEST');
assert.ok(!read('developer-inbox.html').includes('/corn-souls/test/'));
assert.ok(read('refresh.html').includes("pathname==='/corn-souls/'"),'refresh only unregisters LIVE worker');
assert.ok(!read('refresh.html').includes('corn-souls-test-shell-'));
for(const file of ['note-sharing.js','inbox.js','acid-liquid.js','cooler-door-audio.js'])assert.equal(read(file),read('test/'+file).replaceAll('/corn-souls/test/','/corn-souls/'),'shared helper '+file);
// Reuse existing behavioral coverage against the promoted root launcher and helpers.
const traffic=read('test/validate-traffic.cjs').replaceAll("'test/", "'");
vm.runInNewContext(traffic,{require,console,process,URL},{filename:'live-traffic-validation.cjs'});
// NPC preservation is relative to the promoted test build, including its intentional text fixes.
let npc=read('test/validate-npc.cjs');
npc=npc.replace(/const original=.*?;\n/,"const original=fs.readFileSync('test/game.html','utf8').replaceAll('\\r\\n','\\n');\n");
npc=npc.split('\n').filter(line=>!line.includes("'launcher unchanged'")).join('\n');
vm.runInNewContext(npc,{require,console,process,URL},{filename:'live-npc-validation.cjs'});
console.log('PASS: complete promotion, LIVE version/asset base/install identity, independent cache/refresh scope, and helper parity');
