// PiloRus service worker: push/PWA only.
// No page, image, script or API interception. The shop and admin must always
// use the browser network stack so old caches cannot freeze buttons or data.

var CACHE_VERSION = "aray-pilorus-v3-20260627-passive";
var IS_LOCAL_DEV_SW = ["localhost", "127.0.0.1", "::1"].indexOf(self.location.hostname) !== -1;

function shouldDeleteCacheKey(key, includeAllOriginCaches) {
  if (includeAllOriginCaches) return true;
  return key.indexOf("aray-") === 0 || key.indexOf("workbox-") === 0;
}

function clearRuntimeCaches(includeAllOriginCaches) {
  if (!self.caches) return Promise.resolve([]);

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

self.addEventListener("install", function(event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function(event) {
  if (IS_LOCAL_DEV_SW) {
    event.waitUntil(disableLocalDevSw());
    return;
  }

  event.waitUntil(
    clearRuntimeCaches(false)
      .then(function() {
        return clients.claim();
      })
      .catch(function() {
        return clients.claim();
      })
  );
});

self.addEventListener("push", function(event) {
  if (IS_LOCAL_DEV_SW) return;
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (error) {
    data = { title: "PiloRus", body: event.data.text(), url: "/" };
  }

  var targetUrl = data.url || "/";
  var options = {
    body: data.body || "",
    icon: data.icon || '/api/pwa/icon?s=192&v=pilorus-brand-header-20260526',
    badge: '/api/pwa/icon?s=72&v=pilorus-brand-header-20260526',
    data: { url: targetUrl },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(data.title || "PiloRus", options));
});

self.addEventListener("notificationclick", function(event) {
  event.notification.close();

  var url = "/";
  if (event.notification.data && event.notification.data.url) {
    url = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url === url && "focus" in list[i]) return list[i].focus();
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener("message", function(event) {
  if (event.data && event.data.type === "CLEAR_ARAY_CACHES") {
    var includeAllOriginCaches = !!event.data.includeAllOriginCaches;
    event.waitUntil(
      clearRuntimeCaches(includeAllOriginCaches).then(function(deletedCaches) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ ok: true, deletedCaches: deletedCaches, version: CACHE_VERSION });
        }
      }).catch(function(error) {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({
            ok: false,
            error: String(error && error.message || error),
            version: CACHE_VERSION
          });
        }
      })
    );
    return;
  }

  if (event.data && event.data.type === "WARM_ARAY_ROUTES") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ ok: true, skipped: true, version: CACHE_VERSION });
    }
    return;
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("sync", function(event) {
  if (event.tag === "aray-background-refresh") {
    event.waitUntil(Promise.resolve());
  }
});
