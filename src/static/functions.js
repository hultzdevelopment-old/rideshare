var map;
var autocomplete;
var infoWindow;
var marker;
var geocoder;
var windows = new Array();

var mycollege = new College("Albright College","Reading, PA",40.360634,-75.909729);

//Initializes the map
function initialize() { 
	//create map options and initialize the map
	var mapOptions = { 
		zoom: 6, 
		center: new google.maps.LatLng(mycollege.lat, mycollege.lng), 
		mapTypeId: google.maps.MapTypeId.ROADMAP 
	}; 
	
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	
	//create autocomplete input
	var acOptions = {
			types: ['geocode']
	};
	autocomplete = new google.maps.places.Autocomplete(document.getElementById('search-bar'),acOptions);
	autocomplete.bindTo('bounds',map);
	
	//initialize window, geocode, and marker objects
	infoWindow = new google.maps.InfoWindow();
	marker = new google.maps.Marker({
		map: map
	});
	geocoder = new google.maps.Geocoder();
	
	putListener();
}

//open info window at specified position and with specified content
function windowOpen(pos, con){
    var window = new google.maps.InfoWindow({position:pos, content:con});
    
    google.maps.event.addListener(window,"closeclick",function(){
             putListener();
             });
    google.maps.event.removeListener(clickListener);
    
    if (windows.length !=0){
         windows.pop().close();
         windows.push(window);
         window.open(map);
    } else {
        windows.push(window);
        window.open(map);        
    }
}

//takes a latLng and converts to a usable address
function getAddress(event){
	setTimeout(function(){
		geocoder.geocode({latLng:event.latLng}, showAddressClick);
    }, 0);
}

//reverse geocodes an address from latLng and starts ride pop ups
function showAddressClick(results, status){
    if (!status || status != google.maps.GeocoderStatus.OK) {
        alert("Geocode Failed. Status:" + status); 
    } else {
        var point = results[0].geometry.location;
        windowOpen(point, getBeginRideHTML(point.lat(), point.lng(), results[0].formatted_address));
    }
}


//returns first popup html to create a ride
function getBeginRideHTML(lat, lng, address){
    var html = "<b>What would you like to do?</b><br>";
    
    html += "<input onclick=\"startRideCreationPopup(" + lat + ", " + lng + ", '" + address + "');\" type=\"radio\" />Create a new Ride<br>";

    return html;
}

//opens the window to create a new ride
function startRideCreationPopup(lat, lng, address){
	windowOpen(new google.maps.LatLng(lat, lng), getRideCreationHTML(lat, lng, address));
}

//returns new ride creation html form that decides the direction of the ride
function getRideCreationHTML(lat, lng, address){
    var html = "<b>Create a New Ride</b><hr>";

    html += "<form><p style=\"text-align: left;\">";

    html += "<input onclick=\"startPassengerOrDriverPopup(" + lat + ", " + lng + ", '" 
              + address + "', 0);\" type=\"radio\" name=\"rideType\" value=\"0\" id=\"rideType\" />From <b>" + mycollege.name + "</b> to <br><b>";

    html += address + "</b><br>";

    html += "<input onclick=\"startPassengerOrDriverPopup(" + lat + ", " + lng + ", '" 
              + address + "', 1);\" type=\"radio\" name=\"rideType\" value=\"1\" id=\"rideType\" />From <b>" + address + "</b> <br>to <b>";
    
    html += mycollege.name + "</b></p></form>";

    return html;
}

//opens the window to create a new ride
function startPassengerOrDriverPopup(lat, lng, address, eventID){
	windowOpen(new google.maps.LatLng(lat, lng), getPassengerOrDriverHTML(lat, lng, address, eventID));
}

//returns html form for determining passenger or driver
function getPassengerOrDriverHTML(lat, lng, address, eventID){
    var html = "<b>Create a New Ride</b><hr>";

    html += "<form><p>";
    
    html += "<input onclick=\"startRideInfoPopup(" + lat + ", " + lng + ", '"
            + address + "', " + eventID + ", " + "true);\" type=\"radio\" name=\"driver\" value=\"0\" /> I will drive <br>";
    
    html += "<input onclick=\"startRideInfoPopup(" + lat + ", " + lng + ", '"
            + address + "', " + eventID + ", " + "false);\" type=\"radio\" name=\"driver\" value=\"1\" /> I am looking for a ride <br>";
    
    html += "</form></p>";
    
    if(eventID == "0"){
    	html += "<p>From:<br> " + mycollege.name + "<br>To: <br>" + address
    } else if(eventID == "1"){
    	html += "<p>From:<br> " + address + "<br>To: <br>" + mycollege.name
    }
    
    return html;
}

//opens the window to fill in all ride info
function startRideInfoPopup(lat, lng, address, eventID, isDriver){
	windowOpen(new google.maps.LatLng(lat, lng), getRideInfoHTML(lat, lng, address, eventID, isDriver));
}

//returns html form for complete ride info
function getRideInfoHTML(lat, lng, address, eventID, isDriver){
    var html = "<b>Create a New Ride</b><hr>";
    
    html +="<div id=\"ride-info\">Please ensure that your address is as specific as possible<br>" +
    "(<i>37 </i> Main Street, not <i>30-50</i> Main Street)<br>"
    
    html += "<div id=\"from-text\">From <input type=\"text\" id=\"textFrom\" name='textFrom' size=\"50\"";
    
    //check to see the order of the destinations and fill in From and To
    if (eventID == "0"){
    	html += "value='"+mycollege.name + "'readonly='readonly'";
    } else {
    	html += "value='"+ address +"'";
    }
    html += "></div>";
    
    html += "<div id=\"to-text\">To <input type=\"text\" id=\"textTo\" name='textTo' size=\"50\"";
    if (eventID == "0"){
    	html += "value='"+ address +"'";
    } else {
    	html += "value='"+ mycollege.name + "'readonly='readonly'";
    }
    html += "><br></div>";
    
    //only add the max passenger option if the person is a driver
    html += "<div id=\"max-pass\">";
    if (isDriver) {
    	 html += "Maximum number of passengers: <input type=\"text\" name=\"maxp\" id=\"maxp\" maxLength=\"2\" size=\"3\" value=\"2\"><br></div>";
    }
    
    html += "<div id=\"phone-num\">Contact Phone Number: " + 
    	"<input type=\"text\" name=\"number\" id=\"number\" maxlength=\"12\" size=\"10\"></div>";
    
    
    html += "<div id=\"time-of-depart\">Time of Departure: <br><select name=\"earlylate\" id=\"earlylate\">" +
    	"<option value=\"0\" selected=\"selected\">Early</option>" + 
    	"<option value=\"1\">Late</option></select>";
    
    html += "<select name=\"partofday\" id=\"partofday\">" +
    	"<option value=\"0\" selected=\"selected\">Morning</option>" + 
    	"<option value=\"1\">Afternoon</option>" +
    	"<option value=\"2\">Evening</option></select>";
    
    html += "<select name=\"month\" id=\"month\" onchange=\"changeDays(document.getElementById('day'), this); return false;\">" + getMonthOptions() + "</select>";
    html += "<select name=\"day\" id=\"day\">" + getDayOptions(document.getElementById('month')) + "</select>";
    html += "<select name=\"year\" id=\"year\">" + getYearOptions() + "</select>";
    

    
    html += "<br>Comments: <input type=\"text\" id=\"ridecomment\" name=\"ridecomment\" size=\"50\">"
    html += "<div id=\"buttons\"><input type=\"submit\" id=\"submit\" name=\"submit\" " + 
    "value=\"Okay\" onclick=\"verifyNewRidePopup("+ lat +", "+ lng +", '"+ address +"', "+ isDriver +"); return false;\"'>" + 
    "<input type=\"button\" id=\"cancel\" name='cancel' value='Cancel' onclick='windows.pop().close(); putListener();'></div>" + 
    "<input type=\"hidden\" name=\"driver\" value=\""+ isDriver +"\">";
    
    return html

	
}


//Find the address entered in the search box and opens an info window
function showAddress(){
	infoWindow.close();
	
	var place = autocomplete.getPlace();
	
	if (place.geometry.viewport){
		map.fitBounds(place.geometry.viewport);
	} else {
		map.setCenter(place.geometry.location);
		map.setZoom(15);
	}
	
	infoWindow.setPosition(place.geometry.location);
	infoWindow.setContent('<div><strong>' + place.formatted_address + '</strong></div>');
	infoWindow.open(map);
	
	google.maps.event.addListener(marker,'click', function(e){
		infoWindow.open(map, marker);
	});	
}

//Convience function to add a click listener to the map
function putListener(){
   clickListener = google.maps.event.addListener(map, "click", getAddress);
}

//Create a dropdown list of months with this month selected.
function getMonthOptions() {
	console.log("month-options")
    var today = new Date();
    var monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var html = "";
    for (i=0; i < monthList.length; i++) {
    	html += '<option value="'+(i+1)+'" ';
    	if (today.getMonth() == i) {
    		html += 'selected="true" ';
    	}
    	html += '>' + monthList[i] + '</option>';
    }
    return html;
}

//Creates a dropdown list of the current days
function getDayOptions(month){
	console.log(month)
    var days = getMonthDays(month);
	var html = "";
	for (var i=1; i<days; i++){
		html += "<option value=\"" + i + "\">" + i + "</option>";
	}
	return html;
}

// Creates a dropdown list of the past year and 3 more
function getYearOptions(){
	console.log("year-options")
    var today = new Date();
    var yr = today.getFullYear();
    var html = "";
    for (var i = yr; i < yr+4; i++){
        html += "<option value=\"" + i + "\">" + i + "</option>";
    }
    return html;
}

//Modifies the pull-down list for days according to what is selected for the month
function changeDays(day, month){
    removeAllOptions(day);
    for(var i = 1; i < 29; i++){
        addOption(day, i.toString(), i.toString());
    }
    if(month.options.valueOf().selectedIndex == 0 || month.options.valueOf().selectedIndex == 2 || 
    		month.options.valueOf().selectedIndex == 4 || month.options.valueOf().selectedIndex == 6 ||
    		month.options.valueOf().selectedIndex == 7 || month.options.valueOf().selectedIndex == 9 || 
    		month.options.valueOf().selectedIndex == 11){
    	
        addOption(day, "29", "29",false);
        addOption(day, "30", "30",false);
        addOption(day, "31", "31",false);
        
    } else if(month.options.valueOf().selectedIndex == 3 || month.options.valueOf().selectedIndex == 5 || 
    		month.options.valueOf().selectedIndex == 8 || month.options.valueOf().selectedIndex == 10){
    	
        addOption(day, "29", "29",false);
        addOption(day, "30", "30",false);
    } 
}

//Returns the number of days in a certain month
function getMonthDays(month){
	var monthDays = {
			"January": 31,
			"February": 28,
			"March": 31,
			"April": 30,
			"May": 31,
			"June": 30,
			"July": 31,
			"August": 31,
			"September": 30,
			"October": 31,
			"November": 30,
			"December": 31};
	mon = month.options.selectedIndex;
	console.log(mon)
	return monthDays[mon];
	
}

//Clears a drop-down list
function removeAllOptions(selectbox){
    var i;
    for(i=selectbox.options.length-1;i>=0;i--){
    	selectbox.remove(i);
    }
}

//Adds an option to a select list
function addOption(selectbox, value, text, select){
    var optn = document.createElement("option");
    optn.text = text;
    optn.value = value;
    if (select){
    	optn.selected = "true";
    }

    selectbox.options.add(optn);
}

//Class that stores information about the college
function College(name, address, lat, lng){
	this.name = name;
	this.address = address;
	this.lat= lat;
	this.lng= lng;
}



