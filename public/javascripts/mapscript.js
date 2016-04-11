var map; // Google map object
var markerObj = {}; // Object to place markers for techs in
var techArray = []; // Array of all techs 

// Initialize map (callback from loading scripts from google)
function initMap() {
	var myLatLng = {lat: 53.5, lng: -108.5};

	// Create a map object and specify the DOM element for display.
	map = new google.maps.Map(document.getElementById('map'), {
		center: myLatLng,
		scrollwheel: false,
		zoom: 6
	});
}

// Add markers to the map for each tech
function addMarkers(pointsObj, updateCenter) {
	for (var key in pointsObj){
    	if (pointsObj.hasOwnProperty(key)) {
			if (techArray.indexOf(key) === -1) {
				techArray.push(key);
			}
			markerObj[key] = [];
			var markers = 0;
			pointsObj[key].forEach(function(latlng) {
				var name = latlng.name.split(' ')[0];
				if (markers === 0) {
					if (updateCenter) {map.setCenter(latlng.location);}
					var scale = {width: 30, height: 51}
				}
				else {
					var scale = {width: 20, height: 34};
				}
				var infowindow = new google.maps.InfoWindow({
					content: "<p class='infoW'>" + latlng.timestamp + "</p><br><strong>" 
						+ name + "</strong> - " + latlng.message
				});
				var marker = new google.maps.Marker({
					map: map,
					position: latlng.location,
					title: name,
					icon: { url: latlng.icon,
							scaledSize: scale
					}
				});
				marker.addListener('click', function() {
					infowindow.open(map, marker);
				});
				markerObj[key].push(marker);
				markers++;
			});
		}
	}
}

// Sets the map on all markers in the array.
function setMapOnAll(markersArray, map) {
	for (var i = 0; i < markersArray.length; i++) {
		markersArray[i].setMap(map);
	}
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers(tech) {
	if (markerObj[tech] != null) {
 		setMapOnAll(markerObj[tech], null);
	}
}

// Shows any markers currently in the array.
function showMarkers(tech) {
 	setMapOnAll(markerObj[tech], map);
}

// Removes markers from the map and clears the array
function deleteMarkers() {
	techArray.forEach(function(tech) {
		clearMarkers(tech);
		markerObj[tech] = [];
	});
}

$(document).ready(function () {
	initMap();
});