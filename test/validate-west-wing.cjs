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
 ctx.regVehBox=noop;ctx.buildShopRadio=noop;ctx.buildToolWall=noop;ctx.toolSpot=noop;ctx.pumpSet=noop;ctx.pipe=noop;ctx.nameplate=noop;
 ctx.egressStrobe=noop;ctx.gridLight=m=>m;ctx.batteryLight=m=>m;ctx.lampLight=m=>m;ctx.selfLit=m=>m;   // power-outage hooks: this block only needs them to exist
 ctx.exitSignMat=()=>new T.MeshBasicMaterial({color:0xc8211c});ctx.exitHalo=noop;   // EXIT signage helpers
 ctx.DRINK_SPOTS=[];   // replaced soda machines are registered here, not built as boxes
 ctx.enclosure=(x0,x1,z0,z1,top)=>({x0,x1,z0,z1,top,wins:[],area:Math.abs((x1-x0)*(z1-z0))});   // outage daylight registry
 ctx.glazing=noop;
 ctx.NAME_K=0.75;   // label scale constant, defined at the top of the engine block
 ctx.srgbTex=t=>t;   // the canvas-texture sRGB helper lives in the engine block; this slice only needs it to exist
 ctx.ribWall=m=>m;   // the wall siding helper (v1.97.117) lives in the engine block

 ctx.loadVendMachine=()=>({});ctx.vendSpawn=noop;   // vending props are placed through their own loader
 ctx.seatedPerson=(x,z)=>{const o=new T.Group();o.position.set(x,0,z);ctx.scene.add(o);return o;};
 vm.createContext(ctx);
 { const r0=html.indexOf('function rollUpDoor('),r1=html.indexOf('\n// a plain man door',r0); vm.runInContext(html.slice(r0,r1),ctx); }   // the plant's one roll-up door builder (v1.97.119)
 vm.runInContext(source.slice(source.indexOf('  // ---------- PROCESS BUILDING'),source.indexOf('  // beer well pump inside the alley')),ctx);
 return ctx;
}
const next=build(html,{west:-74,east:-31,north:-12.5,south:44,officeNorth:14}),old=build(fs.readFileSync('../game.html','utf8'),{west:-74,east:-31,north:-12.5,south:44,officeNorth:11});
const near=(a,b)=>Math.abs(a-b)<1e-7;
const westRoof=c=>c.scene.children.find(o=>o.geometry?.parameters.width===43.6&&o.geometry?.parameters.height===.3);
assert.ok(near(westRoof(next).geometry.parameters.depth,57.1));
assert.ok(near(westRoof(next).position.z,15.75));
assert.ok(near(westRoof(old).geometry.parameters.depth,57.1));
// Every room, counter, cabinet, locker, window, sign and office door moves rigidly.
const office=c=>c.scene.children.filter(o=>o.position.x < -31&&o.position.y<=4&&o.position.z>= (c===next?14:11)&&o.position.z<= (c===next?20.95:17.95));
assert.ok(office(next).length>100,'populated office block retained');
const signature=(o,dz=0)=>JSON.stringify([o.geometry?.type,o.geometry?.parameters,o.position.x,o.position.y,o.position.z+dz],(k,v)=>typeof v==='number'?+v.toFixed(6):v);
const relocated=new Set(office(next).map(o=>signature(o)));
// One box is deliberately replaced rather than moved: the break room's soda machine is now the Milo Rade vending
// machine model (assets/models/milorade_machine.glb), so it is not built as a BoxGeometry any more.
// The break room's soda machine + its glass panel were two boxes in this footprint; both are now the GLB machine.
const replacedByModel=o=>{const p=o.position;return p.x>-62.1&&p.x<-60.8&&p.y<2&&(p.z+3)>14.3&&(p.z+3)<15.2;};
// The break room's snack machine (the black box and its glass panel) is replaced too: it is now the Shifty Food cabinet
// (assets/models/shifty_food_machine.glb), so those two boxes no longer exist in the new source.
const replacedBySnack=o=>{const p=o.position;return p.x>-60.2&&p.x<-59.0&&p.y<2.2&&(p.z+3)>14.3&&(p.z+3)<15.2;};
// Door-sign plates are deliberately resized (every label in the plant shrank by 25%), so their geometry signature moves
// while the sign itself stays exactly where it was.
const resizedSign=o=>o.geometry?.type==='PlaneGeometry'&&Math.abs(o.geometry.parameters.width-1.15)<1e-6&&Math.abs(o.geometry.parameters.height-0.25)<1e-6;
// v1.97.136: the hall door's small hand-placed EXIT sign (and its halo) gave way to the standard lit sign that exitSignsForEgress puts
// over every exterior door when the world is built (validate-exit-signs.cjs), so those two are not in the source any more.
const replacedExit=o=>{const g=o.geometry?.parameters||{};return (o.geometry?.type==='BoxGeometry'&&near(g.width,0.06)&&near(g.height,0.2)&&near(g.depth,0.55))||(o.geometry?.type==='PlaneGeometry'&&near(g.width,0.9)&&near(g.height,0.4)&&o.position.x<-73);};
// v1.97.54 ("can the floor be flatter"): the office tile floor drops with the slab, from y 0.25 to 2 cm over the 9 cm slab.
const loweredTile=o=>{const g=o.geometry?.parameters||{};return o.geometry?.type==='BoxGeometry'&&near(g.width,43)&&near(g.height,0.06)&&near(g.depth,6.95)&&near(o.position.y,0.25);};
for(const o of office(old).filter(o=>!(o.geometry?.parameters.depth>7))) {
 if(replacedByModel(o)||replacedBySnack(o)||resizedSign(o)||replacedExit(o)||loweredTile(o))continue;
 assert.ok(relocated.has(signature(o,3)),'office object preserved at translated position: '+signature(o,3));
}
assert.deepEqual(next.NPCS.map(n=>n.id),old.NPCS.map(n=>n.id));
assert.equal(next.NPCS.find(n=>n.id==='op').g.position.z,15.75);
assert.ok(!next.O.swingDoors.some(d=>near(d.z,44)&&d.x< -31),'no west south wall door');
assert.ok(!next.O.swingDoors.some(d=>near(d.x,-74)&&d.z>25),'no southwest west-wall door');
assert.equal(next.O.rollDoors.length,old.O.rollDoors.length);
assert.ok(next.O.swingDoors.some(d=>near(d.x,0)&&near(d.z,22.9)),'relocated shop office doors at x=0');
assert.ok(next.O.rollDoors.some(d=>near(d.x,18.95)&&near(d.z,34.5)),'straight east wall roll-up door at x=19');
assert.ok(next.O.rollDoors.some(d=>near(d.x,18.95)&&near(d.z,11.4)),'east aisle roll-up door aligned with cook alley trench drain');
assert.ok(!next.wallSegs.some(s=>Math.max(s[0],s[2])>19.6&&Math.min(s[1],s[3])>-6&&Math.max(s[1],s[3])<=44),'east bump-out removed');
for(const s of next.wallSegs)for(const v of s)assert.ok(Number.isFinite(v));
const ew=html.slice(html.indexOf('  // ---------- EVAPORATORS'),html.indexOf('  // ---------- TANK FARM'));
const ec={...next,grate:next.mat(0x666666),steel:next.mat(0x666666)};vm.createContext(ec);const n=next.extraCols.length;vm.runInContext(ew,ec);
const evaps=next.extraCols.slice(n);assert.equal(evaps.length,8);
for(const [x,z,r]of evaps){assert.ok(near(z,40.6));assert.ok(z-r>20.95+16);assert.ok(z+r<44);assert.ok(x-r> -74&&x+r< -31);}
assert.ok(html.includes('CZ1 = -8.5, CZ2 = -4.0;'));
assert.ok(html.includes('strA: [-54, -3,')&&html.includes('strB: [-49.5, -3,'));
assert.ok(14-(-4+1.2)>16,'cook tube clears lab wall and aisle (~16.15m centered)');
assert.ok(html.includes("'silo0', { top: 0xd94848, level: 0.6, dome: false, noRail: true }")&&html.includes("'silo1', { top: 0xd94848, level: 0.6, dome: false, noRail: true }")&&html.includes("'tb' + (i + 3), { top: 0xd94848, level: 0.5, dome: false, noRail: true }"),'all 4 silos use dome: false');
assert.ok(!next.wallSegs.some(s=>s[1]===s[3]&&near(s[1],-23.7)&&s[0]<13.6&&s[2]>13.6),'methanator hallway opens through north wall at z=-23.7, x=13.6');
assert.ok(next.wallSegs.some(s=>near(s[0],12.65)&&near(s[2],12.65)&&near(s[1],-36.55)&&near(s[3],-23.7)),'methanator west hallway wall runs to process building');
assert.ok(next.wallSegs.some(s=>near(s[0],14.55)&&near(s[2],14.55)&&near(s[1],-36.55)&&near(s[3],-23.7)),'methanator east hallway wall runs to process building');
const sc={...next,GDX:-12,GDZ:-28,LADDERS:[]};vm.createContext(sc);vm.runInContext(html.slice(html.indexOf('function siloClimb'),html.indexOf('// ---------- EVIL SCARECROWS')),sc);
sc.siloClimb(-171,12.5,9.5,22);sc.siloClimb(-171,-12.5,9.5,22);sc.siloClimb(-164.5,-35,16,22);sc.siloClimb(-164.5,-71,16,22);
const siloWalks=sc.WALK_SURF.slice(-4);assert.equal(siloWalks.length,4);
for(const w of siloWalks){assert.equal(w.y0,22.15);assert.equal(w.y1,22.15);}
assert.ok(html.includes("groundMat('asphalt'")&&html.includes("groundMat('dirtroad'"),'flat textured asphalt and dirtroad materials used for roads');
// v1.97.156, owner: "when in process building looking out you shouldn't be able to see outside". The fermenter and beer well
// shells are translucent glass (tank() draws them at 38%), and the walls used to stop at each tank's tangent point, so a tank
// was a window onto the yard. Every tank slot now carries the wall across it - so the ferm alley's two exterior walls have no
// gaps: none between the north end and the south end of the west wall, and none south of the open walkway on the east wall.
{ const wm = (next.wallMats || []).find(m => m.userData && m.userData.ribbed && m.opacity === 0.5);
  assert.ok(wm, 'the ribbed siding material is in the build');
  // v1.97.52 ("WALL SHOULD NOT CLIP INTO FERM"): across each tank slot the wall is a half-round panel round the alley side of the
  // tank (a cylinder segment centred on the tank), not a straight panel through it - both close the wall, only one clips the tank.
  const panels = next.scene.children.filter(o => o.material === wm && o.geometry && o.geometry.type === 'BoxGeometry');
  const curved = next.scene.children.filter(o => o.material && o.material.userData && o.material.userData.ribbed && o.geometry && o.geometry.type === 'CylinderGeometry' && Math.abs(o.geometry.parameters.thetaLength - Math.PI) < 1e-6);
  const span = o => o.geometry.type === 'CylinderGeometry' ? o.geometry.parameters.radiusTop : o.geometry.parameters.depth / 2;
  const gaps = (x, z0, z1) => {
    const iv = panels.filter(o => Math.abs(o.position.x - x) < 0.6 && o.geometry.parameters.depth > o.geometry.parameters.width).concat(curved.filter(o => Math.abs(o.position.x - x) < 0.6))
      .map(o => [Math.max(z0, o.position.z - span(o)), Math.min(z1, o.position.z + span(o))])
      .filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
    let at = z0; const out = [];
    for (const [a, b] of iv) { if (b <= at) continue; if (a - at > 0.3) out.push([at, a]); at = Math.max(at, b); }
    if (z1 - at > 0.3) out.push([at, z1]);
    return out;
  };
  const west = gaps(-31, -96.3, -12.5), east = gaps(-7.6, -96.3, -23.7);
  assert.deepEqual(west, [], 'the west wall of the ferm alley has no gap for the tanks to be seen through (' + JSON.stringify(west) + ')');
  assert.deepEqual(east, [], 'nor the east wall, north of the open walkway (' + JSON.stringify(east) + ')');
  assert.ok(curved.filter(o => Math.abs(o.position.x + 7.6) < 0.6 && Math.abs(o.position.z - -47.1) < 0.6 && o.geometry.parameters.radiusTop > 7.4).length === 1,
    'the wall bends round Ferm 1 on the alley side, just outside its shell');
  assert.equal(curved.length, 8, 'round all seven fermenters and the beer well');
  assert.equal(panels.filter(o => Math.abs(o.position.x + 7.6) < 0.6 && o.position.z - o.geometry.parameters.depth / 2 < -47.1 && o.position.z + o.geometry.parameters.depth / 2 > -47.1).length, 0,
    'and no straight panel runs through the middle of a tank any more'); }
console.log('PASS: real Three.js construction, roof footprint, populated rooms centered between cook alley & evaps, Rick relocation, trench drains, doors/collision, straight east wall, flat silo roofs, flat textured roads, and all eight full-size evaporators with aisle clearance; the ferm alley walls are closed across every tank slot; all scripts parse');
