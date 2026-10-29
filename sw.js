// Corn Souls LIVE — Alpha v1.94. Independently scoped from Corn Souls TEST.
const CACHE='corn-souls-live-shell-v2';
const ROOT='/corn-souls/';
const PRELOAD=['./index.html','./game.html','./manifest.webmanifest','./icon-192-blue-psx.png','./icon-512-blue-psx.png'];
self.addEventListener('install', e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRELOAD)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
 e.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(n=>n.startsWith('corn-souls-live-shell-')&&n!==CACHE).map(n=>caches.delete(n)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch', e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(!url.pathname.startsWith(ROOT)||url.pathname.startsWith(ROOT+'test/'))return;
 e.respondWith((async()=>{
  try{
   const response=await fetch(req,{cache:'no-store'});
   if(response.ok){const cache=await caches.open(CACHE);await cache.put(req,response.clone());}
   return response;
  }catch(err){
   const hit=await caches.match(req,{ignoreSearch:true});
   if(hit)return hit;
   if(req.mode==='navigate'){const shell=await caches.match('./index.html');if(shell)return shell;}
   throw err;
  }
 })());
});
