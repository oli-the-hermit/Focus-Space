// Focus Space alert worker (web only).
// Its only job is to give browser notifications action buttons ("Start break")
// and hand the chosen action back to the open tab. No caching, no fetch handling.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', event => {
  const payload = event.notification.data;
  const action = event.action || 'open-app';
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find(c => c.focused) || windows[0];
      if (client) {
        await client.focus();
        client.postMessage({ type: 'fs-alert-action', action, payload });
      } else {
        await self.clients.openWindow('/');
      }
    })()
  );
});
