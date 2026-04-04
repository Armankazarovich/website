// ПилоРус Service Worker — Push Notifications
// Simple standalone SW, no importScripts, no workbox dependencies

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'ПилоРус', body: event.data.text(), url: '/' };
  }

  var title = data.title || 'ПилоРус';
  var options = {
    body: data.body || '',
    icon: '/icons/aray-192.png',
    badge: '/icons/aray-72.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(function() {
      // Показать значок на иконке приложения (Badge API)
      if (self.navigator && 'setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(1).catch(function() {});
      }
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Сбросить значок при открытии уведомления
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
