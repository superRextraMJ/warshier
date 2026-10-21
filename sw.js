/*
 * Service worker untuk Kasir Warung.
 * Halaman memakai network-first agar pembaruan cepat terlihat.
 * Aset lokal memakai cache-first agar aplikasi tetap berjalan offline.
 * Saat mengubah file CSS/JS/gambar, naikkan CACHE_VERSION di bawah.
 */
'use strict';

const CACHE_VERSION = 'kasir-warung-v1.2.2';
const INDEX_URL = new URL('./index.html', self.location.href).href;

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/db.js',
  './js/app.js',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return cache.addAll(PRECACHE_URLS);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_VERSION;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(function (cache) {
              cache.put(INDEX_URL, copy);
            });
            return response;
          }
          /*
           * Jaringan bisa membalas halaman error (misalnya captive portal atau
           * proxy 502) alih-alih gagal total. Jangan tampilkan halaman error itu
           * jika salinan aplikasi tersedia di cache.
           */
          return caches.match(INDEX_URL).then(function (cached) {
            return cached || caches.match('./') || response;
          });
        })
        .catch(function () {
          return caches.match(INDEX_URL).then(function (cached) {
            return cached || caches.match('./') || Response.error();
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      });
    })
  );
});
