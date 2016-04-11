var timezone; // User's timezone (Guessed with moment-timezone.js)

function query() {
	var $err = $('#error');
	var $btn = $('#query-button');
	$btn.prop('disabled', true);
	var name = $("input[name='name']").val().trim().toLowerCase();
	var num = $("input[name='number']").val().trim();
	if (name.toLowerCase().trim() !== "") { 
		if (num != '' && num != '0') {
			if (num <= 100) {
				$err.fadeOut();
				var req = new XMLHttpRequest();
				req.open("POST","/app/history", true);
				req.setRequestHeader("Content-type", "application/json");
				req.onreadystatechange = function(){
					if(req.readyState == 4){
						if (req.status === 200) {
							var results = JSON.parse(req.responseText);
							if (results[name] !== undefined) {
								if (results[name].length !== 0) {
									deleteMarkers();
									addMarkers(results, true);
									$btn.prop('disabled', false);
								}
								else {
									displayError('No results received.', $err, $btn);
								}
							}
							else {
								displayError('No results received.', $err, $btn);
							}
						}
						else if (req.status === 401) {
							displayError('Account Suspended', $err, $btn);
						}
						else {
							displayError('Server Error', $err, $btn);
						}
					}
				}
				req.send(JSON.stringify({name: name, num: num, tz: timezone}));
			}
			else{
				displayError("Please enter a check ins value of 100 or less", $err, $btn);
			}
		}
		else {
			displayError("Please enter a number of 1 or more into the # of check ins field", $err, $btn);
		}
	}
	else {
		displayError("Please enter a name", $err, $btn);
	}
}

function displayError(message, $err, $btn) {
	document.getElementById('error').innerHTML = message;
	$err.fadeIn();
	$btn.prop('disabled', false);
}

$(document).ready(function() {
	timezone = moment.tz.guess() || "America/Edmonton";
	$('#query-button').click(function(e) {
		e.preventDefault()
		query();
	});
});