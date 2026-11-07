const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('game.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const lib={window:{},console};vm.runInNewContext(scripts.find(s=>s.includes('window.THREE=eu')),lib);const T=lib.window.THREE;
const ctx={T,O:{},NH3:{x:35.3,z:-48.5,R:1.37,L:10.6},E1:0,EZ1:100,extraCols:[],scene:new T.Scene(),clock:0,WIND:{mph:8,from:180}};
ctx.mat=c=>new T.MeshLambertMaterial({color:c});
ctx.cyl=(r,h,m,x,y,z)=>{const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,10),m);mesh.position.set(x,y+h/2,z);ctx.scene.add(mesh);};
ctx.box=(w,h,d,m,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);ctx.scene.add(mesh);};
vm.createContext(ctx);
const padEnd=html.indexOf('PZ1 + 4); }');   // the wet cake pad block's own closing brace (v1.97.173)
const build=html.slice(html.indexOf('    O.windsocks = []'),padEnd+11);
vm.runInContext(build,ctx);
assert.equal(ctx.O.windsocks.length,2);assert.equal(ctx.O.windsock,ctx.O.windsocks[0]);
const [cake,ammonia]=ctx.O.windsocks;
assert.deepEqual(Array.from(cake.piv.position.toArray()),[-71,6,103]);
assert.deepEqual(Array.from(ammonia.piv.position.toArray()),[41.23,6.25,-58.32],'v1.97.36: the sock head where the owner put it (Lesion Toolbox)');
assert.equal(ctx.extraCols.length,2,'both poles have collision');
assert.notEqual(cake.piv,ammonia.piv);assert.notEqual(cake.segs[0],ammonia.segs[0]);
assert.equal(ammonia.segs.length,5);
for(let i=0;i<5;i++){
 const a=cake.segs[i].children.find(x=>x.isMesh),b=ammonia.segs[i].children.find(x=>x.isMesh);
 assert.deepEqual(a.geometry.parameters,b.geometry.parameters);assert.equal(a.material.color.getHex(),b.material.color.getHex());
}
vm.runInContext(html.slice(html.indexOf('function updateWindsock(dt)'),html.indexOf('function inPond(')),ctx);
for(const mph of [0,8,25])for(const from of [0,90,180,270,359,1]){
 ctx.WIND={mph,from};
 for(let i=0;i<300;i++){ctx.clock+=1/60;ctx.updateWindsock(1/60);}
 assert.equal(cake.yaw,ammonia.yaw);assert.equal(cake.piv.rotation.y,ammonia.piv.rotation.y);
 const want=Math.atan2(Math.sin((from+180)*Math.PI/180),-Math.cos((from+180)*Math.PI/180));
 assert.ok(Math.abs(Math.atan2(Math.sin(want-ammonia.yaw),Math.cos(want-ammonia.yaw)))<.01,'points downwind');
 for(const sock of ctx.O.windsocks)for(const seg of sock.segs)assert.ok(Number.isFinite(seg.rotation.x)&&Number.isFinite(seg.rotation.y));
}
ctx.WIND.mph=0;ctx.updateWindsock(1/60);const calm=ammonia.segs[0].rotation.x;
ctx.WIND.mph=25;ctx.updateWindsock(1/60);assert.ok(calm>ammonia.segs[0].rotation.x,'calm sock droops more');
assert.ok(Math.abs(ammonia.piv.position.x-ctx.NH3.x)>ctx.NH3.R+2.3,'sock swing clears tank');
// v1.97.173, owner: "wetcake pads needs walls on the south and east side matching the north wall". The pad had one 2.2 m push
// wall on its north side; the south side and the east end now carry the same wall (same height, thickness and material).
{ const wallCol = new T.Color(0x9aa1a8).getHex();
  const walls = ctx.scene.children.filter(o => o.material && o.material.color && o.material.color.getHex() === wallCol
    && o.geometry && o.geometry.type === 'BoxGeometry' && Math.abs(o.geometry.parameters.height - 2.2) < 1e-9);
  assert.equal(walls.length, 3, 'three push walls: north, south and east');
  const P0 = ctx.E1 - 67, PZ0 = ctx.EZ1 + 2, PZ1 = PZ0 + 24, mid = (P0 + ctx.E1) / 2, cz = (PZ0 + PZ1) / 2;
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  const north = walls.find(o => near(o.position.z, PZ0 + 0.2)), south = walls.find(o => near(o.position.z, PZ1 - 0.2)), east = walls.find(o => near(o.position.x, ctx.E1 - 0.2));
  assert.ok(north && south && east, 'one on each of the three sides');
  for (const [w, name] of [[north, 'north'], [south, 'south']])
    assert.ok(near(w.geometry.parameters.width, 67) && near(w.geometry.parameters.depth, 0.4) && near(w.position.x, mid) && near(w.position.y, 1.1),
      'the ' + name + ' wall is the north wall\'s twin: 67 x 2.2 x 0.4 on the pad centreline');
  assert.ok(near(east.geometry.parameters.width, 0.4) && near(east.geometry.parameters.depth, 24) && near(east.position.z, cz) && near(east.position.y, 1.1),
    'and the east wall is the same wall turned along the 24 m end');
  for (const w of walls) assert.equal(w.material.color.getHex(), north.material.color.getHex(), 'all three are the same concrete'); }
for(const script of scripts)if(script.trim())new vm.Script(script);
console.log('PASS: two identical windsocks, original position/collision preserved, ammonia clearance, live wind direction, speed/droop and script syntax');
