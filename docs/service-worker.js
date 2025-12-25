"use strict";
/// <reference lib="webworker" />
const sw = self;
const CACHE_NAME = 'climbing-notes-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './main.js',
    './manifest.webmanifest',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
].map((path) => new URL(path, sw.location.href).toString());
sw.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => sw.skipWaiting()));
});
sw.addEventListener('activate', (event) => {
    event.waitUntil(caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
        .then(() => sw.clients.claim()));
});
sw.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET')
        return;
    const requestUrl = new URL(event.request.url);
    const isNavigation = event.request.mode === 'navigate';
    const cachedRoot = STATIC_ASSETS[0];
    if (isNavigation) {
        event.respondWith((async () => {
            try {
                return await fetch(event.request);
            }
            catch {
                const cached = await caches.match(cachedRoot);
                if (cached)
                    return cached;
                return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
            }
        })());
        return;
    }
    if (requestUrl.origin === sw.location.origin) {
        event.respondWith((async () => {
            const cached = await caches.match(event.request);
            if (cached)
                return cached;
            return await fetch(event.request);
        })());
    }
});
