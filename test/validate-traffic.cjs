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
 // First-person items must use the post-world pass even when the shotgun is hidden.
 const initHeld=rendered.split('\n').find(line=>line.includes('if (!heldG.squeegee)'));
 const makeHeld=()=>({visible:false,parent:'world-camera',position:{x:.1,y:-.2,z:-.6}});
 const hudState={heldG:{},TOOLS:{crowbar:{}},hudScene:{add(item){item.parent=this;}},
  makeSqueegee:makeHeld,makeHand:makeHeld,makeWasher:makeHeld,makeTool:makeHeld,makeExtHud:makeHeld};
 vm.runInNewContext(initHeld,hudState);
 assert.ok(Object.values(hudState.heldG).every(item=>item.parent===hudState.hudScene),'all held groups removed from world pass');
 assert.equal(hudState.heldG.crowbar.position.z,-.6,'reparenting preserves local pose');
 const calls=[],chain={copy(){return this;},sub(){return this;},normalize(){return this;},applyQuaternion(){return this;},invert(){return this;}};
 const light=()=>({color:{copy(){}},intensity:1,position:{copy(){}},target:{position:{set(){}}}});
 const hudRender={gun:{visible:false},heldG:hudState.heldG,SR:{carry:null},hudScene:hudState.hudScene,
  hudCam:{updateProjectionMatrix(){}},camera:{aspect:1,view:null,quaternion:{}},hudHemi:light(),hudSun:light(),hemi:light(),sunL:light(),tv:chain,tq:chain,
  renderer:{autoClear:true,clearDepth(){calls.push('clearDepth');},render(scene){calls.push(scene===hudState.hudScene?'hud':'world');}}};
 const drawStart=rendered.indexOf('function drawHudGun() {'),drawEnd=rendered.indexOf('\nconst tq =',drawStart);
 vm.runInNewContext(rendered.slice(drawStart,drawEnd)+'\nthis.draw=drawHudGun;',hudRender);
 for(const name of ['crowbar','hand','squeegee','ext']){
  calls.length=0;Object.values(hudRender.heldG).forEach(item=>item.visible=false);hudRender.heldG[name].visible=true;
  hudRender.renderer.render('world');hudRender.draw();assert.equal(calls.join(','),'world,clearDepth,hud',name+' renders after complete world');
  assert.equal(hudRender.renderer.autoClear,true,'renderer state restored');
 }
 Object.values(hudRender.heldG).forEach(item=>item.visible=false);calls.length=0;hudRender.draw();assert.equal(calls.length,0,'hidden first-person items do not draw');
 const boostStart=rendered.indexOf('  const boosting = !!(!u.noNos'),boostEnd=rendered.indexOf('  const MAXF =',boostStart);
 const boost={u:{noNos:false,nos:0,boosting:false},I:{nos:true,b:0},fs:10,dt:1/60,utvWhoosh(){}};
 vm.createContext(boost);const tickBoost=new vm.Script('{'+rendered.slice(boostStart,boostEnd)+'}');
 for(let frame=0;frame<10000;frame++)tickBoost.runInContext(boost);
 assert.equal(boost.u.nos,1,'turbo never depletes');assert.equal(boost.u.boosting,true,'turbo works from empty reserve');
 boost.I.nos=false;tickBoost.runInContext(boost);assert.equal(boost.u.boosting,false,'release stops boost');
 boost.I.nos=true;boost.I.b=1;tickBoost.runInContext(boost);assert.equal(boost.u.boosting,false,'brake restriction retained');
 boost.I.b=0;boost.fs=-1;tickBoost.runInContext(boost);assert.equal(boost.u.boosting,false,'reverse restriction retained');
 boost.fs=10;boost.u.noNos=true;tickBoost.runInContext(boost);assert.equal(boost.u.boosting,false);assert.equal(boost.u.nos,0,'non-turbo vehicle stays ineligible');
 new vm.Script(fs.readFileSync('test/sw.js','utf8'));
 for(const s of scripts(fs.readFileSync('test/refresh.html','utf8')))new vm.Script(s);
 assert.ok(rendered.includes(loader.match(/const TEST_VERSION='([^']+)'/)[1]));
 const plantExport=rendered.indexOf('root.Plant3D = {');
 assert.ok(rendered.indexOf('function saLiquidMesh(')<plantExport,'acid helper is inside plant scope');
 assert.ok(rendered.indexOf('function coolerDoorSound(')<plantExport,'door audio is inside plant scope');
 // Execute the actual generated acid helper + caller together in an isolated
 // plant closure; parsing helpers separately failed to catch the v1.96.18 bug.
 const acidStart=rendered.indexOf('function saLiquidPaintHit('),acidEnd=rendered.indexOf('// ---------- ANHYDROUS AMMONIA TANK',acidStart);
 const acidCode=rendered.slice(acidStart,acidEnd);
 const world={window:{},console};vm.runInNewContext(scripts(base).find(s=>s.includes('window.THREE=eu')),world);
 const AT=world.window.THREE,acidState={T:AT,V3:(x,y,z)=>new AT.Vector3(x,y,z),SA:{R:1.25,L:6.6,x:36,z:100,cy:2.25,level:1,leaks:[],alarm:false},
  held:'crowbar',COOL_NOTIFY:null,scene:new AT.Scene(),netSend(){},document:{createElement:()=>({getContext:()=>({fillRect(){}})})}};
 // SA is normally declared outside this extracted block, inside Plant3D.
 const callerStart=acidCode.indexOf('function saHit('),callerEnd=acidCode.indexOf('function saPatch()');
 vm.runInNewContext('(function(){'+acidCode.slice(0,callerStart)+acidCode.slice(callerStart,callerEnd)+'this.hit=saHit;}).call(this);',acidState);
 assert.equal(acidState.hit(new AT.Vector3(37.25,2.25,100)),true);
 assert.equal(acidState.SA.leaks.length,1,'real caller resolves helper and creates liquid mesh');
 const doorStart=rendered.indexOf('function coolerHandle(remote) {'),doorEnd=rendered.indexOf('function coolerBeep(',doorStart);
 const sounds=[],door={i:0,want:0,open:0};
 const doorState={O:{coolerDoors:[door]},coolerDoorSound:(d,kind)=>sounds.push(kind),netSend(){}};
 vm.runInNewContext(rendered.slice(doorStart,doorEnd)+'this.handle=coolerHandle;',doorState);
 doorState.handle({i:0,o:1});doorState.handle({i:0,o:1});doorState.handle({i:0,o:0});
 assert.equal(sounds.join(','),'open,swing','one sound per target transition, including remote action');
 const doorMotion=rendered.split('\n').find(line=>line.includes('const previousOpen=d.open;'));
 const motion={d:door,dt:1/60,openSum:0,coolerDoorSound:doorState.coolerDoorSound};door.open=1;
 vm.createContext(motion);const doorTick=new vm.Script('{'+doorMotion+'}');for(let i=0;i<120;i++)doorTick.runInContext(motion);
 assert.equal(sounds.join(','),'open,swing,close','closing seal plays once at full closure');
 assert.ok(rendered.includes('if (!B.remote) { nh3Hit(h.point);saLiquidPaintHit(h.point); }'),'only originating paintballs create/broadcast acid leaks');
 assert.ok(rendered.includes("['Sound ▸',()=>soundSettings()]"));
 assert.ok(rendered.includes("const music = $('music'); music.volume=soundMusicVolume();"),'saved volume applied before first track');
 assert.ok(rendered.includes('✉ Message Developer'));
 assert.ok(!rendered.includes('<h1>Leave a note</h1>'));
 assert.ok(rendered.includes("['Weather ▸',()=>debugWeather(code)]"));
 assert.ok(!rendered.includes("['Weather: sunny', () => set('sunny')]"),'weather options moved out of Debug');
 assert.ok(rendered.includes('Back to game ×'),'all modals have visible escape action');
 assert.ok(rendered.includes("$('csModalExit').onclick = () => inboxClose()"));
 assert.ok(!rendered.includes("['📬 Read notes ("),'old local reader removed from Debug');
 assert.ok(rendered.includes("if (n === 'B' || n === 'START') { inboxClose();return; }"),'controller exit invalidates pending requests');
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
 console.log('PASS: first-person HUD pass/visibility/state, loader patches, generated JS syntax, version, semi spawn/interpolation/turn/stall/despawn, fixed highway headings, shared geometry/materials, host traffic clock.');
})().catch(e=>{console.error(e);process.exitCode=1;});
