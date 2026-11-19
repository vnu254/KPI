const CACHE_NAME = 'qlcv-cache-v6';
const STATIC_ASSETS = [
  './',
  './login.html',
  './dashboard.html',
  './assets/css/style.css',
  './assets/js/api.js',
  './assets/js/app.js',
  './assets/js/kpi-export.js',
  './pages/kpi-monthly.html'
];

// Cài đặt và lưu cache từng tệp tĩnh an toàn (1 tệp lỗi không làm hỏng toàn bộ SW)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

// Xóa toàn bộ cache phiên bản cũ (v1 -> v4) khi kích hoạt bản mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Ưu tiên tải bản mới nhất từ mạng (Network-First), chỉ dùng Cache khi mất mạng
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Bỏ qua các API gọi tới Google Apps Script (luôn đi thẳng qua mạng)
  if (
    url.hostname === 'script.google.com' ||
    url.hostname === 'script.googleusercontent.com'
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          return (
            cachedResponse ||
            new Response('Không có kết nối mạng và chưa có dữ liệu lưu đệm.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            })
          );
        })
      )
  );
});