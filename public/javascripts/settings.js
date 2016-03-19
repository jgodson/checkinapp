var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;
var body_margin = '55px';
var closeEditModal = false;
// trim().replace(/[<()>"']/g, '*');

function showRequestStatus (text, hideLoader) {
	$('body').css('margin-top', body_margin);
	if (hideLoader) { $('#loader').fadeOut(); }
	text.search(/error/ig) !== -1 ? $notifier.css('color', 'red') : $notifier.css('color', 'white');
	$notifierText.text(text);
	$notifier.fadeIn();
	notifierTimeout = setTimeout(function () {
		$notifier.fadeOut();
	}, 4000);
}

$(document).ready(function () {
	// Delete User
	$('#delete-user-modal').on('show.bs.modal', function (event) {
		var username = $(event.relatedTarget).attr('title');
		$(this).find('.modal-title').text("Deleting user " + username);
		$(this).find('.btn-danger').on('click', function () {
			$('#delete-user-modal').modal('hide');
			$('body').css('margin-top', '0px');
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState == 4){
					if (req.status === 200) { 
						$('[title=' + username + ']').closest('tr').remove();
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
		$(this).find('.btn-danger').off('click');
	});
	
	// Edit User
	$('#edit-user-modal').on('show.bs.modal', function (event) {
		var username = $(event.relatedTarget).attr('title');
		$(this).find('.modal-title').text("Editing user " + username);
		var index = -1;
		for (var i = 0; i < userData.length; i++) {
			if (userData[i].username === username) {
				index = i;
				return;
			}
		}
		if (index === -1) {
			closeEditModal = true;
			showRequestStatus('Error: Could not find user', false);
			return;
		}
		$(this).find('.btn-success').on('click', function () {
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function () {
				if (req.readyState == 4){
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
			req.send(JSON.stringify({type: 'edit', username: username, data: userData[index]}));
		});
	});
	
	// Cancel Edit User
	$('#edit-user-modal').on('hide.bs.modal', function (event) {
		$(this).find('.btn-success').off('click');
	});
	
	// Close edit user modal when loaded if it has been set to be closed
	$('#edit-user-modal').on('shown.bs.modal', function(event) {
		if (closeEditModal) {
    		$('#edit-user-modal').modal('hide');
			closeEditModal = false;
		}
	});
	
	// Close Alert Notification
	$(document).on('click', 'input[name=close]', function() {
		clearTimeout(notifierTimeout);
		$notifier.fadeOut();
	});
});