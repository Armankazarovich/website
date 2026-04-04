// ARAY Service Worker v2 — Caching + Push Notifications
// Стратегии: CacheFirst для статики, NetworkFirst для HTML/API
// Версия: меняй CACHE_VERSION при каждом деплое для сброса кэша

var CACHE_VERSION = 'aray-v4';
var STATIC_CACHE  = CACHE_VERSION + '-static';
var IMAGE_CACHE   = CACHE_VERSION + '-images';
var PAGE_CACHE    = CACHE_VERSION + '-pages';

// Файлы для предзагрузки при установке SW
var PRECACHE_URLS = [
  '/offline',
  '/icons/aray-192.png',
  '/icons/aray-512.png',
];

// ── INSTALL — предзагрузка ────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      return cache.addAll(PRECACHE_URLS).catch(function() {
        // Не фейлим установку если offline страница ещё не готова
      });
    })
  );
});

// ── ACTIVATE — чистим старые кэши ────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) {
            // Удаляем кэши не принадлежащие текущей версии
            return key.startsWith('aray-') && !key.startsWith(CACHE_VERSION);
          })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

// ── FETCH — стратегии кэширования ────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  // Только GET запросы, только наш origin
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API запросы — пропускаем (всегда свежие данные)
  if (url.pathname.startsWith('/api/')) return;

  // ── _next/static — CacheFirst (immutable, 1 год) ──
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // ── Картинки и иконки — CacheFirst (30 дней) ──
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/uploads/') ||
    /\.(png|jpg|jpeg|webp|avif|svg|gif|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // ── HTML страницы — NetworkFirst + offline fallback ──
  if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstWithFallback(req));
    return;
  }
});

// ── СТРАТЕГИЯ: CacheFirst ─────────────────────────────────────────────────────
function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        if (response && response.status === 200) {
          cache.put(req, response.clone());
        }
        return response;
      }).catch(function() {
        return cached || new Response('', { status: 503 });
      });
    });
  });
}

// ── СТРАТЕГИЯ: NetworkFirst с offline fallback ────────────────────────────────
function networkFirstWithFallback(req) {
  return fetch(req).then(function(response) {
    if (response && response.status === 200) {
      // Кэшируем только успешные HTML ответы
      var resClone = response.clone();
      caches.open(PAGE_CACHE).then(function(cache) {
        cache.put(req, resClone);
      });
    }
    return response;
  }).catch(function() {
    // Нет сети — пробуем кэш, потом /offline
    return caches.match(req).then(function(cached) {
      if (cached) return cached;
      return caches.match('/offline');
    });
  });
}

// ── PUSH УВЕДОМЛЕНИЯ ─────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'Арай', body: event.data.text(), url: '/' };
  }

  var title = data.title || 'Арай';
  var options = {
    body: data.body || '',
    icon: '/icons/aray-192.png',
    badge: '/icons/aray-72.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      if (self.navigator && 'setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(1).catch(function() {});
      }
    })
  );
});

// ── КЛИК ПО УВЕДОМЛЕНИЮ ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(function() {});
  }

  var url = '/';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url && 'focus' in list[i]) {
          return list[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── SKIP_WAITING — мгновенная активация нового SW ────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
