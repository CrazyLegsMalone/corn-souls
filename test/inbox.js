// Public config only. Never place a service-role key or administrator password here.
let CS_INBOX_SESSION=null, CS_INBOX_PAGE=0, CS_INBOX_FILTER='unread', CS_INBOX_VIEW=0;
const CS_INBOX_SENDING=new Set();
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
 for(const id of ['inboxEmail','inboxPassword'])$(id).addEventListener('keydown',e=>e.stopPropagation());
}
async function inboxSignIn(){
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
  CS_INBOX_PAGE=0;await inboxList();
 }catch(e){if(view!==CS_INBOX_VIEW)return;CS_INBOX_SESSION=null;inboxLogin(e.message);}
}
function inboxOpen(){if(!CS_INBOX_SESSION||Date.now()>=CS_INBOX_SESSION.expires)inboxLogin();else inboxList();}
function inboxClose(){CS_INBOX_VIEW++;$('card').textContent='';}
function inboxSignOut(){const old=CS_INBOX_SESSION;CS_INBOX_SESSION=null;inboxClose();if(old&&inboxReady())fetch(INBOX_CONFIG.url+'/auth/v1/logout',{method:'POST',headers:{apikey:INBOX_CONFIG.publicKey,Authorization:'Bearer '+old.token}}).catch(()=>{});toast('Developer signed out.');}
async function inboxList(){
 if(!CS_INBOX_SESSION){inboxLogin();return;}
 const page=CS_INBOX_PAGE,filter=CS_INBOX_FILTER,view=++CS_INBOX_VIEW;
 try{
  const query=filter==='unread'?'&read_at=is.null&resolved=eq.false':filter==='resolved'?'&resolved=eq.true':'';
  const rows=await inboxRequest('/rest/v1/cs_reports?select=id,created_at,kind,name,body,build,device,read_at,resolved&order=created_at.desc,id.desc&limit=21&offset='+page*20+query,{},true);
  if(view!==CS_INBOX_VIEW||!CS_INBOX_SESSION)return;
  const visible=rows.slice(0,20);
  const content=visible.map((r,i)=>'<button data-report="'+i+'" style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px">'+
   (r.read_at?'':'● ')+escH(r.name||'anonymous')+' · '+escH(r.kind)+' · '+escH(new Date(r.created_at).toLocaleString())+
   '<br>'+escH(r.body.slice(0,100))+'<br><small>'+escH(r.build)+' · '+escH(r.device)+(r.resolved?' · Resolved':'')+'</small></button>').join('');
  modal('<h1>Developer Inbox</h1><p>'+escH(filter)+' · Page '+(page+1)+'</p><div style="max-height:52vh;overflow:auto">'+(content||'<p>No reports here.</p>')+'</div>',
   [['Close',()=>inboxClose()],['Unread',()=>{CS_INBOX_FILTER='unread';CS_INBOX_PAGE=0;inboxList();}],['All',()=>{CS_INBOX_FILTER='all';CS_INBOX_PAGE=0;inboxList();}],['Resolved',()=>{CS_INBOX_FILTER='resolved';CS_INBOX_PAGE=0;inboxList();}],
    ...(page?[['Previous',()=>{CS_INBOX_PAGE--;inboxList();}]]:[]),...(rows.length>20?[['Next',()=>{CS_INBOX_PAGE++;inboxList();}]]:[]),['Refresh',()=>inboxList()],['Sign out',()=>inboxSignOut()]],true);
  $('card').querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>inboxDetail(visible[+b.dataset.report].id));
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
  modal('<h1>'+escH(r.kind)+' — '+escH(r.name||'anonymous')+'</h1><div style="max-height:60vh;overflow:auto"><p style="white-space:pre-wrap">'+escH(r.body)+'</p>'+image+
   '<p>'+escH(r.build)+' · '+escH(r.device)+' · '+escH(r.location)+'<br>'+escH(new Date(r.created_at).toLocaleString())+'</p></div>',
   [['Back',()=>inboxList()],[r.resolved?'Reopen report':'Mark resolved',async()=>{
    try{await inboxRequest('/rest/v1/cs_reports?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({resolved:!r.resolved})},true);inboxDetail(id);}
    catch(e){toast(e.message);inboxList();}
   }],['Close',()=>inboxClose()]],true);
 }catch(e){if(view!==CS_INBOX_VIEW)return;if(!CS_INBOX_SESSION)inboxLogin(e.message);else {toast(e.message);inboxList();}}
}
