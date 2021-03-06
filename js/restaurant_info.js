let restaurant;
var map;
const new_review_url = 'http://localhost:1337/reviews/';

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  var idbRequest = self.indexedDB.open('RESTAURANTS_DB', 3);
  idbRequest.onupgradeneeded = function(e){
    var db = e.target.result;
    var objectStore = db.createObjectStore('restaurants', {keyPath: 'url'});
    var reviewStore = db.createObjectStore('reviews', {keyPath: 'id'});
    reviewStore.createIndex('url', 'url');  
    reviewStore.createIndex('status', 'status');  
  }
  registerServiceWorker();
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
  setConnectionCheckInterval();
}

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
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.alt = restaurant.name
  image.srcset = DBHelper.imageSrcSetForRestaurant(restaurant);
  image.sizes = '(max-width: 400px) 30vw, (max-width: 540px) 50vw, 100vw';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  document.getElementById('reviews-list').innerHTML = '';
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');  
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  if(!review.updatedAt){
    li.setAttribute('class', 'pending' );
    date.innerHTML = 'pending in offline cache';
  }else{
  var dateObject = new Date(review.updatedAt);
  date.innerHTML = dateObject.getFullYear() + "-" + 
  ("0" + (dateObject.getMonth() + 1)).slice(-2) + "-" + 
  ("0" + dateObject.getDate()).slice(-2) + " " + dateObject.getHours() + ":" + 
  dateObject.getMinutes();

  }
  
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

onReviewSubmit = () => {
  var data = {
  "restaurant_id": self.restaurant.id,
  "name": getValueForId('name'),
  "rating": getValueForId('rating'),
  "comments": getValueForId('comments')
  };
  if(validateData(data)){
    postReviewData(JSON.stringify(data))
    .then((res)=>{
      if(res.ok){
        resetReviews();
        DBHelper.fetchRestaurantReviews(onReviewsReFetched, self.restaurant.id);        
      }
    })
    .catch((err) => onConnectionError(data)); 
  }
  
}

postReviewData = (data) => {
 return fetch(new_review_url, {
    method: 'POST',
    body: data,
    headers:{
      'Content-Type': 'application/json'
    }
  });
}

resetReviews = () => {
  document.getElementById('reviewForm').reset();
}

function getValueForId(id){
  return document.getElementById(id).value;
}

function validateData(data){
    var valid = true;
    if(data.name.length <= 0){
     
      valid = false;
    }
    if(data.rating.length <= 0){
     
      valid = false;
    }
    if(!valid){
      showInfoMessage('Please, fill all * inputs');
    }
    
    return valid;
}
onReviewsReFetched = (err, reviews) => {
  if(!err){
    self.restaurant.reviews = reviews;
    fillReviewsHTML();   
  }
}
onConnectionError = (data) => {
  showErrorMessage('Connection error');
  data.url = '/reviews/?restaurant_id=' + self.restaurant.id;
  DBHelper.cachePendingReviewData(data, (err, success)=>{
    DBHelper.fetchCachedRestaurantReviews(onReviewsReFetched, self.restaurant.id);
    showInfoMessage('Offline: Your review has been cached, once you reconnect, the review will be sent.');
    setConnectionCheckInterval();
  });
}

showErrorMessage = (message) => {
  document.getElementById('messages').innerHTML = '<div class="error">' + message + '</div>';
}
showInfoMessage = (message) => {
  document.getElementById('messages').innerHTML = '<div class="info">' + message + '</div>';
}
showSuccessMessage = (message) => {
  document.getElementById('messages').innerHTML = '<div class="success">' + message + '</div>';
}

setConnectionCheckInterval = () => {
  var reconnecting = setInterval(()=>{
    postPendingData((err, success)=>{
      if(success){
        clearInterval(reconnecting);
        DBHelper.fetchRestaurantReviews(onReviewsReFetched, self.restaurant.id);
        showSuccessMessage('You are connected, all cached data has been sent.');
      }
    });
  },5000);
}

postPendingData = (callback) => {
  var req = indexedDB.open('RESTAURANTS_DB', 3);
  req.onsuccess = () => {
    var db = req.result;
    var tx = db.transaction('reviews', 'readwrite');
    var store = tx.objectStore('reviews');
    var index = store.index('status');

    var data = index.getAll('pending');
    data.onsuccess = () =>{
      if(data.result.length){
        data.result.forEach((review)=>{ 
          console.log(review.data);       
            postReviewData(review.data).then((res)=>{
              if(res.ok){
                iDBRemovePending();
                callback(false, true)
              }
             
            })
        });
      }
      db.close();  
    }
  }
}
iDBRemovePending = ()=>{

var req = indexedDB.open('RESTAURANTS_DB', 3);
req.onsuccess = () => {
  var db = req.result;
  var tx = db.transaction('reviews', 'readwrite');
  var store = tx.objectStore('reviews');
  store.delete('pending');
  db.close();  
}
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
