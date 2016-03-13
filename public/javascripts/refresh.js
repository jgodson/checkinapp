var updates = 10 // in minutes

function updateTime(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/time?tz=" + timezone, true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			document.getElementById("currentTime").innerHTML = req.responseText;
		}
	}
	req.send();
}

function updateTechs(){
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateTechs?tz=" + timezone, true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			document.getElementById("techList").innerHTML = req.responseText;
		}
	}
	req.send();
}

function updateMap() {
	var req = new XMLHttpRequest();
	req.open("GET","/app/updateMap?tz=" + timezone, true);
	req.onreadystatechange = function(){
		if(req.readyState == 4){
			deleteMarkers();
			addMarkers(JSON.parse(req.responseText), false);
		}
	}
	req.send();
}

window.onload = function () {
	updateTechs();
	updateTime();
	updateMap();
	setInterval(function() {updateTechs(); updateTime(); updateMap();}, (updates * 60000));
}

$(document).ready(function() {
	
	$('.glyphicon-cog').click(function () {
		alert('Settings coming soon!');
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