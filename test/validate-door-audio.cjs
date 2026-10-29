const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let nodes=[];const peaks={};const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(value){this.peak=value;},exponentialRampToValueAtTime(){}});
const node=()=>{const n={gain:param(),frequency:param(),pan:param(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;};
const C={state:'running',currentTime:1,destination:{},createGain:node,createBufferSource:node,createBiquadFilter:node,createOscillator:node};
const c={tsnd:{ctx:C},document:{hidden:false},V3:(...p)=>p,O:{cooler:{Z0:10}},camera:{position:{distanceTo:()=>2}},panner:node,panOf:()=>.4,noiseBuf:()=>({})};
vm.createContext(c);vm.runInContext(fs.readFileSync('test/cooler-door-audio.js','utf8'),c);
for(const kind of ['open','swing','close']){
 nodes=[];c.coolerDoorSound({c:1},kind);const sources=nodes.filter(n=>n.started);assert.equal(sources.length,2);assert.ok(sources.every(n=>n.stopped));
 peaks[kind]=nodes.map(n=>n.gain.peak||0).reduce((a,b)=>a+b,0);
 sources.forEach(n=>n.onended());assert.ok(nodes.every(n=>n.disconnected),'nodes released after both sounds end');
}
assert.ok(peaks.close>.9,'closing thud has doubled combined layer gain');assert.ok(peaks.close>peaks.open*4,'opening remains quieter');
nodes=[];c.document.hidden=true;c.coolerDoorSound({c:1},'open');assert.equal(nodes.length,0);
c.document.hidden=false;C.state='suspended';c.coolerDoorSound({c:1},'open');assert.equal(nodes.length,0);
C.state='running';c.camera.position.distanceTo=()=>40;c.coolerDoorSound({c:1},'close');assert.equal(nodes.length,0);
console.log('PASS: cooler opening/motion/closing synthesis, one-shot scheduling, cleanup, background/suspended/distant silence.');
