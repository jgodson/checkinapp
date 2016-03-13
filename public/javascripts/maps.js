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