// Public config only. Never place a service-role key or administrator password here.
let CS_INBOX_SESSION=null, CS_INBOX_PAGE=0, CS_INBOX_FILTER='all', CS_INBOX_VIEW=0;
let CS_INBOX_ITEMS=[];
const CS_INBOX_SENDING=new Set();
function inboxControls(){
 // Include filters and messages, not just the footer, in controller navigation.
 modalBtns=Array.from($('card').querySelectorAll('button:not(#csModalExit),summary'));
 modalFocus=0;markModal();
 modalBtns.forEach(b=>b.addEventListener('focus',()=>b.scrollIntoView({block:'nearest'})));
}
function inboxPanel(html,buttons){modal(html,buttons,false);$('card').classList.add('cs-inbox');}
function inboxFilter(filter){CS_INBOX_FILTER=filter;CS_INBOX_PAGE=0;return inboxList();}
function debugWeather(code){
 const choose=k=>{wxForced=k;P3.setWeather(k||wxLive);if(!k)fetchWeather();toast('Weather: '+(k||'live'));debugWeather(code);};
 modal('<h1>Weather</h1><p>Current: <b>'+escH(P3.weather)+'</b> · '+(wxForced?'Manual':'Live weather')+'</p>',
  [['Back to Debug',()=>debugMenu(code)],['Live / automatic',()=>choose(null)],['Sunny',()=>choose('sunny')],['Cloudy',()=>choose('cloudy')],['Rain',()=>choose('rain')],['Snow',()=>choose('snow')]],false);
}
function inboxReady(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(INBOX_CONFIG.url||'')&&!!INBOX_CONFIG.publicKey;}
function inboxUnavailable(){modal('<h1>Developer Inbox</h1><p>The central inbox is not connected yet. Notes remain saved on this device. You can still use Share note.</p>',[['Close',null]],true);}
async function inboxRequest(path,options={},privateRequest=false){
 if(!inboxReady())throw Error('The central inbox is not connected yet.');
 if(privateRequest&&(!CS_INBOX_SESSION||Date.now()>=CS_INBOX_SESSION.expires)){CS_INBOX_SESSION=null;throw Error('Please sign in again.');}
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const headers={apikey:INBOX_CONFIG.publicKey,'Content-Type':'application/json',...options.headers};
  if(privateRequest)headers.Authorization='Bearer '+CS_INBOX_SESSION.token;
  else if(INBOX_CONFIG.publicKey.startsWith('eyJ'))headers.Authorization='Bearer '+INBOX_CONFIG.publicKey;
  const response=await fetch(INBOX_CONFIG.url+path,{...options,headers,signal:controller.signal});
  if(!response.ok){if(privateRequest&&response.status===401)CS_INBOX_SESSION=null;
   throw Error(response.status===429?'Too many reports. Try again later.':response.status===401||response.status===403?'Sign-in failed, expired, or this account cannot access the inbox.':'Inbox request failed ('+response.status+'). Try again.');}
  return response.status===204?null:await response.json();
 }catch(e){if(e.name==='AbortError')throw Error('The inbox timed out. Your note is still saved; retrying will not duplicate it.');throw e;}
 finally{clearTimeout(timer);}
}
function inboxPersist(n){
 const notes=notesLoad(),saved=notes.find(a=>a.t===n.t&&a.text===n.text&&a.name===n.name);
 if(saved){saved.reportId=n.reportId;saved.sentAt=n.sentAt;return notesSave(notes);}return false;
}
async function inboxSend(n){
 if(!inboxReady()){inboxUnavailable();return;}
 if(n.sentAt){toast('This report was already received by the inbox.');return;}
 n.reportId=n.reportId||crypto.randomUUID();
 if(CS_INBOX_SENDING.has(n.reportId))return;
 if(!inboxPersist(n)){toast('Could not save the report ID. Free device storage and try again.');return;}
 CS_INBOX_SENDING.add(n.reportId);toast('Sending report…');
 try{
  const id=await inboxRequest('/rest/v1/rpc/cs_submit_report',{method:'POST',body:JSON.stringify({report:{id:n.reportId,kind:n.kind,name:n.name,text:n.text,t:n.t,v:n.v,dev:n.dev,where:n.where,held:n.held||null,img:n.img||null}})});
  if(id!==n.reportId)throw Error('The inbox did not confirm receipt. Please retry.');
  n.sentAt=Date.now();inboxPersist(n);toast('Report received by the developer inbox. Thank you!');
 }catch(e){modal('<h1>Report not confirmed</h1><p>'+escH(e.message)+'</p><p>Your note is still saved on this device.</p>',[['Retry',()=>inboxSend(n)],['Share instead',()=>noteShare(n)],['Close',null]],true);}
 finally{CS_INBOX_SENDING.delete(n.reportId);}
}
function inboxLogin(message){
 CS_INBOX_VIEW++;
 if(!inboxReady()){inboxUnavailable();return;}
 modal('<h1>Developer Inbox — sign in</h1><p>Only approved developer accounts can read reports.</p>'+(message?'<p>'+escH(message)+'</p>':'')+
  '<input id="inboxEmail" type="email" autocomplete="username" placeholder="Developer email" style="width:100%;box-sizing:border-box;padding:9px">'+
  '<input id="inboxPassword" type="password" autocomplete="current-password" placeholder="Password" style="width:100%;box-sizing:border-box;padding:9px;margin-top:8px">',
  [['Sign in',()=>inboxSignIn()],['Cancel',()=>inboxClose()]],true);
 for(const id of ['inboxEmail','inboxPassword'])$(id).addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();inboxClose();}e.stopPropagation();
 });
}
let CS_INBOX_LOGIN_BUSY=false;
async function inboxSignIn(){
 if(CS_INBOX_LOGIN_BUSY)return;
 CS_INBOX_LOGIN_BUSY=true;
 const view=++CS_INBOX_VIEW;
 const email=$('inboxEmail').value.trim(),password=$('inboxPassword').value;
 $('inboxPassword').value='';if(!email||!password){inboxLogin('Enter your email and password.');return;}
 try{
  const session=await inboxRequest('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
  if(view!==CS_INBOX_VIEW)return;
  CS_INBOX_SESSION={token:session.access_token,expires:Date.now()+session.expires_in*1000-30000};
  const allowed=await inboxRequest('/rest/v1/rpc/cs_is_report_admin',{method:'POST',body:'{}'},true);
  if(view!==CS_INBOX_VIEW)return;
  if(!allowed){CS_INBOX_SESSION=null;inboxLogin('This account is not approved for the developer inbox.');return;}
  CS_INBOX_PAGE=0;
  try{await inboxList();}
  catch(e){console.error('Developer inbox list after login failed:',e);modal('<h1>Inbox unavailable</h1><p>'+escH(e.message||'Unable to load inbox.')+'</p>',[['Retry',()=>inboxList()],['Close',()=>inboxClose()]],true);}
 }catch(e){console.error('Developer Inbox login:',e);if(view!==CS_INBOX_VIEW)return;CS_INBOX_SESSION=null;inboxLogin(e.message||'Sign-in failed.');}
 finally{CS_INBOX_LOGIN_BUSY=false;}
}
function inboxOpen(){if(!CS_INBOX_SESSION||Date.now()>=CS_INBOX_SESSION.expires)inboxLogin();else inboxList();}
function inboxClose(){
 CS_INBOX_VIEW++;
 $('modal').classList.remove('open');
 $('card').textContent='';
 modalBtns=[];modalFocus=0;
 $('card').classList.remove('cs-inbox');CS_INBOX_ITEMS=[];
}
function inboxSignOut(){const old=CS_INBOX_SESSION;CS_INBOX_SESSION=null;inboxClose();if(old&&inboxReady())fetch(INBOX_CONFIG.url+'/auth/v1/logout',{method:'POST',headers:{apikey:INBOX_CONFIG.publicKey,Authorization:'Bearer '+old.token}}).catch(()=>{});toast('Developer signed out.');}
async function inboxList(){
 if(!CS_INBOX_SESSION){inboxLogin();return;}
 const page=CS_INBOX_PAGE,filter=CS_INBOX_FILTER,view=++CS_INBOX_VIEW;
 try{
  const query=filter==='unread'?'&read_at=is.null&resolved=eq.false':filter==='resolved'?'&resolved=eq.true':'';
  const rows=await inboxRequest('/rest/v1/cs_reports?select=id,created_at,kind,name,body,build,device,read_at,resolved&order=created_at.desc,id.desc&limit=21&offset='+page*20+query,{},true);
  if(view!==CS_INBOX_VIEW||!CS_INBOX_SESSION)return;
  // After sign-in Supabase can return an error/object or no rows. Never let
  // an unexpected response crash the live 3D game or its controller UI.
  if(!Array.isArray(rows))throw Error('Developer Inbox returned an unexpected report-list response; please retry.');
  const visible=rows.slice(0,20);
  CS_INBOX_ITEMS=visible;
  const tabs=[['all','All messages'],['unread','Unread'],['resolved','Resolved']].map(([key,label])=>'<button data-inbox-filter="'+key+'" aria-pressed="'+(key===filter)+'">'+label+'</button>').join('');
  const content=visible.map((r,i)=>'<button class="cs-inbox-message" data-report="'+i+'">'+
   '<span class="cs-inbox-message-head"><b>'+(r.read_at?'':'● ')+escH(r.name||'anonymous')+'</b><small>'+escH(new Date(r.created_at).toLocaleString())+'</small></span>'+
   '<span class="cs-inbox-preview">'+escH(r.body.slice(0,140))+'</span><small>'+escH(r.kind)+' · '+escH(r.build)+' · '+escH(r.device)+(r.resolved?' · Resolved':'')+'</small></button>').join('');
  const empty=filter==='unread'?'You’re caught up. Choose All messages to see messages you’ve read.':filter==='resolved'?'No resolved messages.':'No messages yet. Players can use Message Developer in the game menu.';
  inboxPanel('<h1>Developer Inbox</h1><div class="cs-inbox-tabs">'+tabs+'</div><p class="cs-inbox-meta">Page '+(page+1)+' · '+visible.length+' messages</p><div class="cs-inbox-list">'+(content||'<p class="cs-inbox-empty">'+empty+'</p>')+'</div>',
   [...(page?[['Previous page',()=>{CS_INBOX_PAGE--;inboxList();}]]:[]),...(rows.length>20?[['Next page',()=>{CS_INBOX_PAGE++;inboxList();}]]:[]),['Refresh',()=>inboxList()],['Debug menu',()=>debugMenu()],['Sign out',()=>inboxSignOut()]]);
  $('card').querySelectorAll('[data-inbox-filter]').forEach(b=>b.onclick=()=>inboxFilter(b.dataset.inboxFilter));
  $('card').querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>inboxDetail(visible[+b.dataset.report].id));
  inboxControls();
 }catch(e){if(view!==CS_INBOX_VIEW)return;if(!CS_INBOX_SESSION)inboxLogin(e.message);else modal('<h1>Inbox unavailable</h1><p>'+escH(e.message)+'</p>',[['Retry',()=>inboxList()],['Close',()=>inboxClose()]],true);}
}
async function inboxDetail(id){
 const view=++CS_INBOX_VIEW;
 try{
  const rows=await inboxRequest('/rest/v1/cs_reports?select=*&id=eq.'+encodeURIComponent(id),{},true),r=rows[0];
  if(view!==CS_INBOX_VIEW||!CS_INBOX_SESSION)return;
  if(!r)throw Error('Report no longer available.');
  await inboxRequest('/rest/v1/cs_reports?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})},true);
  if(view!==CS_INBOX_VIEW||!CS_INBOX_SESSION)return;
  const image=/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(r.screenshot||'')?'<img src="'+r.screenshot+'" alt="Report screenshot" style="width:100%;max-width:640px">':'';
  const index=CS_INBOX_ITEMS.findIndex(item=>item.id===id);
  if(index>=0)CS_INBOX_ITEMS[index].read_at=new Date().toISOString();
  inboxPanel('<h1>'+escH(r.name||'anonymous')+'</h1><p class="cs-inbox-meta">'+escH(r.kind)+' · '+escH(new Date(r.created_at).toLocaleString())+(index>=0?' · Message '+(index+1)+' of '+CS_INBOX_ITEMS.length:'')+'</p><div class="cs-inbox-detail"><p class="cs-inbox-body">'+escH(r.body)+'</p>'+
   (image?'<details><summary>View screenshot</summary>'+image+'</details>':'')+'<p class="cs-inbox-meta">'+escH(r.build)+' · '+escH(r.device)+' · '+escH(r.location)+'</p></div>',
   [['Back to messages',()=>inboxList()],...(index>0?[['Previous message',()=>inboxDetail(CS_INBOX_ITEMS[index-1].id)]]:[]),...(index>=0&&index<CS_INBOX_ITEMS.length-1?[['Next message',()=>inboxDetail(CS_INBOX_ITEMS[index+1].id)]]:[]),
   [r.resolved?'Reopen message':'Mark resolved',()=>inboxResolve(r,index)]]);
  inboxControls();
 }catch(e){if(view!==CS_INBOX_VIEW)return;if(!CS_INBOX_SESSION)inboxLogin(e.message);else {toast(e.message);inboxList();}}
}
async function inboxResolve(report,index){
 const view=CS_INBOX_VIEW;
 try{
  await inboxRequest('/rest/v1/cs_reports?id=eq.'+encodeURIComponent(report.id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({resolved:!report.resolved})},true);
  if(view!==CS_INBOX_VIEW||!CS_INBOX_SESSION)return;
  // Continue through the current set instead of reloading the same message.
  if(!report.resolved&&index>=0&&index+1<CS_INBOX_ITEMS.length)await inboxDetail(CS_INBOX_ITEMS[index+1].id);
  else await inboxList();
 }catch(e){if(view===CS_INBOX_VIEW){toast(e.message);inboxList();}}
}
