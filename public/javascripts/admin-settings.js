var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;
var closeEditModal = false;

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

function findIndexOfUsername(username) {
	var index = -1;
	for (var i = 0; i < userData.length; i++) {
		if (userData[i].username === username) {
			index = i;
		}
	}
	return index;
}

$(document).ready(function () {
	// If account is suspended, let user know
	if (suspended === true) {
		showRequestStatus("Your account has been suspended");
	}
	
	// Load icons for icon picker
	var iconRequest = new XMLHttpRequest();
	iconRequest.open("GET", "/app/settings/icons", true);
	iconRequest.onreadystatechange = function () {
		if (iconRequest.readyState === 4) {
			if (iconRequest.status === 200) {
				document.getElementById('icon-images').innerHTML = iconRequest.responseText;
			}
			else {
				document.getElementById('icon-images').innerHTML = "Error retreving icons."
				+ " Please refresh page to try again";
			}
		}
	}
	iconRequest.send();
	
	// New User
	$('#new-user-modal').on('show.bs.modal', function() {
		// Event listener for changing type of user
		$("select[name='new-type']").on('change', function () {
			$(this).val() === 'view' ? $('.user-only').fadeOut() : $('.user-only').fadeIn();
		});
		
		// Event listener for changing icon
		$(this).find('.select-icon').on('click', function () {
			$('#pick-icon').fadeIn();
			// Add listener for icon click
			$('#pick-icon').on('click', 'img', function () {
				var picked = $(this).attr('src');
				$('#new-user-modal .modal-icon').attr('src', picked);
				$('#pick-icon').fadeOut();
				$('#pick-icon').off('click');
			});
		});
		
		// Event listener for emergency email
		$("input[name='new-emergency_email']").on('blur', function () {
			var input = $("input[name='new-emergency_email']").val();
			if (input.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
				$('#new-emerg-email-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
			else {
				$('#new-emerg-email-feedback').removeClass('glyphicon-remove')
					.addClass('glyphicon-ok');
			}
		});
		
		// Event listener for emergency phone
		$("input[name='new-emergency_phone']").on('blur', function () {
			var phone = $("input[name='new-emergency_phone']").val();
			if (phone.search(/^\d{1}[- .]\d{3}[- .]\d{3}[- .]\d{4}$/) > -1
				|| phone.search(/^\d{11}$/) > -1) {
					phone = phone.replace(/[ -.]/g, '');
					$('#new-emerg-phone-feedback').removeClass('glyphicon-remove')
						.addClass('glyphicon-ok');
					$("input[name='new-emergency_phone']").val(phone);
			}
			else {
				$('#new-emerg-phone-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
		});
		
		// Event listener for clicking the Add User button
		$(this).find('.btn-success').on('click', function () {
			$modal = $('#new-user-modal');
			var newUsername = $("input[name='new-username']").val().trim().toLowerCase();
			var newEmail = $("input[name='new-email']").val().trim().toLowerCase();
			if (newUsername === '') {
				showRequestStatus("Error: Invalid username");
				$('#username-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
				return
			}
			else {
				$('#username-feedback').removeClass('glyphicon-remove glyphicon-ok');
			}
			if (newEmail === '' || newEmail.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
				showRequestStatus("Error: Invalid email");
				$('#email-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
				return
			}
			else {
				$('#email-feedback').removeClass('glyphicon-remove glyphicon-ok');
			}
			var newUser = {
				username:  newUsername,
				account_type: $("select[name='new-type']").val().trim(),
				firstName: $("input[name='new-first-name']").val().trim(),
				lastName: $("input[name='new-last-name']").val().trim(),
				email: newEmail,
				userGroup: $("input[name='new-group']").val().trim(),
				reminders: $('#checkin-reminders').prop('checked'),
				notifications: $('#overdue').prop('checked'),
				icon: $modal.find('.modal-icon').attr('src'),
				emergencyContact: {
					name: $("input[name='new-emergency_name']").val().trim(),
					phone: $("input[name='new-emergency_phone']").val().trim(),
					email: $("input[name='new-emergency_email']").val().trim()
				}
			}
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState === 4){
					if (req.status === 201) {
						var newUserResponse = JSON.parse(req.responseText);
						$('#new-user-modal').modal('hide');
						$("input[name='new-username']").val('');
						$("input[name='new-email']").val('');
						$("input[name='new-first-name']").val('');
						$("input[name='new-last-name']").val('');
						showRequestStatus('User created!', true);
						document.getElementById('users').innerHTML = newUserResponse.html;
						userData = newUserResponse.data;
					}
					else if (req.status === 205) {
						$('#new-user-modal').modal('hide');
						showRequestStatus('User created! Refresh page.', true);
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
			req.send(JSON.stringify({ type: 'create', data: newUser }));
		});
	});
	
	// Remove event listeners on close
	$('#new-user-modal').on('hide.bs.modal', function () {
		$("select[name='new-type']").off('change');
		$(this).find('.select-icon').off('click');
		$(this).find('.btn-success').off('click');
		$("input[name='new-emergency_email']").off('blur');
		$("input[name='new-emergency_phone']").off('blur');
	});
	
	// Delete User
	$('#delete-user-modal').on('show.bs.modal', function (event) {
		var username = $(event.relatedTarget).attr('title');
		$(this).find('.modal-title').text("Deleting user " + username);
		
		// Add listener for confirm deletion button
		$(this).find('.btn-danger').on('click', function () {
			$('#delete-user-modal').modal('hide');
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState === 4){
					if (req.status === 200) { 
						$('[title=' + username + ']').closest('tr').remove();
						userData.splice(findIndexOfUsername(username), 1);
						showRequestStatus('Successfully deleted user', true);
					}
					else if (req.status === 400) {
						showRequestStatus('Error: Bad Request', true);
					}
					else {
						showRequestStatus('Error: Unknown Error', true);
					}
				}
			}
			req.send(JSON.stringify({type: 'delete', username: username}));
		});
	});
	
	// Cancel Delete User
	$('#delete-user-modal').on('hide.bs.modal', function () {
		// Remove listener for confirm delete button
		$(this).find('.btn-danger').off('click');
	});
	
	// Edit User
	$('#edit-user-modal').on('show.bs.modal', function (event) {
		var username = $(event.relatedTarget).attr('title');
		$(this).find('.modal-title').text("Editing user " + username);
		var index = -1;
		index = findIndexOfUsername(username);
		if (index === -1) {
			closeEditModal = true;
			showRequestStatus('Error: Could not find user');
			return;
		}
		$(this).find('input[name=first-name]').val(userData[index].firstName);
		$(this).find('input[name=last-name]').val(userData[index].lastName);
		$(this).find('input[name=group]').val(userData[index].userGroup);
		// Check the type of user and show/hide divs if needed
		if (userData[index].account_type === 'user') {
			$(this).find('.modal-icon').attr('src', userData[index].icon);
			$(this).find('input[name=emergency_name]').val(userData[index].emergencyContact.name);
			$(this).find('input[name=emergency_phone]').val(userData[index].emergencyContact.phone);
			$(this).find('input[name=emergency_email]').val(userData[index].emergencyContact.email);
			if (userData[index].emergencyContact.email
					.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
				$('#emerg-email-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
			else {
				$('#emerg-email-feedback').removeClass('glyphicon-remove')
					.addClass('glyphicon-ok');
			}
			if (userData[index].emergencyContact.phone
					.search(/^\d{11}$/) === -1) {
				$('#emerg-phone-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
			else {
				$('#emerg-phone-feedback').removeClass('glyphicon-remove')
					.addClass('glyphicon-ok');
			}
			$(this).find('.user-only').show();
		}
		else {
			$(this).find('.user-only').hide();
		}
		
		// Add listener for emergency email check
		$("input[name='emergency_email']").on('blur', function () {
			var input = $("input[name='emergency_email']").val();
			if (input.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
				$('#emerg-email-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
			else {
				$('#emerg-email-feedback').removeClass('glyphicon-remove')
					.addClass('glyphicon-ok');
			}
		});
		
		// Event listener for emergency phone
		$("input[name='emergency_phone']").on('blur', function () {
			var phone = $("input[name='emergency_phone']").val();
			if (phone.search(/^\d{1}[- .]\d{3}[- .]\d{3}[- .]\d{4}$/) > -1
				|| phone.search(/^\d{11}$/) > -1) {
					phone = phone.replace(/[ -.]/g, '');
					$('#new-emerg-phone-feedback').removeClass('glyphicon-remove')
						.addClass('glyphicon-ok');
					$("input[name='emergency_phone']").val(phone);
			}
			else {
				$('#new-emerg-phone-feedback').removeClass('glyphicon-ok')
					.addClass('glyphicon-remove');
			}
		});
		
		// Add listener for reset password button
		$(this).find('#reset-password').on('click', function() {
			$('#edit-user-modal').modal('hide');
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState === 4){
					if (req.status === 200) { 
						showRequestStatus('Password has been reset!', true);
					}
					else if (req.status === 400) {
						showRequestStatus('Error: Bad Request', true);
					}
					else {
						showRequestStatus('Error: Unknown Error', true);
					}
				}
			}
			req.send(JSON.stringify({ type: 'reset', username: username }));
		});
		
		// Add listener for change icon button
		$(this).find('.select-icon').on('click', function () {
			$('#pick-icon').fadeIn();
			// Add listener for icon click
			$('#pick-icon').on('click', 'img', function () {
				var picked = $(this).attr('src');
				$('#edit-user-modal .modal-icon').attr('src', picked);
				$('#pick-icon').fadeOut();
				$('#pick-icon').off('click');
			});
		});
		
		// Add listener for confirm edit button
		$(this).find('.btn-success').on('click', function () {
			var $modal = $('#edit-user-modal');
			userData[index].firstName = $modal.find('input[name=first-name]').val().replace(/[<()>"']/g, '*');
			userData[index].lastName = $modal.find('input[name=last-name]').val().replace(/[<()>"']/g, '*');
			userData[index].userGroup = $modal.find('input[name=group]').val().replace(/[<()>"']/g, '*');
			if (userData[index].account_type === 'user') {
				userData[index].icon = $modal.find('.modal-icon').attr('src').replace(/[<()>"']/g, '*');
				userData[index].emergencyContact.name = $modal.find('input[name=emergency_name]').val().replace(/[<()>"']/g, '*');
				userData[index].emergencyContact.phone = $modal.find('input[name=emergency_phone]').val().replace(/[<()>"']/g, '*');
				userData[index].emergencyContact.email = $modal.find('input[name=emergency_email]').val().replace(/[<()>"']/g, '*');
			}
			var $row = $('[title=' + username + ']').closest('tr');
			$row.find('td:nth-child(2)').text(userData[index].firstName);
			$row.find('td:nth-child(3)').text(userData[index].lastName);
			$row.find('td:nth-child(5)').text(userData[index].userGroup);
			$('#edit-user-modal').modal('hide');
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
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
			req.send(JSON.stringify({ type: 'edit', username: username, data: userData[index] }));
		});
	});
	
	// Cancel Edit User
	$('#edit-user-modal').on('hide.bs.modal', function () {
		$(this).find('.btn-success').off('click');
		$(this).find('.select-icon').off('click');
		$(this).find('#reset-password').off('click');
		$("input[name='emergency_email']").off('blur');
		$("input[name='emergency_phone']").off('blur');
	});
	
	// Close edit user modal when loaded if it has been set to be closed
	$('#edit-user-modal').on('shown.bs.modal', function () {
		if (closeEditModal) {
    		$('#edit-user-modal').modal('hide');
			closeEditModal = false;
		}
	});
	
	// Close Alert Notification
	$(document).on('click', 'input[name=close]', function () {
		clearTimeout(notifierTimeout);
		$notifier.fadeOut();
	});
	
	// Close Icon Picker
	$(document).on('click', '#close-icon-picker', function () {
		$('#pick-icon').fadeOut();
		$('#pick-icon').off('click');
	});
	
	// On/Off switch Checkbox toggles
    $(document).on('click', '.onoffswitch', function() {
		var toggleSwitch = $(this).find('input');
		toggleSwitch.prop('checked') ? toggleSwitch.prop('checked', false) 
			: toggleSwitch.prop('checked', true);
	});
	
	//Admin Self Edit Settings Stuff
	// Expand settings panel
	$(document).on('click', '.panel-heading', function() {
		$(this).parent().find('.panel-body').slideToggle('slow');
	});
	
	$oldpass = $("input[name='old-password']");
	$newpass = $("input[name='new-password']");
	$confirmpass = $("input[name='new-password2']");
	var passchange = false;
	
	// Save changes button event handler
	$(document).on('click', 'input[name="save-edits"]', function(event) {
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
		data.overdueNotifications = $('#overdue').prop('checked');
		data.requiredCheckIn = parseInt($("input[name='interval']").val());
		data.reminderTime = parseInt($("input[name='reminder']").val());
		data.overdueTime = parseInt($("input[name='overdue']").val());
		data.emergencyTime = parseInt($("input[name='emergency']").val());
		if (data.requiredCheckIn < 30) {
			showRequestStatus("Error: Check In Interval is too short");
			return;
		}
		if (data.reminderTime < 5) {
			showRequestStatus("Error: Reminder Time is too short");
			return;
		}
		if (!data.emergencyTime > 0 || !data.overdueTime > 0) {
			showRequestStatus("Error: Emergency Time or Overdue Time missing");
			return;
		}
		if (data.emergencyTime < data.overdueTime + 5) {
			showRequestStatus("Error: Emergency Time is too short");
			return;
		}
		if (data.requiredCheckIn % 5 !== 0 || data.overdueTime % 5 !== 0 
		|| data.emergencyTime % 5 !== 0 || data.reminderTime % 5 !== 0) {
				showRequestStatus('Error: Time values must be in multiples of 5');
				return;
		}
		// Send data to server
		$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings", true);
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
});