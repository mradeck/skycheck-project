const CACHE_NAME = 'skycheck-v4';
const SHELL = ['/skycheck.html','/coordinates.html','/coordinate-tools.js','/data/gcg2016v2023-cm.i16','/icon-192x192.png','/icon-512x512.png','/manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
    return;
  }
  // AIRAC-Dateien behalten stabile Namen. Network-first verhindert deshalb,
  // dass ein alter 28-Tage-Zyklus durch den Offline-Cache festgehalten wird.
  if (url.pathname.startsWith('/data/dipul-airac/')) {
    e.respondWith(fetch(e.request).then(r => {
      const c = r.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, c));
      return r;
    }).catch(() => caches.match(e.request)));
    return;
  }
  // Große, stabile Länder-GeoJSONs sofort aus dem Cache liefern und im
  // Hintergrund aktualisieren. So blockiert ein Folgebesuch nicht erneut auf
  // mehrere Megabyte Zusatzebenen, ohne dauerhaft auf einem alten Stand zu bleiben.
  if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
    const update = fetch(e.request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(e.request, response.clone());
      }
      return response;
    });
    e.respondWith(caches.match(e.request).then(cached => cached || update));
    e.waitUntil(update.catch(() => undefined));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
