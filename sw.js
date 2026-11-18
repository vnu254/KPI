const CACHE_NAME = 'qlcv-cache-v1';
const STATIC_ASSETS = [
  './',
  './login.html',
  './dashboard.html',
  './assets/css/style.css',
  './assets/js/api.js',
  './assets/js/app.js'
];

// Cài đặt và lưu cache các tệp tĩnh (Giao diện)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Xóa cache cũ khi có phiên bản mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Chặn các request API để luôn lấy dữ liệu mới, chỉ dùng cache cho Giao diện
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Bỏ qua các API gọi tới Google Apps Script (luôn cần mạng)
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Ưu tiên trả về giao diện từ Cache, đồng thời tải ngầm giao diện mới từ mạng
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});