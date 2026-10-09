importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDAk7btG-dpz1dZiUVQbTBQJJHr07LPn-E",
  authDomain: "device-streaming-3d1aacd5.firebaseapp.com",
  projectId: "device-streaming-3d1aacd5",
  storageBucket: "device-streaming-3d1aacd5.firebasestorage.app",
  messagingSenderId: "726097401892",
  appId: "1:726097401892:web:3271125037d83381d260b1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Admin Alert';
  const notifIcon = payload.notification?.icon || payload.data?.icon || '/logo.png';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || payload.data?.message || 'New constituency notification received',
    icon: notifIcon,
    badge: '/logo.png',
    tag: 'admin-notification',
    renotify: true,
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/notifications');
      }
    })
  );
});
