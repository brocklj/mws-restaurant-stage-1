var contentCache = 'restaurant-stage1-v2';
var imageCache = 'restaurant-stage1-imgs';

var allCaches = [
    contentCache,
    imageCache
];

self.addEventListener('install', function(e){
    e.waitUntil(
        caches.open(contentCache).then(function(cache){
            return cache.addAll([
                '/',
                '/restaurant.html',
                '/js/main.js',
                '/js/restaurant_info.js',
                '/js/dbhelper.js',
                '/css/styles.css'
            ])
        })
    )
});

self.addEventListener('activate', function(e){
    e.waitUntil(
        caches.keys().then(function(cacheNames){
            return Promise.all(
                cacheNames.filter(function(name){
                    return name.startsWith('restaurant-') &&
                        !allCaches.includes(name);
                })
                .map(function(name){
                    return caches.delete(name);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(e) {
    let url = new URL(e.request.url);

    if (url.origin === location.origin) {
      if (url.pathname === '/') {
        e.respondWith(caches.match('/'));
        return;
      }
      if (url.pathname.startsWith('/restaurant.html')) {
        e.respondWith(caches.match('/restaurant.html'));
        return;
      }
      if (url.pathname.startsWith('/images/')) {
        e.respondWith(getImage(e.request));
        return;
      }
    }
    e.respondWith(
      caches.match(e.request).then(function(response) {
        return response || fetch(e.request).catch(function(err) {
                console.log(err);       // fallback mechanism           
            });
      })
    );
  });

  function getImage(request) {
    var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
  
    return caches.open(imageCache).then(function(cache) {
      return cache.match(storageUrl).then(function(response) {
        if (response) return response;
        return fetch(request).then(function(serverResponse) {
          cache.put(storageUrl, serverResponse.clone());
          return serverResponse;
        });
      });
    });
  }