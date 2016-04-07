var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;

function showRequestStatus (text, hideLoader) {
	if (typeof hideLoader === 'undefined') { hideLoader = false; }
	if (hideLoader) { $('#loader').fadeOut(); }
	text.search(/error/ig) !== -1 ? $notifier.css('color', 'red') : $notifier.css('color', 'white');
	$notifierText.text(text);
	$notifier.fadeIn();
	clearTimeout(notifierTimeout);
	notifierTimeout = setTimeout(function () {
		$notifier.fadeOut();
	}, 4000);
}

function submitForm() {
	
}


$(document).ready(function() {
	// Submit form event
	$('input[name="submit"]').click(function(e) {
		e.preventDefault()
		var newUsername = $("input[name='username']").val().trim().toLowerCase();
		var newEmail = $("input[name='email']").val().trim().toLowerCase();
		var phone = $("input[name='phone']").val().trim();
		if (newUsername === '') {
			showRequestStatus("Error: Invalid username");
			$('#username-feedback').removeClass('glyphicon-ok')
				.addClass('glyphicon-remove');
			return;
		}
		else {
			$('#username-feedback').removeClass('glyphicon-remove glyphicon-ok');
		}
		if (newEmail === '' || newEmail.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
			showRequestStatus("Error: Invalid email");
			$('#email-feedback').removeClass('glyphicon-ok')
				.addClass('glyphicon-remove');
			return;
		}
		else {
			$('#email-feedback').removeClass('glyphicon-remove glyphicon-ok');
		}
		if (phone !== '' && (phone.search(/^\d{1}[- .]\d{3}[- .]\d{3}[- .]\d{4}$/) > -1
			|| phone.search(/^\d{11}$/) > -1)) {
				$('#phone-feedback').removeClass('glyphicon-remove glyphicon-ok');
		}
		else {
			showRequestStatus("Error: Invalid phone number");
			$('#phone-feedback').removeClass('glyphicon-ok')
				.addClass('glyphicon-remove');
			return;
			
		}
		var firstName = $("input[name='firstname']").val().trim();
		var lastName = $("input[name='lastname']").val().trim();
		var companyName = $("input[name='companyname']").val().trim();
		var requiredCheckIn = $("input[name='interval']").val();
		var reminderTime = $("input[name='reminder']").val();
		var overdueTime = $("input[name='overdue']").val();
		var emergencyTime = $("input[name='emergency']").val();
		if (firstName === '' || lastName === '' || phone === '') {
			showRequestStatus('Error: Missing required fields');
			return;
		}
		if (requiredCheckIn < 30) {
			showRequestStatus("Error: Check In Interval is too short");
			return;
		}
		if (reminderTime < 5) {
			showRequestStatus("Error: Reminder Time is too short");
			return;
		}
		if (!emergencyTime > 0 || !overdueTime > 0) {
			showRequestStatus("Error: Emergency Time or Overdue Time missing");
			return;
		}
		if ((parseInt(emergencyTime) < parseInt(overdueTime) + 5)) {
			showRequestStatus("Error: Emergency Time is too short");
			return;
		}
		if (requiredCheckIn % 5 !== 0 || overdueTime % 5 !== 0 || emergencyTime % 5 !== 0 
			|| reminderTime % 5 !== 0) {
				showRequestStatus('Error: Times must be in multiples of 5');
				return;
		}
		var newUser = {
			username:  newUsername,
			firstName: firstName,
			lastName: lastName,
			companyName: companyName,
			phone: phone,
			requiredCheckIn: parseInt(requiredCheckIn),
			reminderTime: parseInt(reminderTime),
			overdueTime: parseInt(overdueTime),
			emergencyTime: parseInt(emergencyTime),
			email: newEmail,
			overdueNotifications: $('#overdue').prop('checked')
		}
		console.log(newUser);
		$('#loader').fadeIn();
		var req = new XMLHttpRequest();
		req.open("POST","/admins/signup", true);
		req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
		req.onreadystatechange = function () {
			if (req.readyState === 4){
				if (req.status === 200) {
					showRequestStatus('Account created! Check your Email!', true);
					setTimeout(function () {
						window.location.pathname = '/admins/login';
					}, 4000);
				}
				else if (req.status === 400) {
					if (req.responseText) {
						var response = JSON.parse(req.responseText);
						if (response.error) {
							if (response.error.username && response.error.email) {
								showRequestStatus('Error: username & email already exist', true);
								$('#username-feedback').removeClass('glyphicon-ok');
								$('#username-feedback').removeClass('glyphicon-ok');
								$('#email-feedback').addClass('glyphicon-remove');
								$('#username-feedback').addClass('glyphicon-remove');
							}
							else if (response.error.email) {
								showRequestStatus('Error: email already exists', true);
								$('#email-feedback').addClass('glyphicon-remove');
								$('#username-feedback').removeClass('glyphicon-remove');
								$('#username-feedback').addClass('glyphicon-ok');
							}
							else if (response.error.username) {
								showRequestStatus('Error: username already exists', true);
								$('#username-feedback').addClass('glyphicon-remove');
								$('#email-feedback').removeClass('glyphicon-remove');
								$('#email-feedback').addClass('glyphicon-ok');
							}
							else {
								showRequestStatus('Error: ' + response.error, true);
							}
						}
					}
					else {
						showRequestStatus('Error: Bad Request', true);
					}
				}
				else {
					showRequestStatus('Error: Unknown Error', true);
				}
			}
		}
		req.send(JSON.stringify({ data: newUser }));
	});
	
	// Close Alert Notification
	$(document).on('click', 'input[name=close]', function () {
		clearTimeout(notifierTimeout);
		$notifier.fadeOut();
	});
	
	// On/Off switch Checkbox toggles
    $(document).on('click', '.onoffswitch', function() {
		var toggleSwitch = $(this).find('input');
		toggleSwitch.prop('checked') ? toggleSwitch.prop('checked', false) 
			: toggleSwitch.prop('checked', true);
	});
});