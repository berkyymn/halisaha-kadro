// Halı Saha Kadro service worker.
// Yalnızca "uygulama olarak kur" (ana ekrana ekle) şartını karşılar: bazı
// tarayıcılar (Samsung Internet, eski Chrome) kurulum için sayfa isteklerini
// karşılayan bir service worker ister. Hiçbir şeyi önbelleğe ALMAZ; her istek
// doğrudan ağa gider, bu yüzden yeni sürüm yayınlanınca eski sürümde kalınmaz.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request));
});
