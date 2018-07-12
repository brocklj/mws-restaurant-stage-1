/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }

  static fetchCashedRestaurants(callback, id = '') {
    var req = indexedDB.open('RESTAURANTS_DB', 3);
    req.onsuccess = function() { 
      var db = req.result;  
      var tx = db.transaction("restaurants", "readwrite");
      var store = tx.objectStore("restaurants");  
      var data = store.get('/restaurants/' + id);
      
      data.onsuccess = () => {
        if(data.result.data){
            var restaurants = JSON.parse(data.result.data);
            DBHelper.fetchCachedRestaurantReviews(function(err, reviews){
              restaurants.reviews = reviews;
              callback(null, restaurants);
              db.close();  
            }, id);                    
          };  
        }        
    }
  }

  static fetchCachedRestaurantReviews(callback, id = '') {
    var req = indexedDB.open('RESTAURANTS_DB', 3);
    req.onsuccess = function() { 
      var db = req.result;  
      var tx = db.transaction("reviews", "readwrite");
      var store = tx.objectStore("reviews");
      var index = store.index('url');        
      var db_url = '?restaurant_id=' + id;
      
      var data = index.getAll('/reviews/' + db_url);
      
      data.onsuccess = () => {       
        if(data.result.length){          
            var restaurants = [];
            data.result.forEach(function(review){              
              restaurants.push(JSON.parse(review.data));
            });  
            callback(null, restaurants);
            db.close();            
          } else{
            callback("No reviews", null);
            db.close();   
          } 
        }        
    }
  }
  
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {        
    let req = new Request(DBHelper.DATABASE_URL + '/restaurants/');   
      fetch(req)
        .then((res)=>{
          if(res.ok){
            res.json().then((restaurants) => callback(null,restaurants));  
          } else {
            const error = (`Request failed. Returned status of ${res.status}`);
            callback(error, null);
          }     
        }).catch(()=>{
          DBHelper.fetchCashedRestaurants(function(err, data){
            callback(null, data)
          });
        });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    let req = new Request(DBHelper.DATABASE_URL + '/restaurants/' + id);    
    fetch(req)
      .then((res)=>{
        if(res.ok){
          res.json().then((data) => {DBHelper.processRestaurantResponse(callback, data)});  
        } else {       
          callback('Restaurant does not exist', null);
        }     
      }).catch(()=>{
        DBHelper.fetchCashedRestaurants(function(err, data){
          callback(null, data)
        }, id);  
      }); 
  }  

  static processRestaurantResponse(callback, restaurantData){
    DBHelper.fetchRestaurantReviews(function(err, reviews){      
      restaurantData.reviews = reviews;
      callback(null, restaurantData);        
    }, restaurantData.id);
  }
  /**
   * Fetch restaurant reviews
   */
  static fetchRestaurantReviews(callback, id){
    let req = new Request(DBHelper.DATABASE_URL + '/reviews/?restaurant_id=' + id);
    fetch(req)
      .then((res)=>{
        res.json().then((jsondata)=>callback(null, jsondata));
      })
  }
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {      
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {       
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {      
      if (error) {
        callback(error, null);
      } else {      
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  static imageSrcSetForRestaurant(restaurant){
    let imgNameType = restaurant.photograph || 0;
    return (`
      /images/${imgNameType}-320-320w.jpg 320w,
      /images/${imgNameType}-400-400w.jpg 400w,
      /images/${imgNameType}-800-800w.jpg 800w
    `);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
