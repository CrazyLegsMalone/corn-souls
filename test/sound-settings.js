// TEST Sound menu. Scale music only; spatial effects retain their existing mix.
function soundMusicVolume(){
 try{
  const raw=localStorage.getItem('cs_music_volume');
  if(raw!==null&&raw.trim()!==''){const n=Number(raw);if(Number.isFinite(n))return Math.max(0,Math.min(1,n));}
 }catch(e){}
 return .6;
}
function soundSetMusicVolume(value){
 const n=Number(value);if(!Number.isFinite(n))return;
 const volume=Math.max(0,Math.min(1,n));music.volume=volume;
 try{localStorage.setItem('cs_music_volume',String(volume));}catch(e){}
 const slider=$('csMusicVolume'),label=$('csMusicVolumeLabel');
 if(slider)slider.value=String(Math.round(volume*100));
 if(label)label.textContent=Math.round(volume*100)+'%';
}
function soundSettings(focus=0){
 const percent=Math.round(music.volume*100);
 modal('<h1>Sound</h1><label for="csMusicVolume" style="display:block;margin:16px 0 8px">Music volume <b id="csMusicVolumeLabel">'+percent+'%</b></label>'+
  '<input id="csMusicVolume" type="range" min="0" max="100" step="1" value="'+percent+'" style="width:100%;min-height:44px;box-sizing:border-box">',
  [[musicOn?'Music: On':'Music: Off',()=>{toggleMusic();soundSettings();}],
   ['Volume −',()=>{soundSetMusicVolume(music.volume-.1);soundSettings(1);}],
   ['Volume +',()=>{soundSetMusicVolume(music.volume+.1);soundSettings(2);}],
   ['Back to pause menu',()=>menu()]],true);
 modalFocus=focus;markModal();
 const slider=$('csMusicVolume');
 slider.oninput=()=>soundSetMusicVolume(Number(slider.value)/100);
 slider.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();inboxClose();}e.stopPropagation();});
}
