const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const notices=[],dialogs=[];
 const ctx={inboxReady:()=>false,NOTE_KIND:{bug:['','Bug'],msg:['','Message']},navigator:{},Date,Uint8Array,File,
  atob,escH:s=>String(s).replaceAll('<','&lt;'),toast:s=>notices.push(s),modal:(...a)=>dialogs.push(a)};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('test/note-sharing.js','utf8'),ctx);
 const n={kind:'bug',name:'Tester',t:0,v:'1.96.6',dev:'iPhone/iPad',where:'walking at x 1, z 2',text:'Door stuck <test>',img:'data:image/jpeg;base64,/9j/2Q=='};
 assert.ok(ctx.noteReport(n).includes('Door stuck <test>'));
 assert.ok(ctx.noteReport(n).includes('Build: 1.96.6'));
 assert.equal(ctx.noteScreenshot(n).type,'image/jpeg');
 assert.equal(ctx.noteScreenshot({...n,img:'bad'}),null);
 let shared;
 ctx.navigator={canShare:()=>true,share:async data=>{shared=data;}};
 await ctx.noteShare(n);assert.equal(shared.files.length,1);assert.equal(shared.text,ctx.noteReport(n));
 ctx.navigator.canShare=()=>false;await ctx.noteShare(n);assert.equal(shared.files,undefined,'unsupported attachments still share text');
 ctx.navigator.share=async()=>{throw {name:'AbortError'};};await ctx.noteShare(n);
 assert.ok(notices.at(-1).includes('saved note is still'));
 ctx.navigator.share=async()=>{throw {name:'NotAllowedError'};};await ctx.noteShare(n);
 assert.ok(dialogs.at(-1)[0].includes('Copy the report'));
 ctx.navigator={};await ctx.noteShare(n);assert.ok(dialogs.at(-1)[0].includes('Copy this report'));
 assert.ok(dialogs.at(-1)[0].includes('&lt;test>'),'report HTML escaped');
 let copied;ctx.navigator.clipboard={writeText:async s=>{copied=s;}};
 await dialogs.at(-1)[1][0][1]();assert.equal(copied,ctx.noteReport(n));
 ctx.noteSaved(n);assert.ok(dialogs.at(-1)[0].includes('has not received'));
 assert.equal(dialogs.at(-1)[1][0][0],'Share note');
 console.log('PASS: report metadata, attachment decoding, native text/file sharing, cancellation, failure/missing API fallback, escaping, copying, saved-versus-sent messaging.');
})().catch(e=>{console.error(e);process.exitCode=1;});
