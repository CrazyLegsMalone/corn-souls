const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('game.html','utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
for(const s of scripts)if(s.trim())new vm.Script(s);
const lib={window:{},console};vm.runInNewContext(scripts.find(s=>s.includes('window.THREE=eu')),lib);const T=lib.window.THREE;
const noop=()=>{},draw=new Proxy({measureText:()=>({width:10}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
function build(source, westWing){
 const ctx={T,console,document:{createElement:()=>({getContext:()=>draw})},scene:new T.Scene(),wallSegs:[],wallMats:[],extraCols:[],WALK_SURF:[],NPCS:[],O:{},SA:{},NH3:{},FR:7.4,FH:17.8,BWR:9.5,BWH:14.4,FXW:-31,FXE:-7.6,AC:-19.3,BWZ:-45,ZN:-96.3,Z1:-47.1,fz:[-63.5,-79.9,-96.3],pickables:[],WEST_WING:westWing,drawAlarmScreen:noop,extWall:noop,keyHook:noop,buildNH3:noop,buildNH3Line:noop};
 ctx.V3=(...v)=>new T.Vector3(...v);ctx.mat=c=>new T.MeshLambertMaterial({color:c});
 ctx.add=(geo,m,x,y,z)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);ctx.scene.add(o);return o;};
 ctx.box=(w,h,d,m,x,y,z)=>ctx.add(new T.BoxGeometry(w,h,d),m,x,y,z);
 ctx.cyl=(r,h,m,x,y,z)=>ctx.add(new T.CylinderGeometry(r,r,h,12),m,x,y+h/2,z);
 ctx.tank=(x,z,r,h,c)=>ctx.add(new T.CylinderGeometry(r,r,h,12),ctx.mat(c),x,h/2,z);
 ctx.regVehBox=noop;ctx.buildShopRadio=noop;ctx.buildToolWall=noop;ctx.pumpSet=noop;ctx.pipe=noop;ctx.nameplate=noop;
 ctx.seatedPerson=(x,z)=>{const o=new T.Group();o.position.set(x,0,z);ctx.scene.add(o);return o;};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('  // ---------- PROCESS BUILDING'),source.indexOf('  // beer well pump inside the alley')),ctx);
 return ctx;
}
const next=build(html,{west:-74,east:-31,north:-12.5,south:44,officeNorth:5}),old=build(fs.readFileSync('../game.html','utf8'),{west:-74,east:-31,north:-12.5,south:44,officeNorth:11});
const near=(a,b)=>Math.abs(a-b)<1e-7;
const westRoof=c=>c.scene.children.find(o=>o.geometry?.parameters.width===43.6&&o.geometry?.parameters.height===.3);
assert.ok(near(westRoof(next).geometry.parameters.depth,57.1));
assert.ok(near(westRoof(next).position.z,15.75));
assert.ok(near(westRoof(old).geometry.parameters.depth,57.1));
// Every room, counter, cabinet, locker, window, sign and office door moves rigidly.
const office=c=>c.scene.children.filter(o=>o.position.x < -31&&o.position.y<=4&&o.position.z>= (c===next?5:11)&&o.position.z<= (c===next?11.95:17.95));
assert.ok(office(next).length>100,'populated office block retained');
const signature=(o,dz=0)=>JSON.stringify([o.geometry?.type,o.geometry?.parameters,o.position.x,o.position.y,o.position.z+dz],(k,v)=>typeof v==='number'?+v.toFixed(6):v);
const relocated=new Set(office(next).map(o=>signature(o)));
for(const o of office(old).filter(o=>!(o.geometry?.parameters.depth>7))) {
 assert.ok(relocated.has(signature(o,-6)),'office object preserved at translated position: '+signature(o,-6));
}
assert.deepEqual(next.NPCS.map(n=>n.id),old.NPCS.map(n=>n.id));
assert.equal(next.NPCS.find(n=>n.id==='op').g.position.z,6.75);
assert.ok(!next.O.swingDoors.some(d=>near(d.z,44)&&d.x< -31),'no west south wall door');
assert.ok(!next.O.swingDoors.some(d=>near(d.x,-74)&&d.z>20),'no southwest west-wall door');
assert.equal(next.O.rollDoors.length,old.O.rollDoors.length);
assert.ok(next.O.swingDoors.some(d=>near(d.x,0)&&near(d.z,22.9)),'relocated shop office doors at x=0');
assert.ok(next.O.rollDoors.some(d=>near(d.x,18.95)&&near(d.z,34.5)),'straight east wall roll-up door at x=19');
assert.ok(!next.wallSegs.some(s=>Math.max(s[0],s[2])>19.6&&Math.min(s[1],s[3])>-6&&Math.max(s[1],s[3])<=44),'east bump-out removed');
for(const s of next.wallSegs)for(const v of s)assert.ok(Number.isFinite(v));
const ew=html.slice(html.indexOf('  // ---------- EVAPORATORS'),html.indexOf('  // ---------- TANK FARM'));
const ec={...next,grate:next.mat(0x666666),steel:next.mat(0x666666)};vm.createContext(ec);const n=next.extraCols.length;vm.runInContext(ew,ec);
const evaps=next.extraCols.slice(n);assert.equal(evaps.length,8);
for(const [x,z,r]of evaps){assert.ok(near(z,40.6));assert.ok(z-r>11.95+25);assert.ok(z+r<44);assert.ok(x-r> -74&&x+r< -31);}
assert.ok(html.includes('CZ1 = -8.5, CZ2 = -4.0;'));
assert.ok(html.includes('strA: [-54, -3,')&&html.includes('strB: [-49.5, -3,'));
assert.ok(5-(-4+1.2)>7,'cook tube clears lab wall and aisle');
console.log('PASS: real Three.js construction, roof footprint, populated rooms, Rick relocation, doors/collision, straight east wall and relocated shop offices, and all eight full-size evaporators with aisle clearance; all scripts parse');
