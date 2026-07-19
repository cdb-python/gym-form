// Kill-switch service worker — старият ФКУ тракер се премести.
// Изчиства всички кешове, освобождава контрола и се саморегистрира извън употреба,
// за да може инсталираният PWA да зареди новото известие (index.html) от мрежата.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try{
      const keys = await caches.keys();
      await Promise.all(keys.map(function(k){ return caches.delete(k); }));
    }catch(_){}
    try{ await self.registration.unregister(); }catch(_){}
    try{
      const clients = await self.clients.matchAll({ type:'window' });
      clients.forEach(function(c){ c.navigate(c.url); });
    }catch(_){}
  })());
});
// Мрежа първо — никога не сервирай стар кеш.
self.addEventListener('fetch', function(e){ e.respondWith(fetch(e.request)); });
