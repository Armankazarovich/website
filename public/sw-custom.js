// Custom Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  const targetUrl = data.url || '/';
  const isAdmin = targetUrl.startsWith('/admin');
  const options = {
    body: data.body,
    icon: data.icon || (isAdmin ? '/api/pwa/icon?s=192&v=aray-production-20260508' : '/icons/icon-192x192.png'),
    badge: isAdmin ? '/api/pwa/icon?s=72&v=aray-production-20260508' : '/icons/icon-72x72.png',
    data: { url: targetUrl },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
