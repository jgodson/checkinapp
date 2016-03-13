function query() {
	var $err = $('#error');
	var $btn = $('#query-button');
	$btn.prop('disabled', true);
	var name = $("input[name='name']").val();
	var num = $("input[name='number']").val();
	if (name.toLowerCase().trim() !== "") { 
		if (num != '' && num > 0) {
			if (num <= 100) {
				$err.fadeOut();
				var req = new XMLHttpRequest();
				req.open("POST","/app/history", true);
				req.setRequestHeader("Content-type", "application/json");
				req.onreadystatechange = function(){
					if(req.readyState == 4){
						if (req.status === 200) {
							deleteMarkers();
							addMarkers(JSON.parse(req.responseText), true);
							$btn.prop('disabled', false);
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
			displayError("Please enter a number into the # of check ins field", $err, $btn);
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
	$('#query-button').click(function(e) {
		e.preventDefault()
		query();
	})
});