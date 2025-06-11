// install → одразу активуємося 
self.addEventListener('install', () => self.skipWaiting()); 
// activate → відписуємося та оновлюємо вкладки 
self.addEventListener('activate', () => { 
    self.registration
      .unregister()
      .then(() =>
        self.clients
          .matchAll()
          .then((clients) => clients.forEach((c) => c.navigate(c.url)))
      ); 
});