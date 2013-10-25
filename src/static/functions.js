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

//Used to populate the select boxes
function addOption(selectbox, text, value, selected){
	var optn = document.createElement("OPTION");
    optn.text = text;
    optn.value = value;
    if (selected == "true"){
    	optn.selected=selected
    }
    selectbox.options.add(optn);
}

// Used to add all months to a drop-down list
function monthOptions(selectbox_id){
	var dropdown = document.getElementById(selectbox_id);
	if (dropdown) {
		var today = new Date();
	    for (var i=0; i < month.length;++i){   
	    	if (today.getMonth() == i) {
	    		addOption(dropdown, month[i], month[i],"true");
	    	} else {
	    		addOption(dropdown, month[i], month[i], "false");
	    	}
	    }
	}
}

// Populates the pull-down list for years.  Uses previous year and the following 3
function yearOptions(selectbox_id){
	var dropdown = document.getElementById(selectbox_id);
	if (dropdown) {
		var today = new Date();
	    var yr = today.getFullYear();
	    for (var i = yr-1; i < yr+4; i++){
	    	if (i == yr){
	    		addOption(dropdown, i, i, "true");
	    	} else{
	    		addOption(dropdown, i, i, "false");
	    	}
	    }
	}
}

//Clears a drop-down list
function removeAllOptions(selectbox)
{
    var i;
    for(i=selectbox.options.length-1; i>=0; i--) {
    	selectbox.remove(i);
    }
}
