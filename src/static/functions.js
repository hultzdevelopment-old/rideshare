var map;
var month = ["January","February","March","April","May","June","July","August","September","October","November","December"]

//Initializes the map
function initialize() { 
	var mapOptions = { 
		zoom: 6, 
	center: new google.maps.LatLng(40.360634, -75.909729), 
		mapTypeId: google.maps.MapTypeId.ROADMAP 
	}; 
	
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
} 

