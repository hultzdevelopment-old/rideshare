var map;
var autocomplete;
var infoWindow;
var geocoder;
var windows = new Array();
var rides = new Array();
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
        windowOpen(point, getBeginRideHTML(point.lat(), point.lng(), results[0].formatted_address));
    }
}

//reverse geocodes an address from latLng and starts ride pop ups
function showAddressSearchBox(){   
	var place = autocomplete.getPlace();
	var point = place.geometry.location;
	windowOpen(point, getBeginRideHTML(point.lat(), point.lng(), place.formatted_address));   
}


//returns first popup html to create a ride
function getBeginRideHTML(lat, lng, address){
    var html = "<b>What would you like to do?</b><br>";
    
    html += "<input onclick=\"startRideCreationPopup(" + lat + ", " + lng + ", '" + address + "');\" type=\"radio\" />Create a new Ride<br>";

    return html;
}


//creates the new ride creation html form that decides the direction of the ride
function startRideCreationPopup(lat, lng, address){
    var html = "<b>Create a New Ride</b><hr>";

    html += "<form><p style=\"text-align: left;\">";

    html += "<input onclick=\"startPassengerOrDriverPopup(" + lat + ", " + lng + ", '" 
              + address + "', 0);\" type=\"radio\" name=\"rideType\" value=\"0\" id=\"rideType\" />From <b>" + mycollege.name + "</b> to <br><b>";

    html += address + "</b><br>";

    html += "<input onclick=\"startPassengerOrDriverPopup(" + lat + ", " + lng + ", '" 
              + address + "', 1);\" type=\"radio\" name=\"rideType\" value=\"1\" id=\"rideType\" />From <b>" + address + "</b> <br>to <b>";
    
    html += mycollege.name + "</b></p></form>";

    windowOpen(new google.maps.LatLng(lat, lng), html);
}

//popup following ride creation for determining passenger or driver
function startPassengerOrDriverPopup(lat, lng, address, eventID){
    var html = "<b>Create a New Ride</b><hr>";

    html += "<form><p>";
    
    html += "<input onclick=\"startRideInfoPopup(" + lat + ", " + lng + ", '"
            + address + "', " + eventID + ",true);\" type=\"radio\" name=\"driver\" value=\"0\" /> I will drive <br>";
    
    html += "<input onclick=\"startRideInfoPopup(" + lat + ", " + lng + ", '"
            + address + "', " + eventID + ",false);\" type=\"radio\" name=\"driver\" value=\"1\" /> I am looking for a ride <br>";
    
    html += "</form></p>";
    
    if(eventID == "0"){
    	html += "<p>From:<br> " + mycollege.name + "<br>To: <br>" + address
    } else if(eventID == "1"){
    	html += "<p>From:<br> " + address + "<br>To: <br>" + mycollege.name
    }
    
    windowOpen(new google.maps.LatLng(lat, lng), html);
}

//popup window that collects the rest of the ride info
function startRideInfoPopup(lat, lng, address, eventID, isDriver, maxp, number){
	maxp = (typeof maxp == 'undefined') ? '': maxp;
	number = (typeof number == 'undefined') ? '': number; 
    var html = "<b>Ride Info</b><hr>";
    
    html +="<div id=\"ride-info\">Please ensure that your address is as specific as possible<br>" +
    "(<i>37 </i> Main Street, not <i>30-50</i> Main Street)<br>"
    
    html += "<div id=\"from-text\">From <input type=\"text\" id=\"textFrom\" name=\"textFrom\" size=\"50\"";
    
    //check to see the order of the destinations and fill in From and To
    if (eventID == "0"){
    	html += "value='" + mycollege.name + "'readonly='readonly'";
    } else {
    	html += "value='"+ address +"'";
    }
    html += "></div>";
    
    html += "<div id=\"to-text\">To <input type=\"text\" id=\"textTo\" name=\"textTo\" size=\"50\"";
    if (eventID == "0"){
    	html += "value='"+ address +"'";
    } else {
    	html += "value='"+ mycollege.name + "'readonly='readonly'";
    }
    html += "><br></div>";
    
    //only add the max passenger option if the person is a driver
    html += "<div id=\"max-pass\">";
    if (isDriver) {
    	 html += "Maximum number of passengers: <input type=\"text\" name=\"maxp\" id=\"maxp\" value=\"" + maxp +"\" maxLength=\"2\" size=\"3\"><br></div>";
    }
    
    //contact phone number
    html += "<div id=\"phone-num\">Contact Phone Number: " + 
    	"<input type=\"text\" name=\"number\" id=\"number\" value=\"" + number + "\" maxlength=\"12\" size=\"10\"></div>";
    
    //time of depart_time_timeure
    html += "<div id=\"time-of-depart\">Time of departure: <br><select name=\"earlylate\" id=\"earlylate\">" +
    	"<option value=\"0\" selected=\"selected\">Early</option>" + 
    	"<option value=\"1\">Late</option></select>";
    
    html += "<select name=\"partofday\" id=\"partofday\">" +
    	"<option value=\"0\" selected=\"selected\">Morning</option>" + 
    	"<option value=\"1\">Afternoon</option>" +
    	"<option value=\"2\">Evening</option></select>";
    
    //fill in month, day, and year selectors
    html += "<select name=\"month\" id=\"month\" onchange=\"changeDays(document.getElementById('day'), this); return false;\">" + getMonthOptions() + "</select>";
    html += "<select name=\"day\" id=\"day\">" + getTodayDayOptions() + "</select>";
    html += "<select name=\"year\" id=\"year\">" + getYearOptions() + "</select></div>";
    
    //additional comments and submit / cancel buttons
    html += "<div id=\"comments\"><br>Comments: <input type=\"text\" id=\"ridecomment\" name=\"ridecomment\" size=\"50\"></div>"
    html += "<div id=\"buttons\"><input type=\"submit\" id=\"submit\" name=\"submit\" " + 
    "value=\"Okay\" onclick=\"verifyRideInfo("+ lat +", "+ lng +", '"+ address +"', "+ eventID +"); return false;\"'>" + 
    "<input type=\"button\" id=\"cancel\" name='cancel' value='Cancel' onclick='windows.pop().close(); putListener();'></div>" + 
    "<input type=\"hidden\" name=\"driver\" id=\"driver\" value=\""+ isDriver +"\">";
    
    windowOpen(new google.maps.LatLng(lat, lng), html);	
}

function verifyRideInfo(lat, lng, address, eventID){
	//get all entered values from the user to verify correctness
	var from = document.getElementById("textFrom").value;
    var to = document.getElementById("textTo").value;
    var earlylate = document.getElementById("earlylate").value;
    var partofday = document.getElementById("partofday").value;
    var month = document.getElementById("month").value;
    var day = document.getElementById("day").value;
    var year = document.getElementById("year").value;
    var comment = document.getElementById("ridecomment").value;
    var number = document.getElementById("number").value;
    var driver_check = document.getElementById("driver").value;
    
    if(driver_check == 'true'){
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
    if (! goodContact){
    	
        alert("Please supply a valid ten-digit contact number.");
        
    } 
 // Ensure to and from are filled
    else if (to == '') {
        alert("Please supply a destination.");
        
    } else if (from == '') {
    	alert("Please supply a start point.");
    	
    }
    // Ensure maxp is filled
    else if (driver_check == 'true' && (maxp == '' || badmaxp)) {
        alert("Please supply a valid maximum number of passengers.");
        
    }
    // test date.. make sure it is in the future
    
    else if (rideDate < currentTime) {
    	alert("The date for a ride must be in the future " + rideDate);
    	
    }
    // Bring up confirm window
    else {
    	number = number.replace(/-/g,"");
        number = number.replace(/ /g,"");
        number = number.replace(/\./g,"");
    	number = number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6);
    	
        var html_code = getConfirmInfoHTML(lat, lng, address, eventID, driver_check, from, to, maxp, number, earlylate, partofday, month, day, year, comment);
        windowOpen(new google.maps.LatLng(lat,lng), html_code);
    }      
}

function getConfirmInfoHTML(lat, lng, address, eventID, isDriver, from, to, maxp, number, earlylate, partofday, month, day, year, comment){
	var vals = {};
    vals['lat'] = lat;
    vals['lng'] = lng;
    vals['from'] = from;
    vals['to'] = to;
    vals['maxp'] = maxp;
    vals['contact'] = number;
    vals['earlylate'] = earlylate;
    vals['partofday'] = partofday;
    vals['month'] = month;
    vals['day'] = day;
    vals['year'] = year;
    vals['isDriver'] = isDriver;
    vals['comment'] = comment;

    if (from == mycollege.name) {
    	vals['toCollege'] = false;
    } else {
    	vals['toCollege'] = true;
    }
    var func_call = 'saveRide(' + JSON.stringify(vals) + ')';

    
    var html = "";
    html += "<b>Is the following information correct?</b><br>";
    html += "<b>From:</b> " + from + "<br>";
    html += "<b>To:</b> " + to + "<br>";
    html += "<b>Departing:</b> ";
    if (earlylate == 0) {
        html += "Early ";
    }
    else {
        html += "Late ";
    }
    if (partofday == 0) {
        html += "Morning, ";
    }
    else if (partofday == 1) {
        html += "Afternoon, ";
    }
    else {
        html += "Evening, ";
    }
    html += convertMonthNum(month) + " " + day + ", " + year + "<br>";
    html += "<b>Maximum passengers:</b> " + maxp + "<br>";
    html += "<b>Contact Number:</b> " + number + "<br>";
    html += "<form>";
    html += "<input type='button' id='submit' name='submit' value='Submit' onclick='" + func_call + "'/>";
    html += "<input type='button' id='cancel' name='cancel' value='Back' onclick=\"startRideInfoPopup(";
    html += lat + ", " + lng + ", '";
    
    if(eventID == "0"){
    	html += to;
    } else {
    	html += from;
    }

    html += "', " + eventID + ", " + isDriver + ", " + maxp + ", '" + number +"');\"/></form>";
  
    return html;
}

//saves the ride and refreshes the map
function  saveRide(vals) {
    var request = new XMLHttpRequest();
    var reqStr = '/newride?';

    for (var prop in vals) {
    	reqStr += prop + "=" + vals[prop] + "&";
    }

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
        		windowOpen(new_marker.getPosition(), viewRideInfo(ride, rideNum, new_marker.getPosition().lat(), new_marker.getPosition().lng()));
        	}
        });
        
    
    //ride has a driver and is going from college to home
    } else if (ride.start_point_title == mycollege.name) {
        var new_marker = new google.maps.Marker({
        	position:new google.maps.LatLng(ride.destination_lat, ride.destination_long)
        });
        google.maps.event.addListener(new_marker, "click", function(){
        	if (new_marker.getPosition()) {
        		windowOpen(new_marker.getPosition(),viewRideInfo(ride, rideNum, new_marker.getPosition().lat(), new_marker.getPosition().lng()));
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
	var msg;
	var space_left = ride.max_passengers - ride.num_passengers;
	
	if (space_left < 1){
		msg = "This ride is full";
	} else if (space_left == 1) {
		msg = "Can take " + space_left + " more person";
	} else {
		msg = "Can take " + space_left + " more people";
	}
	
	var disabled;
	var today = new Date();

	if ((ride.ToD - new Date(today.getFullYear(), today.getMonth(), today.getDate())) == 0){
		disabled = "disabled=\"disabled\"";
		msg = "It is too late to join this ride. <br>You might try to call the driver directly at: " + ride.contact;
	} else if (ride.max_passengers <= ride.num_passengers) {
		disabled = "disabled=\"disabled\"";
	} else {
		disabled = "";
	}
	
	var text1 = ("Driver: " + ride.drivername + "<br><i>" + ride.start_point_title + "</i> --> <i>" + ride.destination_title + 
			"</i><br>Departure Time: " + ride.part_of_day + " " + convertMonthNum(ride.ToD.getMonth()) + " " + 
			ride.ToD.getDate() + ", " + ride.ToD.getFullYear() + "<br>" + msg);

	text1 += "<br>" + ride.comment + "<br>";

	var text2 = ("<br /><form id=\"addPass\" onsubmit=\"addPassengerPopup(" + rideNum + ", " + 
			lat + ", " + lng + "); return false;\"><input type=\"submit\" value=\"Join this Ride\"" + disabled + "/></form>");
 
	var result = text1 + text2;
	return result;
}

//allows passengers to join based on ride number
function joinRideByNumber(rideNum) {
    rides[rideNum].marker.setMap(null);
    rides[rideNum].marker=null;
    var marker = addRideToMap(rides[rideNum], rideNum);
    
    windowOpen(marker.getPosition(),viewRideInfo(rides[rideNum], 
						    rideNum, 
						    rides[rideNum].destination_lat,
						    rides[rideNum].destination_long));
}


//popup to get new passengers info 
function addPassengerPopup(rideNum, lat, lng, number){
	number = (typeof number == 'undefined') ? '': number; 
    var html = "<b>Ride Info</b><hr>";
    
    html +="<div id=\"ride-info\">Please ensure that your address is as specific as possible<br>" +
    "(<i>37 </i> Main Street, not <i>30-50</i> Main Street)<br>"
    
  //check to see the order of the destinations and fill in From and To
    var to = rides[rideNum].destination_title;
    var from = rides[rideNum].start_point_title;
    
    html += "<div id=\"from-text\">From <input type=\"text\" id=\"textFrom\" name=\"textFrom\" size=\"50\" value=\"" +
    		from + "\" readonly=\"readonly\"></div>";
    
    html += "<div id=\"to-text\">To <input type=\"text\" id=\"textTo\" name=\"textTo\" size=\"50\" value=\"" + 
    		to + "\" readonly=\"readonly\"><br></div>";
    
    html += "<div id=\"max-pass\"> Maximum number of passengers: " + rides[rideNum].max_passengers + "<br></div>";

    
    //contact phone number
    html += "<div id=\"phone-num\">Contact Phone Number: " + 
    	"<input type=\"text\" name=\"number\" id=\"number\" value=\"" + number + "\" maxlength=\"12\" size=\"10\"></div>";
    
    //time of departure
    html += "<div id=\"time-of-depart\">Time of departure: <br>" + rides[rideNum].ToD + "</div>";
    
    //submit & cancel buttons
    html += "<div id=\"buttons\"><input type=\"submit\" id=\"submit\" name=\"submit\" " + 
    "value=\"Okay\" onclick=\"verifyAddPassenger(" + rideNum + ", " + lat + ", " + lng +"); return false;\"'>" + 
    "<input type=\"button\" id=\"cancel\" name='cancel' value='Cancel' onclick='windows.pop().close(); putListener();'></div>"
    
    windowOpen(new google.maps.LatLng(lat, lng), html);
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
        var html_code = getConfirmPassengerHTML(rideNum, lat, lng, number);
        windowOpen(new google.maps.LatLng(lat,lng), html_code);
    }      
}

//confirm info with passenger and then save the new addition
function getConfirmPassengerHTML(rideNum, lat, lng, contact){
	var args = {};
	args['lat'] = lat;
	args['lng'] = lng;
	args['location'] = rides[rideNum].destination_title;
	args['contact'] = contact;
	
	var ride_key = (rides[rideNum].key).replace(/'/g, '"');
	args['ride_key'] = ride_key;
	
	var func_call = 'saveNewPass(' + JSON.stringify(args) + ')';

	
	var html = '';
	html += '<b>Is the following information correct?</b><br>';
	html += '<b>From:</b> ' + rides[rideNum].start_point_title + '<br>';
	html += '<b>To:</b> ' + rides[rideNum].destination_title + '<br>';
	html += '<b>Departing:</b> ' + rides[rideNum].ToD + '<br>';
	html += '<b>Contact Number:</b> ' + contact + '<br>';
	
	html += '<form>';
	html += '<input type="button" id="pass_submit" name="pass_submit" value="Submit" onclick=\'' + func_call + '\'>';
	html += "<input type='button' id='pass_back' name='pass_submit' value='Back' onclick='addPassengerPopup(" +
			rideNum + ", " + lat + ", " + lng + ", \"" + contact + "\")'></form>";

	return html;
}

//call addpass handler to create passenger in the datastore and add to the ride
function saveNewPass(vals) {

    var request = new XMLHttpRequest();
    var reqStr = '/addpass?';

    for (var prop in vals) {
    	reqStr += prop + "=" + vals[prop] + "&";
    }

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
    htmlText += "{start_point_title} --> {destination_title}<br>";
    htmlText += "{part_of_day} {ToD}<br>";
    htmlText += "Number of Passengers so far: {num_passengers} <br>"
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
    htmlText += 'Total number of passengers:  <input type="text" id="numpass" name="numpass" value="" ><br>';
    htmlText += 'Time of Departure: <br> {ToD} <br>'
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
    	submitDriverForRide(rides[rideNum], driverContact, numPass);
    }
}


//send the info to handler to update datastore ride
function submitDriverForRide(ride, driverContact, numPass){
	var request = new XMLHttpRequest();
	
    var reqStr = '/adddriver?key=' +ride.key + '&contact=' + driverContact + '&numpass=' + numPass;
    
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
	var $begin = $("#begindate").datepicker("getDate");
    var $end = $("#enddate").datepicker("getDate");
    var iDate = new Date($begin.getFullYear(),$begin.getMonth(),$begin.getDate());
    var fDate = new Date($end.getFullYear(),$end.getMonth(),$end.getDate());

    for(var r in rides){
    	if (rides[r].ToD < iDate || rides[r].ToD > fDate){
    		rides[r].marker.setMap(null);
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
    var html = "";
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
    var html = "";
    for (var i = yr; i < yr+4; i++){
        html += "<option value=\"" + i + "\">" + i + "</option>";
    }
    return html;
}

//Returns the dropdown options that include the days for the current month
function getTodayDayOptions(){
	var today = new Date();
    var today_month = today.getMonth();
    var today_day = today.getDate();
    var days = [31,28,31,30,31,30,31,31,30,31,30,31];
    var html = "";
    
    for (var i = 1; i < (days[today_month]+1); i++){
        html += "<option value=\""+i+"\" ";
        if ( (today_day) == i ) {
        	html += "selected=\"selected\"";
        }
        html += ">"+ i + "</option>";
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



