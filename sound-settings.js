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
  '<div style="display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px">'+
  '<button id="csMusicMinus" type="button" aria-label="Decrease music volume" style="height:44px;padding:0;font-size:22px">−</button>'+
  '<input id="csMusicVolume" type="range" min="0" max="100" step="1" value="'+percent+'" style="width:100%;min-width:0;min-height:44px;box-sizing:border-box;margin:0">'+
  '<button id="csMusicPlus" type="button" aria-label="Increase music volume" style="height:44px;padding:0;font-size:22px">+</button></div>',
  [[musicOn?'Music: On':'Music: Off',()=>{toggleMusic();soundSettings();}],
   ['Back to pause menu',()=>menu()]],true);
 $('csMusicMinus').onclick=()=>soundSetMusicVolume(music.volume-.1);
 $('csMusicPlus').onclick=()=>soundSetMusicVolume(music.volume+.1);
 modalBtns=Array.from($('card').querySelectorAll('button:not(#csModalExit)'));
 modalFocus=focus;markModal();
 const slider=$('csMusicVolume');
 slider.oninput=()=>soundSetMusicVolume(Number(slider.value)/100);
 slider.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();inboxClose();}e.stopPropagation();});
}
