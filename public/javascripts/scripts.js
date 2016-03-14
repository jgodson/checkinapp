var $lat = document.getElementById('lat');
var $lng = document.getElementById('lng');
var $time = document.getElementById('time');
var $message = document.getElementById('message');
var $checkin = document.getElementById('type');
var $accuracy = document.getElementById('accuracy');
var $warning = document.getElementById('warning');
var $checkinBtn = document.getElementById('submit-checkin');
var marker;

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
			if (req.status === 200) {
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
	$warning.innerHTML = "Attempting to get location....";
	$('#warning').fadeIn();
	if (marker !== undefined) {
		marker.setMap(null);
	}
	navigator.geolocation.getCurrentPosition( function (pos) {
		$checkinBtn.removeAttribute('disabled');
		var location = {lat: pos.coords.latitude, lng: pos.coords.longitude};
		var date = moment().format("ddd, MMM Do YYYY, h:mm:ss a");
		map.setCenter(location);
		if (pos.coords.accuracy < 50) {
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
	}, function (error) {
		$warning.innerHTML = "Error: Could not get location. :(<br>If you did not get prompted for permission, " 
		+ "you may need to turn on location services for your browser. Try refreshing the page.";
		$('#warning').fadeIn();
		console.log(error);
	}, { //options
	enableHighAccuracy: true,
	maximumAge: 0
	});
}

$(document).ready( function () {
	updateLocation();
});