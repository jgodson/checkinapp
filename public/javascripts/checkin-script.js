var $lat = document.getElementById('lat');
var $lng = document.getElementById('lng');
var $time = document.getElementById('time');
var $message = document.getElementById('message');
var $checkin = document.getElementById('type');
var $accuracy = document.getElementById('accuracy');
var $warning = document.getElementById('warning');
var $checkinBtn = document.getElementById('submit-checkin');
var $updateBtn;
var locator;
var marker;
var map;

// Initialize map (callback from loading scripts from google)
function initMap () {
	var myLatLng = {lat: 53.5, lng: -108.5};

	// Create a map object and specify the DOM element for display.
	map = new google.maps.Map(document.getElementById('map'), {
		center: myLatLng,
		scrollwheel: false,
		zoom: 12
	});
}

function showLocation (loc, date) {
	if (typeof loc === 'object') {
		$lat.value = loc.coords.latitude;
		$lng.value = loc.coords.longitude;
		$time.value = date;
		$accuracy.value = loc.coords.accuracy + " meters";
	}
	else {
		$warning.innerHTML = "Oops something went wrong. Try refreshing the page.";
		$warning.style.display = "fixed";
	}
}

function showMarker (pos) {
	$checkinBtn.removeAttribute('disabled');
	$updateBtn.text("Stop Locating");
	$updateBtn.addClass('btn-warning');
	$updateBtn.removeClass('btn-primary');
	
	if (marker !== undefined) {
		marker.setMap(null);
	}
	var location = {lat: pos.coords.latitude, lng: pos.coords.longitude};
	var date = moment().format("ddd, MMM Do YYYY, h:mm:ss a");
	map.setCenter(location);
	if (pos.coords.accuracy < 25) {
		stopLocationWatch();
		$warning.style.display = "none";
		showLocation(pos, date);
	}
	else {
		$warning.innerHTML = "Got location, but accuracy is not very good.";
		setTimeout(function() {
			$('#warning').fadeOut();
		}, 2000)
		showLocation(pos, date);
	}
	var infowindow = new google.maps.InfoWindow({
		content: "Location at: " + date
	});
	marker = new google.maps.Marker({
		map: map,
		position: location,
		title: "Current Locations",
		animation: google.maps.Animation.DROP
	});
	marker.addListener('click', function() {
		infowindow.open(map, marker);
	});
}

function submitCheckIn () {
	if ($message.value.trim() === "") {
		$warning.innerHTML = "Please enter a message for the check in.";
		$('#warning').fadeIn();
		setTimeout( function () {
			$('#warning').fadeOut();
		}, 2000);
		return;
	}
	$checkinBtn.setAttribute('disabled', 'disabled');
	var checkin = {
		timestamp: moment($time.value, "ddd, MMM Do YYYY, h:mm:ss a").utc()
			.toString().replace(/[<()>"']/g, '*'),
		location: {
			lat: parseFloat($lat.value), 
			lng: parseFloat($lng.value)
		},
		accuracy: parseInt($accuracy.value.split(' ')[0]),
		type: document.getElementById('type').value.replace(/[<()>"']/g, '*'),
		message: $message.value.trim().replace(/[<()>"']/g, '*')
	}
	console.log(checkin);
	var req = new XMLHttpRequest();
	req.open("POST","/app/checkin", true);
	req.setRequestHeader("Content-type", "application/json");
	req.onreadystatechange = function () {
		if (req.readyState == 4) {
			if (req.status === 201) {
				$('#success').fadeIn();
				setTimeout( function () {
					$('#success').fadeOut();
				}, 4000);
				$lat.value = "";
				$lng.value = "";
				$time.value = "";
				$accuracy.value = "";
				$message.value = "";
			}
			else if (req.status === 400) {
				$warning.innerHTML = "Invalid input. Please refresh page and try again";
				$('#warning').fadeIn();
				$checkinBtn.removeAttribute('disabled');
				setTimeout( function () {
					$('#warning').fadeOut();
				}, 4000);
			}
			else {
				$warning.innerHTML = "Server error, please try again.";
				$('#warning').fadeIn();
				$checkinBtn.removeAttribute('disabled');
				setTimeout( function () {
					$('#warning').fadeOut();
				}, 4000);
			}
		}
	}
	req.send(JSON.stringify(checkin));
}

function updateLocation () {
	var options = {
		enableHighAccuracy: true,
		timeout: 8000,
		maximumAge: 0
	}
	
	var mobile = typeof window.orientation === 'undefined' ? false : true;
	
	$warning.innerHTML = "Attempting to get location....";
	$('#warning').fadeIn();
	
	if (marker !== undefined) {
		marker.setMap(null);
	}
	
	if (!mobile) {
		navigator.geolocation.getCurrentPosition(function (pos) {
			showMarker(pos);
			stopLocationWatch();
		}, function (error) {
			$warning.innerHTML = "Error: Could not get location. :(<br>If you did not get prompted for permission, " 
				+ "you may need to turn on location services for your browser. Try refreshing the page.";
			$('#warning').fadeIn();
		}, options);
	}
	else {
		locator = navigator.geolocation.watchPosition(function (pos) {
			showMarker(pos)
		}, function (error) {
			$warning.innerHTML = "Error: Could not get location. :(<br>If you did not get prompted for permission, " 
				+ "you may need to turn on location services for your browser. Try refreshing the page.";
			$('#warning').fadeIn();
			stopLocationWatch();
		}, options);
	}
}

function stopLocationWatch () {
	navigator.geolocation.clearWatch(locator);
	$updateBtn.text('Update Location');
	$updateBtn.addClass('btn-primary');
	$updateBtn.removeClass('btn-warning');
}

$(document).ready( function () {
	$updateBtn = $("button[name='update']");
	updateLocation();
	
	// Listener for Update Location/Stop Locating button
	$updateBtn.on('click', function () {
		if ($updateBtn.text() === 'Stop Locating') {
			stopLocationWatch();
		}
		else {
			updateLocation();
		}
	});
});