var updates = 10// in minutes
var timer;
var countdown;

// Generates random number (used in url to prevent IE from cacheing ajax requests)
function genNumber() {
	return Math.random() * 10000000000;
}

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

function refresh() {
	var $countdown = $('#notify p span');
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
	timer = setTimeout(function () {
		updateTechs();
		updateMap();
		updateTime();
	}, 60000);
}

// Adjust height of techList
function adjustTechList() {
	$('#techList').css('max-height', window.innerHeight - 55);
}

window.onload = function () {
	updateTechs();
	updateTime();
	updateMap();
	setInterval(function () {
		refresh();
	}, updates * 60000);
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
	if (window.innerWidth > 640) {
		adjustTechList();
	}
	
	$(document).on('click', 'input[name=cancel]', function() {
		clearTimeout(timer);
		clearInterval(countdown);
		$('#notify').fadeOut();
		$('#notify p span').text('60 seconds');
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