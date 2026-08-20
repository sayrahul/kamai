/**
 * Firebase Cloud Messaging Background Service Worker
 * Handles background push notifications (Live Billing Alerts, Low Stock, Khata Reminders)
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: 'AIzaSyCXq5B7MdPcaa48HpRATpMZbCW-K2vCtb0',
  projectId: 'kamaiplus',
  messagingSenderId: '1241090505753953',
  appId: '1:1241090505753953:web:kamaiplus',
});

const messaging = firebase.messaging();

// Handle background notification clicks
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background message handler
messaging.onBackgroundMessage(function (payload) {
  const notificationTitle = payload.notification?.title || 'KamaiPlus Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New update received',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
