const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 let saved=[],dialogs=[],notices=[],calls=[],handler=async()=>({ok:true,status:200,json:async()=>null});
 const modalClasses=new Set(['open']);
 const elements={modal:{classList:{remove:s=>modalClasses.delete(s)}},card:{textContent:'',classList:{add(){},remove(){}},querySelectorAll:()=>[]},inboxEmail:{value:'owner@example.test'},inboxPassword:{value:'password',addEventListener(){}}};
 const c={modalBtns:[],modalFocus:0,INBOX_CONFIG:{url:'',publicKey:''},crypto:require('node:crypto').webcrypto,AbortController,setTimeout,clearTimeout,Date,
  notesLoad:()=>structuredClone(saved),notesSave:a=>{saved=structuredClone(a);return true;},
  toast:s=>notices.push(s),modal:(...a)=>dialogs.push(a),escH:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  $:id=>elements[id]||(elements[id]={value:'',addEventListener(){}}),noteShare(){},markModal(){},
  P3:{weather:'sunny',setWeather(k){this.weather=k;}},wxForced:null,wxLive:'sunny',fetchWeather(){},debugMenu(){},
  fetch:async(...args)=>{calls.push(args);if(args[0].endsWith('/logout'))return {ok:true,status:204};return handler(...args);}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('test/inbox.js','utf8'),c);
 const state=s=>vm.runInContext(s,c);
 c.inboxOpen();assert.ok(dialogs.at(-1)[0].includes('not connected'));
 const n={kind:'bug',name:'Tester',text:'Door stuck',t:1,v:'1.96.7',dev:'iPhone',where:'shop'};
 saved=[structuredClone(n)];await c.inboxSend(n);assert.equal(calls.length,0,'unconfigured never uploads');
 c.INBOX_CONFIG={url:'https://example.supabase.co',publicKey:'sb_publishable_test'};
 let ids=[];handler=async(url,o)=>{const id=JSON.parse(o.body).report.id;ids.push(id);return {ok:true,status:200,json:async()=>id};};
 await c.inboxSend(n);assert.equal(saved[0].reportId,n.reportId);assert.ok(saved[0].sentAt);
 await c.inboxSend(n);assert.equal(ids.length,1,'confirmed report not resent');
 assert.equal(calls.at(-1)[1].headers.Authorization,undefined,'no private token on public submit');
 const m={...n,t:2,text:'Other report',sentAt:undefined,reportId:undefined};saved.push(structuredClone(m));
 handler=async()=>{throw Error('offline');};await c.inboxSend(m);assert.equal(saved[1].sentAt,undefined);const retryId=saved[1].reportId;
 handler=async(url,o)=>({ok:true,status:200,json:async()=>JSON.parse(o.body).report.id});
 await c.inboxSend(saved[1]);assert.equal(saved[1].reportId,retryId,'retry reuses stable ID');
 await assert.rejects(c.inboxRequest('/private',{},true),/sign in/);
 state("CS_INBOX_SESSION={token:'owner-token',expires:Date.now()+60000}");
 const row={id:n.reportId,kind:'bug',name:'<script>',body:'<img src=x>',build:'1.96.7',device:'iPhone',location:'shop',created_at:new Date().toISOString(),read_at:null,resolved:false,screenshot:'data:image/jpeg;base64,/9j/2Q=='};
 const rows=Array.from({length:21},(_,i)=>({...row,id:i?'19671100-0000-4000-8000-'+String(i).padStart(12,'0'):row.id}));
 handler=async(url,o)=>({ok:true,status:o.method==='PATCH'?204:200,json:async()=>url.includes('&id=eq.')?[rows.find(r=>r.id===url.split('&id=eq.')[1])]:rows});
 await c.inboxFilter('unread');assert.ok(dialogs.at(-1)[0].includes('&lt;script>'));assert.ok(dialogs.at(-1)[1].some(b=>b[0]==='Next page'));
 assert.equal(dialogs.at(-1)[2],false,'inbox does not use tall stacked action menu');
 assert.ok(dialogs.at(-1)[0].includes('aria-pressed="true"'),'active filter visible');
 assert.ok(calls.at(-1)[0].includes('read_at=is.null'));assert.equal(calls.at(-1)[1].headers.Authorization,'Bearer owner-token');
 assert.ok(!calls.at(-1)[0].includes('screenshot'),'list does not fetch all screenshots');
 await c.inboxDetail(n.reportId);assert.ok(dialogs.at(-1)[0].includes('data:image/jpeg;base64,'));
 assert.ok(dialogs.at(-1)[0].includes('View screenshot'),'screenshot collapsed initially');
 assert.ok(dialogs.at(-1)[1].some(b=>b[0]==='Next message'));
 assert.ok(calls.some(a=>a[1].method==='PATCH'&&JSON.parse(a[1].body).read_at),'opening marks read');
 await dialogs.at(-1)[1].find(b=>b[0]==='Mark resolved')[1]();
 assert.ok(calls.some(a=>a[1].method==='PATCH'&&JSON.parse(a[1].body).resolved===true));
 assert.ok(dialogs.at(-1)[0].includes('Message 2 of 20'),'resolve advances to next message');
 await dialogs.at(-1)[1].find(b=>b[0]==='Previous message')[1]();
 assert.ok(dialogs.at(-1)[0].includes('Message 1 of 20'),'previous message returns without list reload');
 let release;handler=()=>new Promise(r=>release=r);const before=dialogs.length,pending=c.inboxList();
 c.inboxSignOut();release({ok:true,status:200,json:async()=>[row]});await pending;
 assert.equal(dialogs.length,before,'late response cannot reopen inbox after signout');assert.equal(elements.card.textContent,'');
 assert.equal(modalClasses.has('open'),false,'close removes the modal overlay');
 assert.equal(c.modalBtns.length,0,'close clears stale controller targets');
 elements.inboxEmail.value='owner@example.test';elements.inboxPassword.value='password';
 handler=async url=>({ok:true,status:200,json:async()=>url.includes('/token?')?{access_token:'test',expires_in:3600}:false});
 await c.inboxSignIn();assert.ok(dialogs.at(-1)[0].includes('not approved'));assert.equal(state('CS_INBOX_SESSION'),null);
 assert.equal(elements.inboxPassword.value,'','password cleared after submit');
 c.debugWeather();assert.equal(dialogs.at(-1)[1].length,6);
 dialogs.at(-1)[1].find(b=>b[0]==='Rain')[1]();assert.equal(c.P3.weather,'rain');assert.equal(c.wxForced,'rain');
 dialogs.at(-1)[1].find(b=>b[0]==='Live / automatic')[1]();assert.equal(c.wxForced,null);
 console.log('PASS: unconfigured state, receipt-only sent status, persisted retry IDs, public/private headers, login requirement, list pagination/escaping, read/resolved updates, canceled stale requests, admin denial, password clearing.');
})().catch(e=>{console.error(e);process.exitCode=1;});
