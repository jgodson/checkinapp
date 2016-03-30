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

$(document).ready(function () {
	$oldpass = $("input[name='old-password']");
	$newpass = $("input[name='new-password']");
	$confirmpass = $("input[name='new-password2']");
	var passchange = false;
	
	// Save changes button event handler
	$(document).on('click', '.btn-success', function(event) {
		event.preventDefault();
		if ($oldpass.val().trim() !== '' || $newpass.val().trim() !== '' || $confirmpass.val().trim() !== '') {
			if ($oldpass.val().trim() === '') {
				showRequestStatus('Error: Enter current password');
				passchange = false;
				return;
			}
			else if ($newpass.val().trim() === '') {
				showRequestStatus('Error: Enter a new password');
				passchange = false;
				return;
			}
			else if ($confirmpass.val().trim() === '') {
				showRequestStatus('Error: Confirm new password');
				passchange = false;
				return;
			}
			if ($newpass.val() !== $confirmpass.val()) {
				showRequestStatus('Error: Passwords do not match');
				passchange = false;
				return;
			}
			if ($newpass.val().length < 8) {
				showRequestStatus('Error: Password must be at least 8 characters');
				passchange = false;
				return;
			}
			else {
				passchange = true;
			}
		}
		var data = {};
		if (passchange) {
			data = {
				oldpass: $oldpass.val().trim(),
				password: $newpass.val().trim(),
				confpass: $confirmpass.val().trim()	
			};
		}
		data.notifications = $('#overdue').prop('checked');
		data.reminders = $('#checkin-reminders').prop('checked');
		// Send data to server
		$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			if (typeof accountType !== 'undefined') {
				if (accountType === 'view') {
					req.open("POST","/app/settings", true);
				}
			}
			else {
				req.open("POST","/app/userSettings", true);
			}
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState === 4){
					if (req.status === 200) { 
						showRequestStatus('Changes saved!', true);
						$oldpass.val('');
						$newpass.val('');
						$confirmpass.val('');
					}
					else if (req.status === 400) {
						if (req.responseText) {
							var response = JSON.parse(req.responseText);
							if (response.error) {
								showRequestStatus('Error: ' + response.error, true);	
							}
							else {
								showRequestStatus('Error: Bad Request', true);
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
			req.send(JSON.stringify({ type: 'self-edit', data: data}));
	});
	
	// On/Off switch Checkbox toggles
	$(document).on('click', '.onoffswitch', function() {
		var toggleSwitch = $(this).find('input');
		toggleSwitch.prop('checked') ? toggleSwitch.prop('checked', false) 
			: toggleSwitch.prop('checked', true);
	});
	
	// Close Alert Notification
	$(document).on('click', 'input[name=close]', function () {
		clearTimeout(notifierTimeout);
		$notifier.fadeOut();
	});
});