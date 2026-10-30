const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process');
const html=fs.readFileSync('game.html','utf8').replaceAll('\r\n','\n');
const original=cp.execFileSync('git',['show','HEAD:game.html'],{maxBuffer:20*1024*1024}).toString().replaceAll('\r\n','\n');
const section=s=>s.slice(s.indexOf('const pick ='),s.indexOf('// 2 player: one PC hosts'));
const elements={talkIn:{value:'',addEventListener(){}},talkSend:{},modal:{classList:{remove(){}}},wx:{style:{display:'none'}}};
let shown='',buttons=[];
const context={console,Date,Math,window:{},P3:{cooler:{T:5,alarm:false,open:0},alarms:[],weather:'sunny',pigeonHits:7},
 $:id=>elements[id],modal:(text,opts)=>{shown=text;buttons=opts;},toast(){}};
vm.createContext(context);vm.runInContext(section(html)+'\nthis.def=NPC_DEF;this.match=npcMatch;this.reply=reply;',context);
const cases={
 'How does cook work?':'cook','How does distillation work?':'distillation','How does fermentation work?':'fermentation',
 'What do the totes do?':'totes','What is the DCS?':'dcs','What about the cameras?':'cameras',
 'Tell me about your Jeep.':'jeep','Do you drink coffee?':'coffee','Do you smoke?':'cigarettes',
 'Were you in the Army?':'army','Tell me about yourself.':'who','How is your shift?':'shift',
 'Got anything else?':'job','Got anything for me to do?':'job',"How's the cooler?":'cooler',
 'Any alarms?':'alarms','How does the plant work?':'plant','distillation temperature':'distillation',
 'do you know about cameras':'cameras','your Jeep Gladiator truck':'jeep','coffee at work':'coffee',
 'cook temperature':'cook','DCS control systems':'dcs','cigaretes':'cigarettes','army veteran':'army'
};
for(const [q,topic] of Object.entries(cases)){
 assert.equal(context.match(context.def.op,q)?.id,topic,q);context.reply('op',q);assert.ok(shown.includes('Rick'),q);
}
// Every suggested Rick reply must reach a topic, and menu clicks use the actual reply path.
for(const label of [...context.def.op.start,...Object.values(context.def.op.topics).flatMap(t=>t.opts||[])]){
 if(/^bye/i.test(label))continue;
 assert.ok(context.match(context.def.op,label),'unrouted label '+label);
}
context.reply('op','What is the DCS?');buttons.find(b=>b[0].includes('cameras'))[1]();assert.match(shown,/Cameras|cameras/);
context.P3.cooler={T:19,alarm:true,open:2};context.reply('op',"How's the cooler?");assert.match(shown,/19 degrees and alarming/);assert.match(shown,/2 doors/);
context.P3.alarms=[{desc:'High cooler temperature'}];context.reply('op','Any alarms?');assert.match(shown,/high cooler temperature/);
context.reply('op','Pigeons?');assert.match(shown,/7/);
const first=[];for(let i=0;i<10;i++){context.reply('op','Do you drink coffee?');first.push(shown);}for(let i=1;i<first.length;i++)assert.notEqual(first[i],first[i-1]);
// Other NPC definitions, physical NPCs and all surrounding gameplay are byte-for-byte preserved.
assert.equal(html.slice(html.indexOf('  brenda: {'),html.indexOf('for (const id in NPC_DEF)')),original.slice(original.indexOf('  brenda: {'),original.indexOf('for (const id in NPC_DEF)')));
assert.equal(html.slice(0,html.indexOf('  op: {')),original.slice(0,original.indexOf('  op: {')));
assert.equal(html.slice(html.indexOf('// 2 player: one PC hosts')),original.slice(original.indexOf('// 2 player: one PC hosts')));
assert.equal(fs.readFileSync('index.html','utf8').replaceAll('\r\n','\n'),cp.execFileSync('git',['show','HEAD:index.html']).toString().replaceAll('\r\n','\n'),'launcher unchanged');
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(script[1].trim())new vm.Script(script[1]);
// Execute the real live launcher and parse every resulting script, including its gameplay patches.
(async()=>{
 let rendered='',failure='';
 const ctx={console,URL,Date,encodeURIComponent,location:{protocol:'file:',hostname:''},navigator:{},
 fetch:async url=>({ok:true,text:async()=>url.startsWith('./game.html')?html:fs.readFileSync(url.slice(2).split('?')[0],'utf8'),json:async()=>JSON.parse(fs.readFileSync(url.slice(2).split('?')[0],'utf8'))}),
 document:{getElementById:()=>({set textContent(v){failure=v;}}),open(){},write(s){rendered=s;},close(){}}};
 for(const script of fs.readFileSync('index.html','utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))await vm.runInNewContext(script[1],ctx);
 assert.ok(rendered,failure);for(const script of rendered.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(script[1].trim())new vm.Script(script[1]);
 assert.ok(rendered.includes('Army veteran'));assert.ok(rendered.includes("id: 'vern'"));
 console.log('PASS: Rick routing, menu clicks, contextual state, response variation, NPC/gameplay preservation, source and live launcher script syntax');
})().catch(e=>{console.error(e);process.exitCode=1;});
