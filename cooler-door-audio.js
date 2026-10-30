// Short synthesized insulated-door sounds; reuse the existing effects context.
function coolerDoorSound(door,kind){
 const C=tsnd.ctx;if(!C||C.state!=='running'||document.hidden)return;
 const at=V3(door.c,1.1,O.cooler.Z0),distance=camera.position.distanceTo(at);
 const volume=Math.max(0,1-distance/28);if(volume<.02)return;
 const time=C.currentTime,duration=kind==='open'?.34:kind==='close'?.22:.25;
 const output=C.createGain(),pan=panner(C,C.destination);if(pan.pan)pan.pan.value=panOf(at);
 output.gain.value=volume;output.connect(pan);
 const source=C.createBufferSource(),filter=C.createBiquadFilter(),gain=C.createGain();
 source.buffer=noiseBuf(C,1);filter.type=kind==='open'?'highpass':'lowpass';filter.frequency.value=kind==='open'?950:kind==='close'?650:450;
 gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(kind==='close'?.56:kind==='open'?.12:.045,time+.012);
 gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
 source.connect(filter);filter.connect(gain);gain.connect(output);source.start(time);source.stop(time+duration+.02);
 // A short low body resonance makes the closing seal sound weighty.
 const tone=C.createOscillator(),body=C.createGain();tone.type='sine';tone.frequency.setValueAtTime(kind==='close'?110:190,time);
 tone.frequency.exponentialRampToValueAtTime(kind==='close'?48:85,time+.14);
 body.gain.setValueAtTime(.0001,time);body.gain.linearRampToValueAtTime(kind==='close'?.44:.055,time+.008);body.gain.exponentialRampToValueAtTime(.0001,time+.18);
 tone.connect(body);body.connect(output);tone.start(time);tone.stop(time+.2);
 let ended=0;const cleanup=()=>{if(++ended<2)return;for(const node of [source,filter,gain,tone,body,output,pan])node.disconnect();};
 source.onended=cleanup;tone.onended=cleanup;
}
