let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

if (!('Promise' in self)) {
  polyfillsNeeded.push('/js/polyfills/promise.js');
}
try {
  new URL('b', 'http://a');
}
catch (e) {
  polyfillsNeeded.push('/js/polyfills/url.js');
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  var idbRequest = self.indexedDB.open('RESTAURANTS_DB', 3);
  idbRequest.onupgradeneeded = function(e){
    var db = e.target.result;
    var objectStore1 = db.createObjectStore('restaurants', {keyPath: 'url'});
    var objectStore2 = db.createObjectStore('reviews', {keyPath: 'url'}); 
  }
  registerServiceWorker();
  fetchNeighborhoods();
  fetchCuisines();  
});

/**
 * Register service worker
 */
registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;

  var indexController = this;

  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    if (!navigator.serviceWorker.controller) {
      return;
    }
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.alt = restaurant.name;
  image.srcset = DBHelper.imageSrcSetForRestaurant(restaurant);
  image.sizes = '(max-width: 480px) 30vw, (max-width: 850px) 50vw, 100vw';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.id =  "top"+restaurant.id;
  name.role = 'header';
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', 'View details of "' + restaurant.name + '"');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  const isFavorite = restaurant.is_favorite === 'true'? true : false;
  const favorite = document.createElement('a');
  favorite.innerHTML = 'Favorite';
  favorite.setAttribute('aria-label', isFavorite? 'Unmark "' + restaurant.name + '"as favorite' : 'Mark "' + restaurant.name + '"as favorite');
  favorite.setAttribute('onclick', 'toggleFavorite('+ restaurant.id +')');
  favorite.setAttribute('id', 'restaurant-'+ restaurant.id +'');
  favorite.setAttribute('class', 'favorite-btn ' + (isFavorite? 'favorite': '') + '' );  
  favorite.setAttribute('data-isfavorite', isFavorite? 'true' : 'false');
  li.append(favorite);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}


showMap = (el) => {
  let mapContainer = document.getElementById('map-container');
  if(mapContainer.style.display === 'none'){
    mapContainer.style.display = 'block';
    el.innerHTML = 'Hide map';
  } else {
    mapContainer.style.display = 'None';
    el.innerHTML = 'Show map';

  }
}

toggleFavorite = (id) => {
    let element = document.getElementById('restaurant-' + id);
    const initialState = element.getAttribute('data-isfavorite'); 
    DBHelper.setRestaurantFavorite(id, initialState, (err, success)=>{
      const value = initialState === 'false'? 'favorite' : '';
      element.setAttribute('class', 'favorite-btn '+ value);
      element.setAttribute('data-isfavorite', (initialState=='true'? 'false': 'true'));
    });

}
