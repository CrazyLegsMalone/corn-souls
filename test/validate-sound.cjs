const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const stored=new Map(),elements={csMusicMinus:{},csMusicPlus:{},card:{querySelectorAll:()=>[elements.csMusicMinus,elements.csMusicPlus]},csMusicVolume:{value:'',addEventListener(){}},csMusicVolumeLabel:{textContent:''}};
let panel,toggles=0;
const c={localStorage:{getItem:k=>stored.has(k)?stored.get(k):null,setItem:(k,v)=>stored.set(k,v)},
 music:{volume:.6},musicOn:true,$:id=>elements[id],modal:(...args)=>panel=args,modalBtns:[],modalFocus:0,markModal(){},
 toggleMusic(){c.musicOn=!c.musicOn;toggles++;},menu(){},inboxClose(){}};
vm.createContext(c);vm.runInContext(fs.readFileSync('test/sound-settings.js','utf8'),c);
assert.equal(c.soundMusicVolume(),.6);
c.soundSettings();assert.ok(panel[0].includes('Music volume'));assert.ok(panel[0].includes('type="range"'));
elements.csMusicVolume.value='25';elements.csMusicVolume.oninput();assert.equal(c.music.volume,.25);assert.equal(c.soundMusicVolume(),.25);assert.equal(elements.csMusicVolumeLabel.textContent,'25%');
c.soundSettings();const layout=panel[0];assert.ok(layout.indexOf('id="csMusicMinus"')<layout.indexOf('id="csMusicVolume"'));
assert.ok(layout.indexOf('id="csMusicPlus"')>layout.indexOf('id="csMusicVolume"'));
assert.equal(panel[1].length,2,'footer only has music toggle and Back');
c.modalFocus=1;elements.csMusicPlus.onclick();assert.equal(c.music.volume,.35);
assert.equal(c.modalFocus,1,'inline adjustment keeps controller focus');
assert.equal(c.modalBtns[1],elements.csMusicPlus,'inline controls participate in controller navigation');
elements.csMusicMinus.onclick();assert.ok(Math.abs(c.music.volume-.25)<1e-10);
elements.csMusicPlus.onclick();
panel[1].find(b=>b[0]==='Music: On')[1]();assert.equal(toggles,1);assert.equal(c.musicOn,false);assert.ok(Math.abs(c.music.volume-.35)<1e-10,'toggle preserves level');
c.soundSetMusicVolume(0);assert.equal(c.music.volume,0);assert.equal(c.soundMusicVolume(),0,'zero survives reload');
c.soundSetMusicVolume(2);assert.equal(c.music.volume,1);c.soundSetMusicVolume(-1);assert.equal(c.music.volume,0);
stored.set('cs_music_volume','broken');assert.equal(c.soundMusicVolume(),.6);
c.localStorage.setItem=()=>{throw Error('storage blocked');};c.soundSetMusicVolume(.4);assert.equal(c.music.volume,.4);
console.log('PASS: sound menu, slider, controller volume steps, preserved toggle level, zero/reload, bounds, invalid/blocked storage.');
