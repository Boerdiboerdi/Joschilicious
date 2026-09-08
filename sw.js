'use strict';
// Bei späteren Änderungen an App-Dateien die Versionsnummer erhöhen.
// Der Pfad gehört zum Namen, damit andere Apps auf derselben Domain erhalten bleiben.
const CACHE_PREFIX='akkordbruecke-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=CACHE_PREFIX+'v2.1.1';
// Alle Dateien liegen im selben Ordner wie index.html und dieser Service Worker.
const FILES=['./','./index.html','./style.css','./music.js','./explanations.js','./songs.js','./audio.js','./install.js','./app.js','./manifest.json','./icon.svg','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const absolute=p=>new URL(p,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const responses=await Promise.all(FILES.map(async file=>{
    const response=await fetch(new Request(absolute(file),{cache:'reload',credentials:'same-origin'}));
    if(!response.ok||response.redirected)throw new Error('App-Datei nicht verfügbar: '+file);
    if(file==='./'||file==='./index.html'){
      if(!(await response.clone().text()).includes('data-akkordbruecke="v1"'))throw new Error('Keine App-Seite');
    }
    if(file.endsWith('.js')&&!/javascript/.test(response.headers.get('content-type')||''))throw new Error('Falscher Dateityp');
    return [absolute(file),response];
  }));
  const cache=await caches.open(CACHE);
  await Promise.all(responses.map(([url,response])=>cache.put(url,response)));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await Promise.all((await caches.keys()).filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  const allowed=FILES.map(absolute);
  if(!allowed.includes(url.origin+url.pathname)&&event.request.mode!=='navigate')return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    if(event.request.mode==='navigate'){
      try{return await fetch(event.request);}catch{return await cache.match(absolute('./index.html'))||Response.error();}
    }
    return fetch(event.request);
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='CHECK_OFFLINE')return;
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    const ready=(await Promise.all(FILES.map(f=>cache.match(absolute(f))))).every(Boolean);
    event.source?.postMessage({type:'OFFLINE_READY',ready});
  })());
});
