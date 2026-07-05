// cdb-Gym — минимален service worker (инсталируемост на PWA за Phe-тракера).
// Passthrough към мрежата; наличието на fetch-хендлър прави приложението инсталируемо.
self.addEventListener("install", function (e) { self.skipWaiting(); });
self.addEventListener("activate", function (e) { self.clients.claim(); });
self.addEventListener("fetch", function (e) { /* мрежа по подразбиране; браузърът дърпа сам */ });
