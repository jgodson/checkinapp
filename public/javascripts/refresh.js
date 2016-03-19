var updates = 10// in minutes
var timer;
var countdown;

// Random number to prevent IE from cacheing requests
function genNumber() {
	return Math.random() * 10000000000;
}

function updateTime(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/time?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			document.getElementById("currentTime").innerHTML = req.responseText;
		}
	}
	req.send();
}

function updateTechs(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateTechs?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			document.getElementById("techList").innerHTML = req.responseText;
		}
	}
	req.send();
}

function updateMap() {
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateMap?tz=" + timezone + "&" + genNumber(), true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			deleteMarkers();
			addMarkers(JSON.parse(req.responseText), false);
		}
	}
	req.send();
}

function refresh() {
	var $countdown = $('#notify p span');
	timer = setTimeout(function () {
		updateTechs();
		updateMap();
		updateTime();
	}, 60000);
	$('#notify').fadeIn();
	var seconds = 60;
	countdown = setInterval(function () {
		$countdown.text(seconds + " seconds");
		seconds--;
		if (seconds === 0) {
			$countdown.text("60 seconds");
			clearInterval(countdown);
			clearTimeout(timer);
			$('#notify').fadeOut();
		}
	}, 1000);
}

window.onload = function () {
	updateTechs();
	updateTime();
	updateMap();
	setInterval(function () {
		console.log("Triggered at: " + Date());
		refresh();
	}, (updates - 1) * 60000);
}

$(document).ready(function() {
	$(document).on('click', 'input[name=cancel]', function() {
		clearTimeout(timer);
		clearInterval(countdown);
		$('#notify').fadeOut();
		$('#notify p span').text('60 seconds');
		console.log("Interval and timeout cleared");
	});
	
	$(document).on('click', '.panel-title', function() {
		$(this).parent().parent().find('.panel-body').slideToggle('slow');
	});
	
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