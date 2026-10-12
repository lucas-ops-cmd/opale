// Opale — service worker : installation, fonctionnement hors ligne léger, notifications.
importScripts('./config.js');

const VERSION = 'opale-v1';
const SHELL = [
  './', './index.html', './config.js', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js', './js/model.js', './js/dates.js', './js/grades.js', './js/curriculum.js',
  './js/quickadd.js', './js/push.js', './js/ui/common.js', './js/ui/views.js', './js/ui/editor.js',
  './js/ui/notes.js', './js/ui/settings.js', './js/vendor/ui.js', './js/vendor/supabase.js',
  './icons/icon-192.png', './icons/badge-96.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Réseau d'abord (pour toujours avoir la dernière version), cache en secours.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      return (await caches.match(req)) || (await caches.match('./index.html')) || Response.error();
    }
  })());
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: 'Opale', body: event.data?.text() }; }
  const title = data.title || 'Opale';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag,
    renotify: !!data.tag,
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    data: data.data || {},
    actions: (data.actions || []).slice(0, 2),
    lang: 'fr',
  }));
});

async function notifyClients() {
  const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  list.forEach((c) => c.postMessage({ type: 'refresh' }));
}

self.addEventListener('notificationclick', (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  if ((event.action === 'snooze' || event.action === 'done') && d.taskId && d.token) {
    const cfg = self.OPALE_CONFIG || {};
    const fn = d.fn || `${(cfg.supabaseUrl || '').replace(/\/$/, '')}/functions/v1/notify`;
    event.waitUntil(
      fetch(fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseKey || '' },
        body: JSON.stringify({ action: event.action, uid: d.uid, taskId: d.taskId, token: d.token }),
      }).then(notifyClients).catch(() => {}),
    );
    return;
  }
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = list.find((c) => new URL(c.url).pathname.startsWith(new URL(self.registration.scope).pathname));
    if (existing) { await existing.focus(); existing.postMessage({ type: 'refresh' }); return; }
    await self.clients.openWindow('./#semaine');
  })());
});
