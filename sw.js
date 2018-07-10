var contentCache = 'restaurant-stage1-v3';
var imageCache = 'restaurant-stage1-imgs-v3';
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
        e.waitUntil(getJsonResponse(e.request));
    }
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

  function getJsonResponse(request) {
      var url = new URL(request.url);      
        return fetch(request).then(function(res){        
            if(res.ok){
                saveToIdbCache(url, res.clone());
                return res;       
            }
        });
  }

  function saveToIdbCache(url, response) {        
    response.json().then(function(jsonData){
            var idbRequest = indexedDB.open('RESTAURANTS_DB', 3);
            idbRequest.onsuccess = ()=>{
                var db = idbRequest.result;
                
                if(url.pathname.startsWith('/reviews/')){
                    jsonData.forEach(function(review){
                        var tx = db.transaction("reviews", "readwrite");
                        var store = tx.objectStore("reviews");                    
                        
                        var putReq = store.put({id: review.id, url: url.pathname + url.search, data: JSON.stringify(review), status: 'cached'});
                            putReq.onsuccess = function(e){
                                db.close();
                            }
                    });                   
                   
                }

                if(url.pathname.startsWith('/restaurants/')){
                    var tx = db.transaction("restaurants", "readwrite");
                    var store = tx.objectStore("restaurants");
                    var putReq = store.put({url: url.pathname, data: JSON.stringify(jsonData)});
                    putReq.onsuccess = function(e){
                        db.close();
                    }
                }               
               

            }          
          
    });
}