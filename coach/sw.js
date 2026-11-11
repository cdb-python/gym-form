// cdb-Gym — service worker на списъка на треньора tools/coach/ (Т88, Chris 09:10–09:19): САМО известия.
// Без fetch обработчик и без кеш — страниците на треньора минават през мрежата както досега. scope: coach/.
// Payload (шифрован JSON): {"t":"cdb","b":"Ново съобщение от Мария","tag":…,"topic":…,"url":"../app/?c=<id>#razgovor|#danni","cid":…,"tab":…};
//   тестовото: {"b":"Известията работят.","url":"./"}. url е спрямо scope-а (coach/).
// Натискане: прозорец с изгледа на треньора за същия клиент (?c=<id>) → към раздела; иначе отворен списък или изглед на друг клиент →
//   отваря клиента там; иначе нов прозорец.
var TABS = { nachalo: 1, hrana: 1, merki: 1, danni: 1, razgovor: 1 };
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("push", function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { try { d = { b: e.data ? e.data.text() : "" }; } catch (y) { d = {}; } }
  e.waitUntil(self.registration.showNotification(d.t || "cdb", {
    body: d.b || "Ново от клиент",
    icon: "../app/icons/icon-192.png",
    badge: "../app/icons/badge-96.png",
    tag: d.tag || "cdb-coach",
    renotify: true,
    data: { url: typeof d.url === "string" ? d.url : "./", cid: d.cid || null, tab: TABS[d.tab] ? d.tab : null }
  }));
});
self.addEventListener("notificationclick", function (e) {
  var nd = (e.notification && e.notification.data) || {};
  e.notification.close();
  var scope = new URL(self.registration.scope), url;
  try { url = new URL(nd.url || "./", scope); } catch (x) { url = new URL("./", scope); }
  if (url.origin !== scope.origin) url = new URL("./", scope);
  var cid = url.searchParams.get("c") || nd.cid || null, tab = (url.hash || "").slice(1) || nd.tab || "nachalo";
  if (!TABS[tab]) tab = "nachalo";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    function u(c) { try { var x = new URL(c.url); return x.origin === scope.origin ? x : null; } catch (y) { return null; } }
    if (cid) {
      var same = list.filter(function (c) { var x = u(c); return x && x.searchParams.get("c") === cid; })[0];
      if (same) { try { same.postMessage({ cdb: "go", go: tab, cid: cid }); } catch (y) {} return same.focus ? same.focus() : same; }
    }
    var other = list.filter(function (c) { var x = u(c); return x && (x.pathname.indexOf(scope.pathname) === 0 || !!x.searchParams.get("c")); })[0];   // списъкът или изгледът за друг клиент
    if (other) { try { other.postMessage({ cdb: "open", url: url.href }); } catch (y) {} return other.focus ? other.focus() : other; }
    return self.clients.openWindow ? self.clients.openWindow(url.href) : null;
  }));
});
