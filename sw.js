const CACHE_NAME = 'ruiyi-worklog-20260715-v20';
const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css?v=20260712-fix6',
  '/style-app.css?v=20260715-v52',
  '/app.min.js?v=20260715-v37',
  '/custom.css?v=20260715-20',
  '/custom.js?v=20260715-20',
  '/css/bootstrap.min.css',
  '/css/base.css',
  '/css/dashboard.css',
  '/css/calendar.css',
  '/css/customer.css',
  '/css/modal.css',
  '/css/query.css',
  '/css/salary.css',
  '/css/staff.css',
  '/css/stats.css',
  '/css/template.css',
  '/css/utilities.css',
  '/css/work-form.css',
  '/js/bootstrap.bundle.min.js',
  '/js/lib-core.js',
  '/js/pending.js',
  '/js/init.js',
  '/js/dashboard.js',
  '/js/work-form.js',
  '/js/query.js',
  '/js/template.js',
  '/fonts/bootstrap-icons.css',
  '/manifest.json',
  '/manifest.json?v=20260715-20',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(err => {
        console.warn('SW cache.addAll 部分资源失败，继续安装:', err);
        return Promise.resolve();
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname === '/manifest.json' || url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const headers = new Headers(response.headers);
          headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
          return new Response(response.body, { status: response.status, headers });
        })
        .catch(() => caches.match('/manifest.json') || caches.match('/'))
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: '当前离线，无法获取最新数据' }),
        { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      ))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          const copy = response.clone();
          if (response.ok && url.origin === self.location.origin) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match('/'));
      return cached || network;
    })
  );
});
