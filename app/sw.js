// cdb-Gym — service worker на клиентската страница tools/app/ (Т17, 08.11.2026).
// Цел: инсталируемост + никога стар код в инсталираното приложение (урокът от Victus phe-tracker: старият кеш на PWA-то).
//  • страницата (навигация): ПЪРВО мрежата; кешът е само резерва без връзка;
//  • НИЩО от Supabase (supabase.co, /functions/v1/, /rest/v1/, /storage/v1/) и нищо от друг домейн не минава през кеша;
//  • записи (POST и т.н.) — само мрежа;
//  • новата версия влиза веднага: skipWaiting + clients.claim, старите кешове се трият.
// ⚠ При всяко качване на нова версия на страницата смени VERSION (името на кеша).
var VERSION = "v1.1.2";
var CACHE = "cdb-app-" + VERSION;

function bypass(req) {
  var url = new URL(req.url);
  if (req.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;          // supabase.co, CDN, всичко чуждо
  if (/supabase\.co$/.test(url.hostname) || /\/(functions|rest|storage|auth)\/v1\//.test(url.pathname)) return true;
  return false;
}

self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf("cdb-app-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (bypass(req) || req.mode !== "navigate") return;               // всичко освен страницата — браузърът сам, без кеш
  var url = new URL(req.url), key = url.origin + url.pathname;      // ключ без ?t= — токенът не стои в кеша
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { return c.put(key, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(key).then(function (hit) { return hit || Response.error(); });
    })
  );
});
