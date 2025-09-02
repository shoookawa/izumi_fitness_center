self.addEventListener('install', (event) => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	clients.claim();
});

self.addEventListener('fetch', (event) => {
	// Network-first for HTML to keep router working; otherwise passthrough
	const req = event.request;
	if (req.mode === 'navigate') {
		event.respondWith(
			fetch(req).catch(() => caches.match('/index.html'))
		);
	}
}); 