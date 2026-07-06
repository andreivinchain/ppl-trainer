/* PPL Trainer service worker — network-first for app, cache fallback offline */
const CACHE='ppl-v2';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;               // don't touch Supabase/API/translation
  const isDoc = e.request.mode==='navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if(isDoc){
    // network-first: always try fresh index, fall back to cache offline
    e.respondWith(
      fetch(e.request).then(resp=>{ const copy=resp.clone(); caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{}); return resp; })
        .catch(()=>caches.match('./index.html'))
    );
  } else {
    // cache-first for static assets
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return resp;
    })));
  }
});
