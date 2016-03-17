var $notifier = $('#notify');
var $notifierText = $notifier.find('p');
var notifierTimeout;
var body_margin = '55px';
// trim().replace(/[<()>"']/g, '*');

function showRequestStatus (text) {
	$('body').css('margin-top', body_margin);
	$('#loader').fadeOut();
	text.search(/error/ig) !== -1 ? $notifier.css('color', 'red') : $notifier.css('color', 'white');
	$notifierText.text(text);
	$notifier.fadeIn();
	notifierTimeout = setTimeout(function () {
		$notifier.fadeOut();
	}, 4000);
}

$(document).ready(function () {
	$('#delete-user-modal').on('show.bs.modal', function (event) {
		var username = $(event.relatedTarget).attr('title');
		$(this).find('.modal-title').text("Deleting user " + username);
		$(this).find('.btn-danger').on('click', function () {
			console.log("Deleting user " + username);
			$('#delete-user-modal').modal('hide');
			$('body').css('margin-top', '0px');
			$('#loader').fadeIn();
			var req = new XMLHttpRequest();
			req.open("POST","/app/settings/", true);
			req.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			req.onreadystatechange = function(){
				if (req.readyState == 4){
					if (req.status === 200) { 
						// refresh content
						showRequestStatus('Successfully deleted user');
					}
					else if (req.status === 400) {
						showRequestStatus('Error: Bad Request');
					}
					else {
						showRequestStatus('Error: Unknown Error');
					}
				}
			}
			req.send(JSON.stringify({type: 'delete', username: username}));
		});
	});
	
	$('#delete-user-modal').on('hide.bs.modal', function () {
		$(this).find('.btn-danger').off('click');
	});
	
	$(document).on('click', 'input[name=close]', function() {
		clearTimeout(notifierTimeout);
		$notifier.fadeOut();
	});
});