var map;
var autocomplete;
var infoWindow;
var geocoder;
var windows = new Array();
var rides = new Array();
var newRideInfo = new Array();
var clickListener;

var mycollege = new College("Albright College","Reading, PA",40.360634,-75.909729);

//Initializes the map
function initialize(message) { 
	
	var request = new XMLHttpRequest();
	var today = new Date();
	request.open("GET","/getrides?after="+today.getFullYear()+"-"+(today.getMonth()+1)+"-"+today.getDate(), false);
	request.send(null);
	if (request.status == 200) {
	    // loop over all
	    rides = eval(request.responseText);
	    for (r in rides) {
	    	var tod = rides[r].ToD;
	    	rides[r].ToD = new Date(tod.substring(0,4),tod.substring(5,7)-1,tod.substring(8,10));
	    }
	}
	
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
	geocoder = new google.maps.Geocoder();
	
	putListener();
	
	//clear the filter dates options
	var begin_date = document.getElementById('begindate');
	var end_date = document.getElementById('enddate');
	begin_date.value = "";
	end_date.value = "";
	
	
	for(var ride in rides){
		addRideToMap(rides[ride], ride);
	}
	
	makeRideTable();
	
	if(typeof message == 'string'){
		alert(message);
	}

}

//Fill in table on main page that lists all ride information
function makeRideTable() {
    var table = document.getElementById("rideTableBody");
    
    //delete all table rows to recreate them
    for(var i = table.rows.length; i > 0; i--) {
    	table.deleteRow(i-1);
    }
   
    for (var r in rides){
    	var row = table.insertRow(table.rows.length);
    	var col_0 = row.insertCell(0);
        if (rides[r].drivername != null){
        	col_0.innerHTML = '<a href="/driverrating?drivernum=' + rides[r].driver + '">'+ rides[r].drivername + '</a>';
        } else {
        	col_0.innerHTML= "needs driver";
        }
        
        var col_1 = row.insertCell(1);
        col_1.innerHTML = rides[r].max_passengers - rides[r].num_passengers;
        
        var col_2 = row.insertCell(2);
        col_2.innerHTML = rides[r].start_point_title;
        
        var col_3 = row.insertCell(3);
        if (rides[r].driver == "needs driver") {
        	col_3.innerHTML = '<a href="#" onClick="addDriverToRideNumber(' + r + ')">' + rides[r].destination_title + '</a>';
        } else {
        	col_3.innerHTML = '<a href="#" onClick="joinRideByNumber(' + r + ')">' + rides[r].destination_title + '</a>';
        }
        var col_4 = row.insertCell(4);
        var myToD = rides[r].ToD;
        
        col_4.innerHTML = rides[r].part_of_day + " " + convertMonthNum(myToD.getMonth()) + " " + 
        					myToD.getDate() + ", " + myToD.getFullYear();
        
        var col_5 = row.insertCell(5);
        col_5.innerHTML = rides[r].comment;
    }
}

//open info window at specified position and with specified content
function windowOpen(pos, con){
	
    var window = new google.maps.InfoWindow({position:pos, content:con});
    google.maps.event.removeListener(clickListener);
    
    google.maps.event.addListener(window,"closeclick",function(){
             putListener();
             });
    
    if (windows.length != 0){
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
        alert("Geocoding for that address failed. Please try again!"); 
    } else {
        var point = results[0].geometry.location;
        
        newRideInfo = {};
        newRideInfo.lat = point.lat();
        newRideInfo.lng = point.lng();
        newRideInfo.address = results[0].formatted_address;
        beginRideCreationPopup();
    }
}

//finds an address from the search box and starts ride pop ups
function showAddressSearchBox(){   
	var place = autocomplete.getPlace();
	var point = place.geometry.location;
	
	newRideInfo = {};
	newRideInfo.lat = point.lat();
	newRideInfo.lng = point.lng();
	newRideInfo.address = place.formatted_address;
	beginRideCreationPopup();   
}


//returns first popup html to create a ride
function beginRideCreationPopup(){
    var html = '<b>What would you like to do?</b><br>';
    html += '<input onclick="startRideDirectionPopup();" type="radio">Create a new Ride<br>';
    windowOpen(new google.maps.LatLng(newRideInfo.lat, newRideInfo.lng), html);
}

//creates the new ride creation html form that decides the direction of the ride
function startRideDirectionPopup(){
	newRideInfo.college = mycollege.name
    var html = '<b>Create a New Ride</b><hr>';
    html += '<form><p style="text-align: left;">';
    html += '<input onclick="startPassengerOrDriverPopup(\'fromcollege\');" type="radio" name="rideType">' + 
    		'From <b>{college}</b> to <br> <b>{address}</b> <br>';

    html += '<input onclick="startPassengerOrDriverPopup(\'tocollege\');" type="radio" name="rideType">' +
    		'From <b>{address}</b> <br> to <b>{college}</b> </p></form>';
    
    var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(newRideInfo);

    windowOpen(new google.maps.LatLng(newRideInfo.lat, newRideInfo.lng), html_code);
}

//popup following ride creation for determining passenger or driver
function startPassengerOrDriverPopup(direction){
	newRideInfo['direction'] = direction;
	
	if (direction == 'fromcollege'){
		newRideInfo['start_point'] = mycollege.name;
		newRideInfo['destination'] = newRideInfo.address;
		
	} else if(direction == 'tocollege'){
		newRideInfo['start_point'] = newRideInfo.address;
		newRideInfo['destination'] = mycollege.name;
	}
	
    var html = '<b>Create a New Ride</b><hr>';
    html += '<form><p>';
    html += '<input onclick="startRideInfoPopup(\'isDriver\');" type="radio" name="driver">I will drive <br>';
    html += '<input onclick="startRideInfoPopup(\'notDriver\');" type="radio" name="driver">I am looking for a ride <br>';
    html += "</form></p>";
    
    if(direction == "fromcollege"){
    	html += '<p>From: <br> {college} <br> To: <br> {address}';
    } else if(direction == "tocollege"){
    	html += '<p>From: <br> {address} <br> To: <br> {college}';
    }
    
    var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(newRideInfo);
    
    windowOpen(new google.maps.LatLng(newRideInfo.lat, newRideInfo.lng), html_code);
}

//popup window that collects the rest of the ride info
function startRideInfoPopup(driverInfo){
	driverInfo = (typeof driverInfo == 'undefined') ? '': driverInfo;
	
	if(driverInfo == 'isDriver'){
		newRideInfo['isDriver'] = true;
	}else if(driverInfo == 'notDriver'){
		newRideInfo['isDriver'] = false;
	}
	
    var html = '<b>Ride Info</b><hr>';
    html += 'Please ensure that your address is as specific as possible<br>' + 
    		'(<i>37 </i> Main Street, not <i>30-50</i> Main Street)<br>'
    
    html += 'From <input type="text" id="textFrom" name="textFrom" size="50" value="{start_point}"><br>'
    
    html += 'To <input type="text" id="textTo" name="textTo" size="50" value="{destination}"><br>';
    
    //only add the max passenger option if the person is a driver
    if (newRideInfo.isDriver) {
    	 html += 'Maximum number of passengers: <input type="text" name="maxp" id="maxp" value="" ' +
    	 		'maxLength="2" size="3"><br>';
    }
    //contact phone number
    html += 'Contact Phone Number: <input type="text" name="number" id="number" value="" maxlength="12" size="10"><br>';
    
    //time of depart_time_timeure
    html += 'Time of departure: <br><select name="earlylate" id="earlylate">' +
    		'<option value="Early" selected="selected">Early</option>' + 
    		'<option value="Late">Late</option></select>';
    
    html += '<select name="partofday" id="partofday">' +
    		'<option value="Morning" selected="selected">Morning</option>' + 
    		'<option value="Afternoon">Afternoon</option>' +
    		'<option value="Evening">Evening</option></select>';
    
    //fill in month, day, and year selectors
    html += '<select name="month" id="month" onchange="changeDays(document.getElementById(\'day\'), this); return false;">'
    		+ getMonthOptions() + '</select>';
    html += '<select name="day" id="day">' + getTodayDayOptions() + '</select>';
    html += '<select name="year" id="year">' + getYearOptions() + '</select>';
    
    //additional comments and submit / cancel buttons
    html += '<br>Comments:<br> <textarea style="resize:vertical" id="ridecomment" name="ridecomment" rows="2" cols="40"></textarea><br>'
    html += '<input type="submit" id="submit" name="submit" value="Okay" onclick="verifyRideInfo(); return false;">'  
    html += '<input type="button" id="cancel" name="cancel" value="Cancel" onclick="windows.pop().close(); putListener();">'
    
    var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(newRideInfo);
    
    windowOpen(new google.maps.LatLng(newRideInfo.lat, newRideInfo.lng), html_code);
}

function verifyRideInfo(){
	//get all entered values from the user to verify correctness
	var to = document.getElementById("textTo").value;
	var from = document.getElementById("textFrom").value;
    var earlylate = document.getElementById("earlylate").value;
    var partofday = document.getElementById("partofday").value;
    var month = document.getElementById("month").value;
    var day = document.getElementById("day").value;
    var year = document.getElementById("year").value;
    var comment = document.getElementById("ridecomment").value;
    var number = document.getElementById("number").value;
    
    if(newRideInfo.isDriver){
    	var maxp = document.getElementById("maxp").value;
    } else {
    	var maxp = "3";
    }
    
    var goodContact = false;
    goodContact = validatePhoneNumber(number);
    
    var currentTime = new Date();
    currentTime.setHours(0,0,0,0);
    var rideDate = new Date(year, month, day);
    
    //make sure that the number of passengers is just numbers
    var badmaxp = false;
    if (/[^0-9-]+/.test(maxp)) {
    	badmaxp = true;
    }
    
    //Ensure valid number is supplied
    if (! goodContact){S
        alert("Please supply a valid ten-digit contact number.");   
    } 
    // Ensure to and from are filled
    else if (to == '') {
        alert("Please supply a destination.");
        
    } else if (from == '') {
    	alert("Please supply a start point.");
    	
    }
    // Ensure maxp is filled
    else if (newRideInfo.isDriver && (maxp == '' || badmaxp)) {
        alert("Please supply a valid maximum number of passengers.");
        
    }
    // test date.. make sure it is in the future
    
    else if (rideDate < currentTime) {
    	alert("The date for the ride must be sometime in the future " + rideDate);
    	
    }
    // Bring up confirm window
    else {
    	number = number.replace(/-/g,"");
        number = number.replace(/ /g,"");
        number = number.replace(/\./g,"");
    	number = number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6);
    	
    	newRideInfo['start_point'] = from;
    	newRideInfo['destination'] = to;
    	newRideInfo['maxp'] = maxp;
    	newRideInfo['contact'] = number;
    	newRideInfo['earlylate'] = earlylate;
    	newRideInfo['partofday'] = partofday;
    	newRideInfo['month'] = month;
    	newRideInfo['day'] = day;
    	newRideInfo['year'] = year;
    	newRideInfo['comment'] = comment;

        startConfirmInfoWindow();
    }      
}

function startConfirmInfoWindow(){ 
    var html = '<b>Is the following information correct?</b><br>';
    html += '<b>From:</b> {start_point} <br>';
    html += '<b>To:</b> {destination} <br>';
    
    html += '<b>Departing:</b> {earlylate} {partofday} ';
    html += convertMonthNum(newRideInfo.month) + ' {day} {year}<br>';
    
    html += '<b>Maximum passengers:</b> {maxp} <br>';
    html += '<b>Contact Number:</b> {contact} <br>';
    html += '<b>Comment:</b> <br> {comment} <br>'
    html += '<form>';
    html += '<input type="button" id="submit" name="submit" value="Submit Info" onclick="saveRide()">';
    html += '<input type="button" id="cancel" name="cancel" value="Back" onclick="startRideInfoPopup();"></form>';
    
    var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(newRideInfo);
    
    windowOpen(new google.maps.LatLng(newRideInfo.lat, newRideInfo.lng), html_code);
}

//saves the ride and refreshes the map
function  saveRide() {
    var request = new XMLHttpRequest();
    var reqStr = '/newride?';
    
    for (var prop in newRideInfo) {
    	reqStr += prop + "=" + newRideInfo[prop] + "&";
    }
    reqStr = encodeURI(reqStr.slice(0, -1));
    
    console.log(reqStr);
    
    request.open("GET", reqStr, false);
    request.send(null);
    putListener();
    if (request.status == 200) {
    	initialize();
    } else {
    	alert("An error occurred, check your responses and try again.");
    }
}

//Adds ride markers to the map
function addRideToMap(ride, rideNum){
    if (ride.driver == "needs driver") {
    	//ride needs a driver and is going from home to college
    	if (ride.destination_title == mycollege.name) {
    		var new_marker = new google.maps.Marker({
    			position:new google.maps.LatLng(ride.start_point_lat, ride.start_point_long)
    		});
        
    	//ride needs a driver and is going from college to home
    	} else {
    		var new_marker = new google.maps.Marker({
    			position:new google.maps.LatLng(ride.destination_lat, ride.destination_long)
    		}); 
    	}
        google.maps.event.addListener(new_marker, "click", function(){
        	if (new_marker.getPosition()) {
        		windowOpen(new_marker.getPosition(), addDriverPopup(ride, rideNum, new_marker.getPosition().lat(), new_marker.getPosition().lng()));
        	}
        });

    //ride has a driver and is going from home to college
    } else if (ride.destination_title == mycollege.name){
    	var new_marker = new google.maps.Marker({
    		position:new google.maps.LatLng(ride.start_point_lat, ride.start_point_long)
    	});
        google.maps.event.addListener(new_marker, "click", function(){
        	if (new_marker.getPosition()) {
        		viewRideInfo(ride, rideNum, new_marker.getPosition().lat(), new_marker.getPosition().lng());
        	}
        });
        
    //ride has a driver and is going from college to home
    } else if (ride.start_point_title == mycollege.name) {
        var new_marker = new google.maps.Marker({
        	position:new google.maps.LatLng(ride.destination_lat, ride.destination_long)
        });
        google.maps.event.addListener(new_marker, "click", function(){
        	if (new_marker.getPosition()) {
        		viewRideInfo(ride, rideNum, new_marker.getPosition().lat(), new_marker.getPosition().lng());
        	}
        });   
    }
   
    ride.marker = new_marker;
    new_marker.setMap(map);
    
    return ride.marker; 
}



//Returns the HTML to be contained in a popup window in the GMap
//Asks whether the user wants to join this ride
function viewRideInfo(ride, rideNum, lat, lng){
/*
* ride -- a full ride object as constructed in index.html
* rideNum  - the index of the ride in the rides array in index.html
* lat -- latitude
* lng -- longitude 
*/
	ride.rideNum = rideNum;
	var msg;
	var space_left = ride.max_passengers - ride.num_passengers;
	
	if (space_left < 1){
		msg = 'This ride is full';
	} else if (space_left == 1) {
		msg = 'Can take ' + space_left + ' more person';
	} else {
		msg = 'Can take ' + space_left + ' more people';
	}
	
	var disabled;
	var today = new Date();

	if ((ride.ToD - new Date(today.getFullYear(), today.getMonth(), today.getDate())) == 0){
		disabled = 'disabled="disabled"';
		msg = 'It is too late to join this ride. <br>You might try to call the driver directly at: {contact}';
	} else if (ride.max_passengers <= ride.num_passengers) {
		disabled = 'disabled="disabled"';
	} else {
		disabled = '';
	}
	
	var html = 'Driver: {drivername} <br> <i>{start_point_title}</i> --> <i>{destination_title}</i>' + 
				'<br>Departure Time: {part_of_day} ' + convertMonthNum(ride.ToD.getMonth()) + ' ' + ride.ToD.getDate() + ' ' + 
				ride.ToD.getFullYear() + ' <br>' + msg;

	html += '<br> {comment} <br>';

	html += '<br><input type="submit" id="submit" ' + disabled + 'value="Join this Ride" ' + 
			'onclick="addPassengerPopup({rideNum}, ' + lat + ', ' + lng + '); return false;">'
 
	var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(ride);
    
    windowOpen(new google.maps.LatLng(lat, lng), html_code);
}

//allows passengers to join based on ride number
function joinRideByNumber(rideNum) {
	var ride = rides[rideNum];
    ride.marker.setMap(null);
    ride.marker=null;
    var marker = addRideToMap(ride, rideNum);
    viewRideInfo(ride, rideNum, marker.getPosition().lat(), marker.getPosition().lng());
}

//popup to get new passengers info 
function addPassengerPopup(rideNum, lat, lng){
	var ride = rides[rideNum];
    var html = '<b>Ride Info</b><hr>';
    html +='Please ensure that your address is as specific as possible<br>' +
    		'(<i>37</i> Main Street, not <i>30-50</i> Main Street)<br>'
 
    html += 'From <input type="text" id="textFrom" name="textFrom" size="50" value="{start_point_title}" ' +
    		'readonly="readonly"><br>';
    
    html += 'To <input type="text" id="textTo" name="textTo" size="50" value="{destination_title}" ' +
    		'readonly="readonly"><br>';
    
    html += 'Maximum number of passengers: {max_passengers} <br>';

    html += 'Contact Phone Number: <input type="text" name="number" id="number" value="" maxlength="12" size="10"> <br>';
    
    html += 'Time of departure: {part_of_day} ' + convertMonthNum(ride.ToD.getMonth()) + ' ' + ride.ToD.getDate() + ' ' + 
			ride.ToD.getFullYear() + '<br>';
    
    html += '<input type="submit" id="submit" name="submit" value="Okay" onclick="verifyAddPassenger({rideNum},' + 
    		lat + ', ' + lng + '); return false;">' 
    html += '<input type="button" id="cancel" name="cancel" value="Cancel" onclick="windows.pop().close(); putListener();">'
    
    var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(ride);
    
    windowOpen(new google.maps.LatLng(lat, lng), html_code);
}

//make sure the new passenger entered in the corect information
function verifyAddPassenger(rideNum, lat, lng){
	var number = document.getElementById("number").value;
	
	var goodContact = false;
    goodContact = validatePhoneNumber(number);
    
  //Ensure valid number is supplied
    if (! goodContact){
        alert("Please supply a valid ten-digit contact number.");  
    } else {
    	number = number.replace(/-/g,"");
        number = number.replace(/ /g,"");
        number = number.replace(/\./g,"");
    	number = number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6);
    	
        startConfirmPassengerPopup(rideNum, lat, lng, number);
    }      
}

//confirm info with passenger and then save the new addition
function startConfirmPassengerPopup(rideNum, lat, lng, contact){
	var ride = rides[rideNum]
	newRideInfo = {};
	newRideInfo['lat'] = lat;
	newRideInfo['lng'] = lng;
	newRideInfo['location'] = ride.destination_title;
	newRideInfo['contact'] = contact;
	newRideInfo['ride_key'] = ride.key

	var html = '';
	html += '<b>Is the following information correct?</b><br>';
	html += '<b>From:</b> {start_point_title} <br>';
	html += '<b>To:</b> {destination_title} <br>';
	html += '<b>Departing:</b> {part_of_day} ' + convertMonthNum(ride.ToD.getMonth()) + ' ' + ride.ToD.getDate() + ' ' + 
	ride.ToD.getFullYear() + '<br>';
	html += '<b>Contact Number:</b> {contact} <br>';
	
	html += '<form>';
	html += '<input type="button" id="pass_submit" name="pass_submit" value="Submit" onclick="saveNewPass()">';
	html += '<input type="button" id="pass_back" name="pass_submit" value="Back" onclick="addPassengerPopup(' +
			'{rideNum}, ' + lat + ', ' + lng + ');"></form>';

	var template_html = jsontemplate.Template(html);
    var html_code = template_html.expand(ride);
    
    windowOpen(new google.maps.LatLng(lat, lng), html_code);
}

//call addpass handler to create passenger in the datastore and add to the ride
function saveNewPass() {

    var request = new XMLHttpRequest();
    var reqStr = '/addpass?';

    for (var prop in newRideInfo) {
    	reqStr += prop + "=" + newRideInfo[prop] + "&";
    }
    
    reqStr = encodeURI(reqStr.slice(0, -1));

    request.open("GET", reqStr, false);
    request.send(null);
    putListener();
    
    if (request.status == 200) {
    	var messages = eval('(' + request.responseText + ')');
    	for (mess in messages){
    		var response_mess = messages[mess]
    	}
    	initialize(response_mess);
    } else {
    	alert("An error occurred, check your responses and try again.");
    }

}

//creates the popup for  a ride that needs a driver
function addDriverPopup(ride, rideNum, lat, lng) {
    ride.rideNum = rideNum;
    
    var htmlText = '<div id="driver_needed"><b>Driver Needed</b> <br>';
    htmlText += '{start_point_title} --> {destination_title}<br>';
    htmlText += '{part_of_day} ' + convertMonthNum(ride.ToD.getMonth()) + ' ' + ride.ToD.getDate() + ' ' + 
    			ride.ToD.getFullYear() + '<br>';
    htmlText += 'Number of Passengers so far: {num_passengers} <br>'
    htmlText += '<input type="radio" name="driver" value="0" onclick="getDriverContact({rideNum});">I will drive<br>';
    htmlText += '<input type="radio" name="rider" value="0" onclick="joinRideByNumber({rideNum});">I need a ride too</div>';

    var template_html = jsontemplate.Template(htmlText);
    var html_code = template_html.expand(ride);
    
    return html_code
}

//adds a driver to whichever ride number is specified
function addDriverToRideNumber(rideNum) {
    rides[rideNum].marker.setMap(null);
    rides[rideNum].marker=null;
    var marker = addRideToMap(rides[rideNum], rideNum);
    
    windowOpen(marker.getPosition(),addDriverPopup(rides[rideNum], rideNum, 
    								rides[rideNum].destination_lat, rides[rideNum].destination_long));
}

//get all of the drivers contact info before adding to the new ride
function getDriverContact(rideNum) {
    var ride = rides[rideNum];
    var htmlText = "Thanks for driving!<br><hr>";
    htmlText += 'From: {start_point_title} <br>'
    htmlText += 'To: {destination_title} <br>'
    htmlText += 'Contact number:  <input type="text" id="drivercontact" name="dcontact" value="" ><br>';
    htmlText += 'Total number of passengers:  <input type="text" id="numpass" name="numpass" value="" size="8"><br>';
    htmlText += 'Time of Departure: {part_of_day} ' + convertMonthNum(ride.ToD.getMonth()) + ' ' + 
    			ride.ToD.getDate() + ' ' + ride.ToD.getFullYear() + '<br>';
    htmlText += '<input type="button" name="OK" value="OK" onclick="verifyNewDriver({rideNum});">';
    htmlText += '<input type="button" name="Cancel" value="Cancel" onclick="windows.pop().close(); putListener();">';

    var template_html = jsontemplate.Template(htmlText);
    var html_code = template_html.expand(ride);
    ride.marker.setMap(null);
    ride.marker=null;
    var marker = addRideToMap(rides[rideNum], rideNum);
    windowOpen(marker.getPosition(),html_code);  
}

//make sure the driver entered in all the data correctly
function verifyNewDriver(rideNum){
	var driverContact = document.getElementById("drivercontact").value;
    var numPass = document.getElementById("numpass").value;
    
    var ride = rides[rideNum];
    
    if (numPass < ride.num_passengers){
    	alert("The number of passengers must be at least as many as are already on the ride.")
    } 
    else if (/[^0-9-]+/.test(numPass)) {
    	alert("Please enter valid info for number of passengers.")	
    } else if (!(validatePhoneNumber(driverContact))){
    	alert("Please supply a valid 10-digit contact number");
    } else {
    	saveNewDriver(rides[rideNum], driverContact, numPass);
    }
}


//send the info to handler to update datastore ride
function saveNewDriver(ride, driverContact, numPass){
	var request = new XMLHttpRequest();
	
    var reqStr = '/adddriver?key=' + ride.key + '&contact=' + driverContact + '&numpass=' + numPass;
    reqStr = encodeURI(reqStr);
    
    request.open("GET", reqStr, false);
    request.send(null);
    putListener();
    
    if (request.status == 200) {
    	var messages = eval('(' + request.responseText + ')');
    	for (mess in messages){
    		var response_mess = messages[mess]
    	}
    	initialize(response_mess);
    } else {
    	alert("An error occurred, check your responses and try again.");
    }
}

//Filter the markers on the map to only show rides between the two dates shown
function filterRides(){
	var begin = $("#begindate").datepicker("getDate");
    var end = $("#enddate").datepicker("getDate");
    
    var currentTime = new Date();
    currentTime.setHours(0,0,0,0);
    
    if (begin == null){
    	alert("You must specify a beginning date for the filter.");
    } else {
    	var begin_date = new Date(begin.getFullYear(), begin.getMonth(), begin.getDate());
    }
    
    if (end == null){
    	alert("You must specify an ending date for the filter.");
    } else {
    	var end_date = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    }
    
    if(begin_date < currentTime){
    	alert("The beginning date must be at least today.");
    } else if(end_date < begin_date){
    	alert("The ending date must be after the beginning date.")
    } else {
	    for(var r in rides){
	    	if (rides[r].ToD < begin_date || rides[r].ToD > end_date){
	    		rides[r].marker.setMap(null);
	        }    
	    }	
    }
}

//Convience function to add a click listener to the map
function putListener(){
   clickListener = google.maps.event.addListener(map, "click", getAddress);
}

//Changes a numerical month returned from a Date object to a String
function convertMonthNum(index){
    var monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return monthList[index];
}

//Validates that the phone number is 10 digits long 
function validatePhoneNumber(number) {
    number = number.replace(/-/g,"");
    number = number.replace(/ /g,"");
    number = number.replace(/\./g,"");

    if (/\d{10}/.test(number) && number.length == 10) {
    	return true;
    } else {
    	return false;
    }
}

//Creates the dropdown options for the month selector
function getMonthOptions() {
    var today = new Date();
    var monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var html = '';
    for (var i=0; i < monthList.length; i++) {
    	html += '<option value="'+(i)+'" ';
    	if (today.getMonth() == i) {
    		html += 'selected="true" ';
    	}
    	html += '>' + monthList[i] + '</option>';
    }
    return html;
}

// Creates the dropdown options for the year selector
function getYearOptions(){
    var today = new Date();
    var yr = today.getFullYear();
    var html = '';
    for (var i = yr; i < yr+4; i++){
        html += '<option value="' + i + '">' + i + '</option>';
    }
    return html;
}

//Returns the dropdown options that include the days for the current month
function getTodayDayOptions(){
	var today = new Date();
    var today_month = today.getMonth();
    var today_day = today.getDate();
    var days = [31,28,31,30,31,30,31,31,30,31,30,31];
    var html = '';
    
    for (var i = 1; i < (days[today_month]+1); i++){
        html += '<option value="' + i + '" ';
        if ( (today_day) == i ) {
        	html += 'selected="selected"';
        }
        html += '>'+ i + '</option>';
    }
    return html
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



