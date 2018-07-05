var contentCache = 'restaurant-stage1-v2';
var imageCache = 'restaurant-stage1-imgs';
const DATABASE_URL = 'http://localhost:1337';
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
    if(url.origin === DATABASE_URL){
        var res = getJsonResponse(e.request);
        console.log(res);
        e.respondWith(res);
        return;
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

  var idbRequest = self.indexedDB.open('RESTAURANTS_DB', 2);
  idbRequest.onupgradeneeded = function(event){
      var db = event.target.result;
      var listStore = db.createObjectStore('restaurants', {keyPath: "url"});      
  }

  idbRequest.onsuccess = function() {
    var db = idbRequest.result;
  }

  function getJsonResponse(request) {
      var url = new URL(request.url);      
        return fetch(request).then(function(res){        
            if(res.ok){
                saveToIDb(res.clone());
                return res;       
            }
        }).catch(function(err){
            return respondFromIDb(request);
        });
  }

  function respondFromIDb(request) {   
        var db = idbRequest.result;
        var tx = db.transaction("restaurants", "readwrite");
        var store = tx.objectStore("restaurants");
        var data = store.get(request.url);    
        return data;
  }


  function saveToIDb(response) {      
    response.json().then(function(json){            
            var db = idbRequest.result;
            var tx = db.transaction("restaurants", "readwrite");
            var store = tx.objectStore("restaurants");
            store.put({url: response.url, data: json});
    });
}