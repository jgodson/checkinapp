module.exports.genPassword = 
// Generate a random password and return it
function genPassword(desiredLength) {
	var password = '';
	var uppercase = false;
	var chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'l', 'm', 'n', 'o', 'p', 'q',
	'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
	'!', '@', '#', '$', '%', '&'];
	while (password.length < desiredLength) {
		uppercase = Math.floor(Math.random() * 10) < 4 ? true : false;
		password += uppercase ? chars[Math.floor(Math.random() * 41)].toUpperCase() 
			: chars[Math.floor(Math.random() * 41)];
	}
	return password;
}