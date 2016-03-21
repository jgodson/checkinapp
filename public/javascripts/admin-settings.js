var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;
var closeEditModal = false;
// .trim().replace(/[<()>"']/g, '*');

function showRequestStatus (text, hideLoader) {
	if (hideLoader) { $('#loader').fadeOut(); }
	text.search(/error/ig) !== -1 ? $notifier.css('color', 'red') : $notifier.css('color', 'white');
	$notifierText.text(text);
	$notifier.fadeIn();
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
			showRequestStatus('Error: Could not find user', false);
			return;
		}
		$(this).find('input[name=first-name]').val(userData[index].firstName);
		$(this).find('input[name=last-name]').val(userData[index].lastName);
		$(this).find('input[name=group]').val(userData[index].userGroup);
		$('#icon').attr('src', userData[index].icon);
		$(this).find('input[name=emergency_name]').val(userData[index].emergencyContact.name);
		$(this).find('input[name=emergency_phone]').val(userData[index].emergencyContact.phone);
		$(this).find('input[name=emergency_email]').val(userData[index].emergencyContact.email);
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
		$(this).find('#change-icon').on('click', function () {
			$('#pick-icon').fadeIn();
			// Add listener for icon click
			$('#pick-icon').on('click', 'img', function () {
				var picked = $(this).attr('src');
				$('#icon').attr('src', picked);
				$('#pick-icon').fadeOut();
				$('#pick-icon').off('click');
			});
		});
		// Add listener for confirm edit button
		$(this).find('.btn-success').on('click', function () {
			var $modal = $('#edit-user-modal');
			userData[index].firstName = $modal.find('input[name=first-name]').val();
			userData[index].lastName = $modal.find('input[name=last-name]').val();
			userData[index].userGroup = $modal.find('input[name=group]').val();
			userData[index].icon = $('#icon').attr('src');
			userData[index].emergencyContact.name = $modal.find('input[name=emergency_name]').val();
			userData[index].emergencyContact.phone = $modal.find('input[name=emergency_phone]').val();
			userData[index].emergencyContact.email = $modal.find('input[name=emergency_email]').val();
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
		$(this).find('#change-icon').off('click');
		$(this).find('#reset-password').off('click');
		$('#pick-icon').off('click');
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
	
});