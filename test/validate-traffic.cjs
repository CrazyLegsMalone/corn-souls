// Run from repository root: node test/validate-traffic.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const scripts=html=>[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
(async()=>{
 const loader=fs.readFileSync('test/index.html','utf8'),base=fs.readFileSync('test/game.html','utf8').replaceAll('\r\n','\n');
 let rendered='',failure='';
 const status={set textContent(v){failure=v;}};
 const ctx={console,URL,Date,encodeURIComponent,location:{protocol:'file:',hostname:''},navigator:{},
  fetch:async url=>({ok:true,text:async()=>url.startsWith('./game.html')?base:fs.readFileSync('test/'+url.slice(2).split('?')[0],'utf8'),json:async()=>JSON.parse(fs.readFileSync('test/'+url.slice(2).split('?')[0],'utf8'))}),document:{getElementById:()=>status,open(){},write(s){rendered=s;},close(){}}};
 for(const s of scripts(loader))await vm.runInNewContext(s,ctx);
 assert.ok(rendered,failure);
 for(const s of scripts(rendered))new vm.Script(s);
 new vm.Script(fs.readFileSync('test/sw.js','utf8'));
 for(const s of scripts(fs.readFileSync('test/refresh.html','utf8')))new vm.Script(s);
 assert.ok(rendered.includes('1.96.7'));
 assert.ok(!rendered.includes("navigator.serviceWorker.register('sw.js')"));
 const m=loader.match(/const trafficPatches=(.*);\r?\n  for/),patches=JSON.parse(m[1]);
 let now=1000,removed=[];
 const group=()=>({position:{x:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{y:0}});
 const state={performance:{now:()=>now},vehicles:[],NET:{host:false},scene:{remove:g=>removed.push(g)},truck:()=>group()};
 vm.createContext(state);
 vm.runInContext(patches[0][1].slice(0,patches[0][1].indexOf('let AMBIENT_TRAFFIC_T')),state);
 const recv=patches[2][1].slice(0,patches[2][1].lastIndexOf("} else if (m.t === 'w'"));
 vm.runInContext('function receive(m){if(false){'+recv+'}}',state);
 const send=(id,x,yaw=0)=>state.receive({t:'vt',v:[[id,'corn',0,0,x,0,yaw,0,0,0,0]]});
 send(1,100,Math.PI-.1);assert.equal(state.vehicles[0].g.position.x,100,'spawn at host pose');
 now=1200;send(1,108,-Math.PI+.1);
 now=1350;state.updateGuestSemis();
 assert.equal(state.vehicles[0].g.position.x,104,'midpoint interpolation');
 assert.ok(Math.abs(state.vehicles[0].g.rotation.y-Math.PI)<1e-10,'shortest turn across pi');
 now=5000;state.updateGuestSemis();assert.equal(state.vehicles[0].g.position.x,108,'packet loss holds last pose');
 send(2,700);assert.equal(state.vehicles.length,1);assert.equal(removed.length,1,'despawn removed');
 assert.equal(state.vehicles[0].g.position.x,700,'new ID never lerps from old truck');
 state.receive({t:'vt',v:[]});assert.equal(state.vehicles.length,0,'empty snapshot clears trucks');
 // Exercise the actual highway engine with lightweight Three/canvas doubles.
 const highway=JSON.parse(loader.match(/const highwayTrafficEngine=("(?:[^"\\]|\\.)*");/)[1]);
 const canvas=new Proxy({},{get:()=>()=>{}});
 const h={T:{CanvasTexture:class{},MeshBasicMaterial:class{constructor(o){Object.assign(this,o);}},PlaneGeometry:class{},Mesh:class{constructor(geo,mat){Object.assign(this,group(),{geometry:geo,material:mat,scale:{set(){}},userData:{}});}},DoubleSide:2},document:{createElement:()=>({getContext:()=>canvas})},scene:{add(){}},HWY:{k:.653,c:1/Math.hypot(1,.653),s:.653/Math.hypot(1,.653),z(x){return 434-.653*x;}}};
 vm.createContext(h);vm.runInContext(highway+'\nthis.traffic=HWY_TRAFFIC;',h);h.updateHighwayTraffic(.1);
 assert.equal(h.traffic.length,20);assert.equal(new Set(h.traffic.map(v=>v.g.geometry)).size,1);
 assert.equal(new Set(h.traffic.map(v=>v.g.material)).size,4);
 for(const v of h.traffic){const yaw=v.g.rotation.y;assert.ok(Math.abs(Math.cos(yaw)-v.dir*h.HWY.c)<1e-10);assert.ok(Math.abs(-Math.sin(yaw)+v.dir*h.HWY.s)<1e-10);}
 const yaw=h.traffic[0].g.rotation.y;h.updateHighwayTraffic(.1);assert.equal(h.traffic[0].g.rotation.y,yaw);
 assert.ok(rendered.includes("ht:+HWY_TRAFFIC_TIME.toFixed(2)"),'host clock still sent');
 assert.ok(rendered.includes("HWY_TRAFFIC_TIME=m.ht"),'guest clock still received');
 console.log('PASS: loader patches, generated JS syntax, version, semi spawn/interpolation/turn/stall/despawn, fixed highway headings, shared geometry/materials, host traffic clock.');
})().catch(e=>{console.error(e);process.exitCode=1;});
