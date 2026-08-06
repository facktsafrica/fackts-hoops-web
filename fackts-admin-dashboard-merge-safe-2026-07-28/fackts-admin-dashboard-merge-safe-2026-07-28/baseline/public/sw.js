const CACHE_NAME = "fackts-hoops-pwa-v5-20260724";
const PRECACHE_URLS = [
  "/offline.html",
  "/fackts-hoops-logo.png?v=20260722",
  "/apple-touch-icon.png?v=20260722",
  "/icons/icon-192x192.png?v=20260722",
  "/icons/icon-512x512.png?v=20260722",
];

const PRIVATE_PREFIXES = [
  "/admin",
  "/player",
  "/calendar",
  "/account",
  "/api",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

function isPrivateRequest(url) {
  return PRIVATE_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)
  );
}

async function publicNavigation(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await caches.match(request)) || caches.match("/offline.html");
  }
}

async function staticAsset(request) {
  const cached = await caches.match(request);

  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached || Response.error());

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (isPrivateRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        return Response.error();
      })
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(publicNavigation(event.request));
    return;
  }

  if (["image", "style", "script", "font"].includes(event.request.destination)) {
    event.respondWith(staticAsset(event.request));
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "Open FACKTS Hoops for the latest update." };
  }

  const title = payload.title || "FACKTS Hoops";
  const options = {
    body: payload.body || "You have a new FACKTS update.",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || "fackts-update",
    renotify: true,
    vibrate: [200, 100, 200],
    data: {
      url: payload.url || "/player",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const requestedPath = event.notification.data?.url || "/player";
  const targetUrl = new URL(requestedPath, self.location.origin);

  if (targetUrl.origin !== self.location.origin) {
    targetUrl.href = `${self.location.origin}/player`;
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          await client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl.href);
    })
  );
});
