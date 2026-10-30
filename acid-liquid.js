// Visuals only: use tank-local geometry so flow animation cannot move the leak.
function saLiquidPaintHit(point){
 // The projectile, not the currently selected tool, creates the hole. Skip the
 // wrench branch if the player switched tools while a paintball was in flight.
 const before=SA.leaks.length,hit=saHit(point,true);
 if(hit&&SA.leaks.length>before)netSend({t:'sa',p:point.toArray().map(v=>+v.toFixed(3))});
 return hit;
}
function saLiquidMesh(hole,mid,land){
 if(!SA.streamM){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=16;
  const c=canvas.getContext('2d');c.fillStyle='#d9dcb0';c.fillRect(0,0,128,16);
  for(let i=0;i<8;i++){c.fillStyle=i%2?'#ecefd5':'#bfc897';c.fillRect(i*16,3,7,4);c.fillRect(i*16+6,11,5,2);}
  const map=new T.CanvasTexture(canvas);map.wrapS=T.RepeatWrapping;map.repeat.set(3,1);
  SA.streamM=new T.MeshPhongMaterial({map,color:0xe2e5bd,transparent:true,opacity:.78,shininess:100,depthWrite:false});
  SA.rippleGeo=new T.RingGeometry(.8,1,20);
 }
 const curve=new T.QuadraticBezierCurve3(V3(0,0,0),mid.clone().sub(hole),land.clone().sub(hole));
 const mesh=new T.Mesh(new T.TubeGeometry(curve,20,.045,6,false),SA.streamM);
 mesh.position.copy(hole);
 const ripple=new T.Mesh(SA.rippleGeo,new T.MeshBasicMaterial({color:0xe7edc8,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide}));
 ripple.rotation.x=-Math.PI/2;ripple.position.copy(land).sub(hole);ripple.position.y+=.025;
 ripple.userData.noHit=true;mesh.add(ripple);mesh.userData.ripple=ripple;
 return mesh;
}
function saLiquidAnimate(leak){
 // Moving highlights suggest flow; the stream's position/scale never jitter.
 const phase=((40-leak.t)*1.8)%1,ripple=leak.m.userData.ripple;
 if(SA.streamM&&SA.streamM.map)SA.streamM.map.offset.x=-(clock*.8)%1;
 if(ripple){ripple.scale.setScalar(.07+phase*.32);ripple.material.opacity=.28*(1-phase);
  ripple.position.y=(SA.poolM&&SA.poolM.visible?SA.poolM.position.y:.13)-leak.m.position.y+.015;
 }
}
function saLiquidPool(){
 // Keep the first impact as the origin until this spill has drained. Grow by
 // clipping its expanding bounds, rather than moving the center off the stream.
 const c=SA.poolC||(SA.leaks[0]?SA.leaks[0].land:V3(SA.x,0,SA.z));SA.poolC=c;
 const cx=Math.max(SA.cx0,Math.min(SA.cx1,c.x)),cz=Math.max(SA.cz0,Math.min(SA.cz1,c.z));
 const reach=Math.max(cx-SA.cx0,SA.cx1-cx,cz-SA.cz0,SA.cz1-cz);
 const r=.15+SA.pool*reach;
 const x0=Math.max(SA.cx0,cx-r),x1=Math.min(SA.cx1,cx+r),z0=Math.max(SA.cz0,cz-r),z1=Math.min(SA.cz1,cz+r);
 SA.pr=r;SA.poolM.position.set((x0+x1)/2,.13+SA.pool*.55,(z0+z1)/2);
 SA.poolM.scale.set((x1-x0)/2,(z1-z0)/2,1);
 if(SA.pool<=.01&&!SA.leaks.length)SA.poolC=null;
}
function saLiquidRemove(leak){
 scene.remove(leak.m);leak.m.geometry.dispose();
 const ripple=leak.m.userData.ripple;if(ripple)ripple.material.dispose();
 // Stream material/texture and ripple geometry are shared across leaks.
}
