var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;

function showRequestStatus (text, hideLoader) {
	if (typeof hideLoader === 'undefined') { hideLoader = false; }
	if (hideLoader) { $('#loader').fadeOut(); }
	text.search(/error/ig) !== -1 ? $notifier.css('color', 'red') : $notifier.css('color', 'white');
	$notifierText.text(text);
	$notifier.fadeIn();
	notifierTimeout = setTimeout(function () {
		$notifier.fadeOut();
	}, 4000);
}

$(document).ready(function () {
	$oldpass = $("input[name='old-password']");
	$newpass = $("input[name='new-password']");
	$confirmpass = $("input[name='new-password2']");
	
	// Save changes button event handler
	$(document).on('click', '.btn-success', function() {
		if ($oldpass.val().trim() !== '' || $newpass.val().trim() !== '' || $confirmpass.val().trim() !== '') {
			if ($oldpass.val().trim() === '') {
				showRequestStatus('Error: Enter current password');
				return;
			}
			else if ($newpass.val().trim() === '') {
				showRequestStatus('Error: Enter a new password');
				return;
			}
			else if ($confirmpass.val().trim() === '') {
				showRequestStatus('Error: Confirm new password');
				return;
			}
			else {
				var passchange = true;
			}
		}
		var data = {};
		if (typeof passchange !== 'undefined') {
			data = {
				oldpass: $oldpass.val().trim(),
				newpass: $newpass.val().trim(),
				newpass2: $confirmpass.val().trim()	
			};
		}
		data.notifications = $('#overdue').prop('checked');
		data.reminders = $('#checkin-reminders').prop('checked');
		
		// Send data to server
		$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/userSettings", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState === 4){
					if (req.status === 200) { 
						showRequestStatus('Changes saved!', true);
					}
					else if (req.status === 400) {
						showRequestStatus('Error: Bad Request', true);
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
});