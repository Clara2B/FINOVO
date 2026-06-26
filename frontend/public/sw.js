// FINOVO Service Worker — Web Push
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "FINOVO";
  const options = {
    body: data.body || "",
    icon: data.icon || "/logo192.png",
    badge: "/logo192.png",
    tag: data.tag || "finovo-notification",
    data: { url: data.url || "/" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const c = cs.find((w) => w.focus);
      if (c) { c.navigate(url); return c.focus(); }
      return clients.openWindow(url);
    })
  );
});
