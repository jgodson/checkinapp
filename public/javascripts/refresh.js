var updates = 5 // How often automatic refresh takes place (in minutes)
var timer; // Timer for refresh
var countdown; // Interval for notification window countdown
var timezone; // User's timezone (Guessed with moment-timezone.js)

// Generates random number (used in url to prevent IE from cacheing ajax requests)
function genNumber() {
	return Math.random() * 10000000000;
}

// Get updated server time
function updateTime(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/time?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			if (req.status === 200) {
				document.getElementById("currentTime").innerHTML = req.responseText;
			}
		}
	}
	req.send();
}

// Request new data for tech list
function updateTechs(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateTechs?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function () {
		if(req.readyState == 4){
			if (req.status === 200) {
				document.getElementById("techList").innerHTML = req.responseText;
			}
		}
	}
	req.send();
}

// Request new data for map
function updateMap() {
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateMap?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			if (req.status === 200) {
				deleteMarkers();
				addMarkers(JSON.parse(req.responseText), false);
			}
		}
	}
	req.send();
}

// Show coutdown and update techs/maps/time
function refresh() {
	var $countdown = $('#notify p span');
	$('#notify').fadeIn();
	var seconds = 60;
	countdown = setInterval(function () {
		seconds--;
		$countdown.text(seconds + " seconds");
		if (seconds <= 0) {
			$countdown.text("60 seconds");
			clearInterval(countdown);
			$('#notify').fadeOut();
		}
	}, 1000);
	timer = setTimeout(function () {
		console.log("Called Updates at " + Date());
		updateTechs();
		updateMap();
		updateTime();
		clearTimeout(timer);
	}, 60000);
}

// Adjust height of techList
function adjustTechList() {
	$('#techList').css('max-height', window.innerHeight - 55);
}

window.onresize = function () {
	if (window.innerWidth > 640) {
		adjustTechList();
	}
	else {
		$('#techList').css('max-height', '55%');
	}
}

$(document).ready(function() {
	// Guess Timezone or set a default if undefined
	timezone = moment.tz.guess() || "America/Edmonton";
	
	// Adjust size of techlist if needed
	if (window.innerWidth > 640) {
		adjustTechList();
	}
	
	// Initial update of time/techs/map
	updateTechs();
	updateTime();
	updateMap();
	
	// Set interval to update time/techs/map
	setInterval(function () {
		console.log("Called Refresh at " + Date());
		refresh();
	}, updates * 60000);
	
	// Listener for closing the notify window
	$(document).on('click', 'input[name=cancel]', function() {
		clearTimeout(timer);
		clearInterval(countdown);
		$('#notify').fadeOut();
		$('#notify p span').text('60 seconds');
	});
	
	// Listener for expanding tech panel
	$(document).on('click', '.panel-title', function() {
		$(this).parent().parent().find('.panel-body').slideToggle('slow');
	});
	
	// Listener for showing/hiding map markers for techs
	$(document).on('click', '.glyphicon-map-marker', function() {
		$(this).toggleClass('selected');
		var name = $(this).parent().parent().find('h3').attr('title').split(' ')[1];
		if ($(this).hasClass('selected')) {
			showMarkers(name);
		}
		else {
			clearMarkers(name);
		}
	});
});