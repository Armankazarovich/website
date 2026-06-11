// PiloRus service worker: safe offline mode + background refresh.
// Public pages use fast network-first. Admin, cabinet and checkout stay live-only.

var CACHE_VERSION = 'aray-pilorus-v1';
var STATIC_CACHE = CACHE_VERSION + '-static';
var IMAGE_CACHE = CACHE_VERSION + '-images';
var PAGE_CACHE = CACHE_VERSION + '-pages';
var API_CACHE = CACHE_VERSION + '-api';

var IS_LOCAL_DEV_SW = ['localhost', '127.0.0.1', '::1'].indexOf(self.location.hostname) !== -1;
var FAST_PAGE_CACHE_MS = 900;
var COLD_PAGE_NETWORK_MS = 12000;
var STATIC_CACHE_MAX_ITEMS = 90;
var IMAGE_CACHE_MAX_ITEMS = 55;
var PAGE_CACHE_MAX_ITEMS = 24;
var API_CACHE_MAX_ITEMS = 8;
var MAX_CACHEABLE_IMAGE_BYTES = 900 * 1024;

var CACHE_LIMITS = {};
CACHE_LIMITS[STATIC_CACHE] = STATIC_CACHE_MAX_ITEMS;
CACHE_LIMITS[IMAGE_CACHE] = IMAGE_CACHE_MAX_ITEMS;
CACHE_LIMITS[PAGE_CACHE] = PAGE_CACHE_MAX_ITEMS;
CACHE_LIMITS[API_CACHE] = API_CACHE_MAX_ITEMS;

var CORE_PAGE_URLS = [
  '/offline',
  '/',
  '/catalog',
  '/cart',
  '/compare',
  '/wishlist',
  '/delivery',
  '/about',
  '/contacts',
  '/promotions'
];

var CORE_STATIC_URLS = [
  '/manifest.json',
  '/favicon.ico',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

function shouldDeleteCacheKey(key, includeAllOriginCaches) {
  if (includeAllOriginCaches) return true;
  return key.indexOf('aray-') === 0 || key.indexOf('workbox-') === 0;
}

function clearRuntimeCaches(includeAllOriginCaches) {
  return caches.keys().then(function(keys) {
    return Promise.all(
      keys
        .filter(function(key) { return shouldDeleteCacheKey(key, !!includeAllOriginCaches); })
        .map(function(key) {
          return caches.delete(key).then(function(deleted) { return deleted ? key : null; });
        })
    );
  }).then(function(deleted) {
    return deleted.filter(Boolean);
  });
}

function disableLocalDevSw() {
  return clearRuntimeCaches(false).then(function() {
    return self.registration.unregister();
  });
}

function cacheLimitFor(cacheName) {
  return CACHE_LIMITS[cacheName] || 50;
}

function trimCache(cacheName, maxItems) {
  return caches.open(cacheName).then(function(cache) {
    return cache.keys().then(function(keys) {
      if (keys.length <= maxItems) return [];
      return Promise.all(keys.slice(0, keys.length - maxItems).map(function(request) {
        return cache.delete(request);
      }));
    });
  }).catch(function() {});
}

function trimRuntimeCaches() {
  return Promise.all([
    trimCache(STATIC_CACHE, STATIC_CACHE_MAX_ITEMS),
    trimCache(IMAGE_CACHE, IMAGE_CACHE_MAX_ITEMS),
    trimCache(PAGE_CACHE, PAGE_CACHE_MAX_ITEMS),
    trimCache(API_CACHE, API_CACHE_MAX_ITEMS)
  ]);
}

function shouldCacheResponse(response) {
  return response && response.status === 200 && (response.type === 'basic' || response.type === 'default');
}

function isOversizedImageResponse(response) {
  if (!response) return false;
  var contentLength = Number(response.headers && response.headers.get('content-length'));
  return Number.isFinite(contentLength) && contentLength > MAX_CACHEABLE_IMAGE_BYTES;
}

function safeCachePut(cacheName, cache, req, response) {
  if (!shouldCacheResponse(response)) return Promise.resolve(false);
  if (cacheName === IMAGE_CACHE && isOversizedImageResponse(response)) return Promise.resolve(false);

  return cache.put(req, response.clone()).then(function() {
    return trimCache(cacheName, cacheLimitFor(cacheName));
  }).then(function() {
    return true;
  }).catch(function(error) {
    var name = error && error.name ? error.name : '';
    if (name === 'QuotaExceededError' || String(error).indexOf('Quota') !== -1) {
      return trimRuntimeCaches().then(function() { return false; });
    }
    return false;
  });
}

function uniqueUrls(urls) {
  var seen = {};
  return urls.filter(function(url) {
    if (!url || seen[url]) return false;
    seen[url] = true;
    return true;
  });
}

function pagePathCacheKey(req) {
  try {
    var url = new URL(req.url);
    if (url.origin !== self.location.origin) return null;
    return url.pathname;
  } catch (error) {
    return null;
  }
}

function putPageResponse(req, response) {
  var pathKey = pagePathCacheKey(req);
  return caches.open(PAGE_CACHE).then(function(cache) {
    var writes = [safeCachePut(PAGE_CACHE, cache, req, response.clone())];
    if (pathKey) writes.push(safeCachePut(PAGE_CACHE, cache, pathKey, response.clone()));
    return Promise.all(writes);
  });
}

function precacheCore() {
  return caches.open(STATIC_CACHE).then(function(cache) {
    return Promise.all(
      CORE_STATIC_URLS.map(function(url) {
        return fetch(new Request(url, { credentials: 'same-origin', cache: 'reload' }))
          .then(function(response) {
            if (shouldCacheResponse(response)) return safeCachePut(STATIC_CACHE, cache, url, response);
          })
          .catch(function() {});
      })
    );
  }).then(function() {
    return warmCoreRoutes();
  });
}

function warmCoreRoutes(extraUrls) {
  var urls = uniqueUrls(CORE_PAGE_URLS.concat(extraUrls || []));
  return caches.open(PAGE_CACHE).then(function(cache) {
    return Promise.all(
      urls.map(function(url) {
        return fetch(new Request(url, { credentials: 'same-origin', cache: 'reload' }))
          .then(function(response) {
            if (shouldCacheResponse(response)) return safeCachePut(PAGE_CACHE, cache, url, response);
          })
          .catch(function() {});
      })
    );
  });
}

function matchPageFallback(req) {
  var url = new URL(req.url);
  return caches.match(req).then(function(cached) {
    if (cached) return cached;
    return caches.match(url.pathname).then(function(pathCached) {
      if (pathCached) return pathCached;
      if (url.pathname !== '/catalog' && url.pathname.indexOf('/catalog') === 0) {
        return caches.match('/catalog');
      }
      return caches.match('/offline');
    });
  });
}

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        if (shouldCacheResponse(response)) {
          safeCachePut(cacheName, cache, req, response.clone()).catch(function() {});
        }
        return response;
      }).catch(function() {
        return cached || new Response('', { status: 503 });
      });
    });
  });
}

function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then(function(cache) {
    return cache.match(req).then(function(cached) {
      var fresh = fetch(req).then(function(response) {
        if (shouldCacheResponse(response)) {
          safeCachePut(cacheName, cache, req, response.clone()).catch(function() {});
        }
        return response;
      });
      return cached || fresh.catch(function() {
        return new Response('', { status: 503 });
      });
    });
  });
}

function timeoutReject(ms) {
  return new Promise(function(_, reject) {
    setTimeout(function() { reject(new Error('network timeout')); }, ms);
  });
}

function cachedPageFor(req) {
  var pathKey = pagePathCacheKey(req);
  return caches.open(PAGE_CACHE).then(function(cache) {
    return cache.match(req).then(function(cached) {
      if (cached || !pathKey) return cached || null;
      return cache.match(pathKey);
    });
  });
}

function fetchFreshPage(req) {
  return fetch(req).then(function(response) {
    if (response && response.status >= 500) throw new Error('server error');
    if (shouldCacheResponse(response)) {
      putPageResponse(req, response.clone()).catch(function() {});
    }
    return response;
  });
}

function fastPageWithBackgroundRefresh(req, event) {
  return cachedPageFor(req).then(function(cached) {
    if (cached) {
      if (self.navigator && self.navigator.onLine === false) return cached;
      var fresh = fetchFreshPage(req);
      if (event && event.waitUntil) event.waitUntil(fresh.catch(function() {}));
      return Promise.race([
        fresh,
        new Promise(function(resolve) {
          setTimeout(function() { resolve(cached); }, FAST_PAGE_CACHE_MS);
        })
      ]).catch(function() {
        return cached;
      });
    }

    return Promise.race([fetchFreshPage(req), timeoutReject(COLD_PAGE_NETWORK_MS)]).catch(function() {
      return matchPageFallback(req);
    });
  });
}

function isCacheableApi(pathname) {
  return (
    pathname.indexOf('/api/pwa/manifest') === 0 ||
    pathname.indexOf('/api/pwa/site-icon') === 0 ||
    pathname.indexOf('/api/pwa/icon') === 0
  );
}

function isLiveOnlyPath(pathname) {
  return (
    pathname.indexOf('/admin') === 0 ||
    pathname.indexOf('/cabinet') === 0 ||
    pathname.indexOf('/login') === 0 ||
    pathname.indexOf('/checkout') === 0 ||
    pathname.indexOf('/api/auth') === 0 ||
    pathname.indexOf('/api/admin') === 0 ||
    pathname.indexOf('/api/orders') === 0 ||
    pathname.indexOf('/api/cart') === 0 ||
    pathname.indexOf('/_next/static/chunks/app/admin/') !== -1 ||
    pathname.indexOf('/_next/static/chunks/app/cabinet/') !== -1
  );
}

self.addEventListener('install', function(event) {
  if (IS_LOCAL_DEV_SW) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  self.skipWaiting();
  event.waitUntil(precacheCore().catch(function() {}));
});

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
            return (key.indexOf('aray-') === 0 || key.indexOf('workbox-') === 0) && key.indexOf(CACHE_VERSION) !== 0;
          })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return clients.claim();
    }).then(function() {
      return trimRuntimeCaches();
    }).then(function() {
      return warmCoreRoutes();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (IS_LOCAL_DEV_SW) return;

  var req = event.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isLiveOnlyPath(url.pathname)) return;

  if (url.pathname.indexOf('/api/') === 0) {
    if (isCacheableApi(url.pathname)) {
      event.respondWith(staleWhileRevalidate(req, API_CACHE));
    }
    return;
  }

  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(url.pathname)) return;

  if (url.pathname.indexOf('/_next/static/') === 0) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (url.pathname.indexOf('/fonts/') === 0 || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (
    url.pathname.indexOf('/_next/image') === 0 ||
    url.pathname.indexOf('/images/') === 0 ||
    url.pathname.indexOf('/icons/') === 0 ||
    url.pathname.indexOf('/uploads/') === 0 ||
    /\.(png|jpg|jpeg|webp|avif|svg|gif|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1) {
    event.respondWith(fastPageWithBackgroundRefresh(req, event));
  }
});

self.addEventListener('push', function(event) {
  if (IS_LOCAL_DEV_SW) return;
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (error) {
    data = { title: 'PiloRus', body: event.data.text(), url: '/' };
  }

  var targetUrl = data.url || '/';
  var isAdmin = targetUrl.indexOf('/admin') === 0;
  var options = {
    body: data.body || '',
    icon: data.icon || (isAdmin ? '/api/pwa/icon?s=192&v=pilorus-brand-header-20260526' : '/icons/icon-192x192.png'),
    badge: isAdmin ? '/api/pwa/icon?s=72&v=pilorus-brand-header-20260526' : '/icons/icon-72x72.png',
    data: { url: targetUrl },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(data.title || 'PiloRus', options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  var url = '/';
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url && 'focus' in list[i]) return list[i].focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_ARAY_CACHES') {
    var includeAllOriginCaches = !!event.data.includeAllOriginCaches;
    event.waitUntil(
      clearRuntimeCaches(includeAllOriginCaches).then(function(deletedCaches) {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true, deletedCaches: deletedCaches });
      }).catch(function(error) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: false, error: String(error && error.message || error) });
        }
      })
    );
    return;
  }

  if (event.data && event.data.type === 'WARM_ARAY_ROUTES') {
    event.waitUntil(
      warmCoreRoutes(event.data.urls || []).then(function() {
        if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
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

self.addEventListener('sync', function(event) {
  if (event.tag === 'aray-background-refresh') {
    event.waitUntil(warmCoreRoutes());
  }
});
