self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Donation Nearby!', {
      body: data.message || 'A new food donation is available in your area!',
      icon: '/favicon.ico',
      tag: data.id || 'donation-alert',
      data: { url: '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(event.notification.data?.url || '/dashboard');
          return client.focus();
        }
      }
      return clients.openWindow(event.notification.data?.url || '/dashboard');
    })
  );
});
