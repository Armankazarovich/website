// ARAY Service Worker v2 — Caching + Push Notifications
// Стратегии: CacheFirst для статики, NetworkFirst для HTML/API
// Версия: меняй CACHE_VERSION при каждом деплое для сброса кэша

var CACHE_VERSION = 'aray-v7';
var STATIC_CACHE  = CACHE_VERSION + '-static';
var IMAGE_CACHE   = CACHE_VERSION + '-images';
var PAGE_CACHE    = CACHE_VERSION + '-pages';
var IS_LOCAL_DEV_SW = ['localhost', '127.0.0.1', '::1'].indexOf(self.location.hostname) !== -1;

function disableLocalDevSw() {
  return caches.keys().then(function(keys) {
    return Promise.all(
      keys
        .filter(function(key) { return key.startsWith('aray-'); })
        .map(function(key) { return caches.delete(key); })
    );
  }).then(function() {
    return self.registration.unregister();
  });
}

function shouldDeleteCacheKey(key, includeAllOriginCaches) {
  if (includeAllOriginCaches) return true;
  return key.startsWith('aray-') || key.startsWith('workbox-');
}

function clearRuntimeCaches(includeAllOriginCaches) {
  return caches.keys().then(function(keys) {
    var targets = keys.filter(function(key) {
      return shouldDeleteCacheKey(key, !!includeAllOriginCaches);
    });
    return Promise.all(targets.map(function(key) {
      return caches.delete(key).then(function(deleted) {
        return deleted ? key : null;
      });
    })).then(function(deleted) {
      return deleted.filter(Boolean);
    });
  });
}

// Файлы для предзагрузки при установке SW
var PRECACHE_URLS = [
  '/offline',
  '/aray/aray-production-logo.png',
];

// ── INSTALL — предзагрузка ────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  if (IS_LOCAL_DEV_SW) {
    event.waitUntil(self.skipWaiting());
    return;
  }
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
  if (IS_LOCAL_DEV_SW) {
    event.waitUntil(disableLocalDevSw());
    return;
  }
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
  if (IS_LOCAL_DEV_SW) return;
  var req = event.request;
  var url = new URL(req.url);

  // Только GET запросы, только наш origin
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API запросы — пропускаем (всегда свежие данные)
  if (url.pathname.startsWith('/api/')) return;

  // Видео и пользовательские загрузки не держим в CacheStorage: это может
  // быстро раздуть PWA-кэш и оставить менеджера на старых тяжёлых файлах.
  if (
    url.pathname.startsWith('/uploads/') ||
    /\.(mp4|webm|mov|avi|mkv)$/i.test(url.pathname)
  ) {
    return;
  }

  // Админка и кабинет должны всегда брать свежий HTML/JS.
  // Иначе после деплоя менеджер может остаться на старом client-bundle и получить "мертвые" кнопки.
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/cabinet') ||
    url.pathname.startsWith('/login') ||
    url.pathname.indexOf('/_next/static/chunks/app/admin/') !== -1 ||
    url.pathname.indexOf('/_next/static/chunks/app/cabinet/') !== -1
  ) {
    return;
  }

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
  if (req.mode === 'navigate' || (req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
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

function matchPageFallback(req) {
  var url = new URL(req.url);
  return caches.match(req).then(function(cached) {
    if (cached) return cached;
    return caches.match(url.pathname).then(function(pathCached) {
      if (pathCached) return pathCached;
      if (url.pathname !== '/catalog' && url.pathname.startsWith('/catalog')) {
        return caches.match('/catalog');
      }
      return caches.match('/offline');
    });
  });
}

// ── СТРАТЕГИЯ: NetworkFirst с offline fallback ────────────────────────────────
function networkFirstWithFallback(req) {
  var timeout = new Promise(function(_, reject) {
    setTimeout(function() {
      reject(new Error('network timeout'));
    }, 4200);
  });

  return Promise.race([fetch(req), timeout]).then(function(response) {
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
    return matchPageFallback(req);
  });
}

// ── PUSH УВЕДОМЛЕНИЯ ─────────────────────────────────────────────────────────
self.addEventListener('push', function(event) {
  if (IS_LOCAL_DEV_SW) return;
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
    icon: '/api/pwa/icon?s=192&v=pilorus-brand-header-20260526',
    badge: '/api/pwa/icon?s=72&v=pilorus-brand-header-20260526',
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
  if (event.data && event.data.type === 'CLEAR_ARAY_CACHES') {
    var includeAllOriginCaches = !!event.data.includeAllOriginCaches;
    event.waitUntil(
      clearRuntimeCaches(includeAllOriginCaches).then(function(deletedCaches) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true, deletedCaches: deletedCaches });
        }
      }).catch(function(error) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: false, error: String(error && error.message || error) });
        }
      })
    );
    return;
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
