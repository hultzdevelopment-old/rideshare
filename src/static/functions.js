var map;

//Initializes the map
function initialize() { 
	var mapOptions = { 
		zoom: 6, 
	center: new google.maps.LatLng(40.360634, -75.909729), 
		mapTypeId: google.maps.MapTypeId.ROADMAP 
	}; 
	
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	
	var acOptions = {
			types: ['geocode']
	};
	
	var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-bar'),acOptions);
	autocomplete.bindTo('bounds',map);
	
} 


