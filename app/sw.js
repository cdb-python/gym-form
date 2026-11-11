// cdb-Gym — service worker на клиентската страница tools/app/ (Т17, 08.11.2026).
// Цел: инсталируемост + никога стар код в инсталираното приложение (урокът от Victus phe-tracker: старият кеш на PWA-то).
//  • страницата (навигация): ПЪРВО мрежата; кешът е само резерва без връзка;
//  • НИЩО от Supabase (supabase.co, /functions/v1/, /rest/v1/, /storage/v1/) и нищо от друг домейн не минава през кеша;
//  • записи (POST и т.н.) — само мрежа;
//  • новата версия влиза веднага: skipWaiting + clients.claim, старите кешове се трият.
// ⚠ При всяко качване на нова версия на страницата смени VERSION (името на кеша).
var VERSION = "v1.6.0";
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

// ── Т85 (Chris 07:11–07:44): известия (Web Push). Payload (шифрован JSON): {"t":"cdb","b":"<текст>","tab":"razgovor|nachalo","tag":"cdb-msg|cdb-news|cdb-test"}.
//   Токенът НЕ е в известието: натискането отваря приложението (scope) в раздела — то само знае токена (localStorage, Т17).
//   Т88: събраната промяна носи и key (cardKey / an_<sort> / lab_<ден>) → целта е „раздел:ключ“ (като data-go): картата се отваря.
var TABS = { nachalo: 1, hrana: 1, merki: 1, danni: 1, razgovor: 1 };
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { b: e.data ? e.data.text() : "" }; } catch (y) { d = {}; } }
  var tab = TABS[d.tab] ? d.tab : "nachalo", key = d.key && /^[\w.-]{1,80}$/.test(String(d.key)) ? String(d.key) : null;
  e.waitUntil(self.registration.showNotification(d.t || "cdb", {
    body: d.b || "Има ново в дневника ти",
    icon: "icons/icon-192.png",
    badge: "icons/badge-96.png",   // малка бяла икона за лентата (Android)
    tag: d.tag || "cdb",
    renotify: true,
    data: { tab: tab, key: key }
  }));
});
self.addEventListener("notificationclick", function (e) {
  var nd = (e.notification && e.notification.data) || {}, tab = TABS[nd.tab] ? nd.tab : "nachalo", target = tab + (nd.key ? ":" + nd.key : "");
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    var scope = new URL(self.registration.scope);
    var mine = list.filter(function (c) {   // само личната страница (?t=); не изгледът на треньора (?c=) и не „като клиента“ (&from=)
      try { var u = new URL(c.url); return u.origin === scope.origin && u.pathname.indexOf(scope.pathname) === 0 && !u.searchParams.get("c") && !u.searchParams.get("from"); } catch (x) { return false; }
    })[0];
    if (mine) { try { mine.postMessage({ cdb: "go", go: target }); } catch (x) {} return mine.focus ? mine.focus() : mine; }
    return self.clients.openWindow ? self.clients.openWindow(scope.href + "#" + target) : null;
  }));
});
