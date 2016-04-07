// Require statements
const express = require('express');
const router = express.Router();
const moment = require("moment");
const momentTZ = require("moment-timezone");
const jade = require("jade");
const DB = global.DB;
const fs = require('fs');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt-nodejs');
const filter = require('../filter.js');
const passwordGen = require('../passwordGen.js');

// Set up nodemailer
const SMTP_CONFIG = {
	service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD
    }
};
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Declare a few constant variables
const MAPS_API_KEY = process.env.MAPS_API_KEY;
const DEFAULT_ICON = "/images/markers/orange_Marker.png";
const EMAIL_FROM_NAME = 'Tech Check Ins';
const VALID_ADMIN_USER_EDIT_PROPS = "firstName lastName userGroup icon emergencyContact".split(' '); // Make an array out of the string
const VALID_ADMIN_VIEW_EDIT_PROPS = "firstName lastName userGroup".split(' ');
const VALID_USER_NEW_PROPS = "username email account_type notifications reminders".split(' ').concat(VALID_ADMIN_USER_EDIT_PROPS);
const VALID_VIEW_NEW_PROPS = "username firstName lastName userGroup email account_type notifications".split(' ');
const VALID_SUBPROPS = "name phone email".split(' ');
const VALID_USER_EDIT_PROPS = 'notifications reminders password'.split(' ');
const VALID_VIEW_EDIT_PROPS = 'notifications password'.split(' ');
const VALID_ADMIN_EDIT_PROPS = 'overdueNotifications reminderTime overdueTime requiredCheckIn emergencyTime password'.split(' ');
const PASS_CHANGE_MESSAGE = 'Your password was recently changed. If this was not you, please reset your'
	+ ' password immediately.';

// Takes the time from the document and returns an array with the changed document, the time difference in minutes,
// and a nicely formatted string of the time difference
function timeFunctions (docTime, timezone) {
	var docMoment = moment(docTime, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
	var currentMoment = moment();
	var timeDiff = currentMoment.diff(docMoment, 'minutes');
	docMoment = momentTZ.tz(docMoment, timezone).format("ddd, MMM Do YYYY, h:mm:ss a");
	var timeString;
	if (timeDiff > 59) {
		var hours = Math.floor(timeDiff / 60);
		var minsleft = timeDiff - (hours * 60);
		timeString = hours;
		timeString += hours > 1 ? " hours " : " hour ";
		timeString += minsleft > 0 ? minsleft + " minutes ": "";
	}
	else {
		timeString = timeDiff + " minutes ";
	}
	return [docMoment, timeDiff, timeString];
}

// Returns an array of all users for a given admin
function getUsersForAdmin (adminName, callback) {
	DB.collection('users').find({admin: adminName}).toArray(function (err, results) {
		if (err) { return callback(err); }
		results.sort(function(a, b) {
			if (a.username > b.username) {return 1;}
			else { return -1; }
		});
		callback(null, results);
	});
}

// Removes passwords from each user in an array of users (for sending to client)
function removePasswords (arrayOfUsers) {
	arrayOfUsers.forEach(function (user) {
		delete user.password;
	});
	return arrayOfUsers;
} 

// Check if username belongs to admin (and return user)
function checkUsername (username, admin, callback) {
	DB.collection('users').findOne({ username: username, admin: admin }, function (err, result) {
		if (err) { return callback(err); }
		return callback(null, result);
	});
}

// Checks wether a username/email are taken. Returns what is taken or null if not taken
function checkIfTaken (username, email, callback) {
	var errors = {};
	DB.collection('users').findOne({ username: username }, function (err, result) {
		if (err) { return callback(err); }
		if (result) { errors.username = true; }
		DB.collection('users').findOne({ email: email }, function (err, result) {
			if (err) { return callback(err); }
			if (result) { errors.email = true; }
			if (Object.keys(errors).length === 0) {
				return callback (null, null);
			}
			callback(null, errors);
		});
	});
}

function selfSettingsEdit(data, res) {
	var username = res.locals.user.username;
	var passChange = false;
	if (data.oldpass || data.password || data.confpass) {
		if (!(data.oldpass && data.password && data.confpass)) {
			res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
			return res.end(JSON.stringify({ error: 'Missing password info' })); 
		}
		data.oldpass = data.oldpass.trim();
		data.password = data.password.trim();
		data.confpass = data.confpass.trim();
		if (data.password.length >= 8 && data.confpass.length >= 8) {
			if (data.password !== data.confpass) {
				res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
				return res.end(JSON.stringify({ error: 'New passwords do not match' })); 
			}
			else {
				passChange = true;
			}
		}
		else {
			res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
			return res.end(JSON.stringify({ error: 'Password must be at least 8 characters' })); 
		}
	}
	if (data.notifications) {
		if (typeof data.notifications !== 'boolean') {
			return res.status(400).send(); 
		}
	}
	if (data.reminders) {
		if (typeof data.reminders !== 'boolean') {
			return res.status(400).send();
		}
	}
	if (passChange === true) {
		bcrypt.compare(data.oldpass, res.locals.user.password, function (err, result) {
			if (!result) {
				res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
				return res.end(JSON.stringify({error: 'Incorrect old password'})); 
			}
			if (res.locals.user.account_type === 'user') {
				data = filter.filterProps(data, VALID_USER_EDIT_PROPS);
			}
			else if (res.locals.user.account_type === 'view') {
				data = filter.filterProps(data, VALID_VIEW_EDIT_PROPS);
			}
			else {
				data = filter.filterProps(data, VALID_ADMIN_EDIT_PROPS);
			}
			bcrypt.hash(data.password, bcrypt.genSaltSync(), null, function(err, hash) {
				if (err) { return res.status(500).send(); }
				data.password = hash;
				DB.collection('users').updateOne({ username: username }, { $set : data }, function (err) {
					if (err) { return res.status(500).send(); }
					sendEmail(res.locals.user.email, 'Password Changed', PASS_CHANGE_MESSAGE, function (err) {
						if (err) { console.log(err); }
						return res.status(200).send();
					});
				});
			});
		});
	}
	else {
		delete data.password;
		if (res.locals.user.account_type === 'user') {
			data = filter.filterProps(data, VALID_USER_EDIT_PROPS);
		}
		else if (res.locals.user.account_type === 'view') {
			data = filter.filterProps(data, VALID_VIEW_EDIT_PROPS);
		}
		else {
			data = filter.filterProps(data, VALID_ADMIN_EDIT_PROPS);
		}
		DB.collection('users').updateOne({ username: username }, { $set : data }, function (err) {
			if (err) { return res.status(500).send(); }
			return res.status(200).send();
		});
	}
}

// Send password reset email or new account info
function sendPassword(user, isNew, callback) {
	var newPassword = passwordGen.genPassword(12);
	bcrypt.hash(newPassword, bcrypt.genSaltSync(), null, function(err, hash) {
		if (err) { callback(err); return; }
		DB.collection('users').updateOne({ username: user.username }, { $set : { password: hash } }
		, function (err, result) {
			if (err) { callback(err); return; }
			if (user.account_type === 'user' || user.account_type === 'view') {
				if (isNew) {
					var mailOpts = {
						from: EMAIL_FROM_NAME,
						to: user.email,
						subject: 'An admin has created an account for you!',
						text : 'Admin with the username of ' + user.admin + ' has created an account for you on Tech Check Ins!'
							+ ' Your username is: ' + user.username + ' and your password is: ' + newPassword + '. Please log in'
							+ ' to change it and start checking in!',
						html : '<p>Admin with the username of ' + user.admin + ' has created an account for you on Tech Check ' 
							+ 'Ins!</p><p>Your username is: <strong>' + user.username + '</strong> and your password is: <strong>' 
							+ newPassword + '</strong></p><p>Please log in to change it.</p>'
					};
				}
				else {
					var mailOpts = {
						from: EMAIL_FROM_NAME,
						to: user.email,
						subject: 'Your admin has reset your password',
						text : 'Your new password is: ' + newPassword + '. Please log in to change it.',
						html : '<p>Your new password is: ' + newPassword + '</p><p>Please log in to change it.</p>'
					};
				}
			}
			else {
				if (isNew) {
					var mailOpts = {
						from: EMAIL_FROM_NAME,
						to: user.email,
						subject: 'New Tech Check Ins Account',
						text : 'Your username is ' + newUsername + ' Your password is: ' + newPassword 
							+ '. Please log in to change it.',
						html : '<p>Your username is ' + newUsername + '</p><p>Your password is: ' + newPassword 
							+ '</p><p>Please log in to change it.</p>'
					};
				}
				else {
					var mailOpts = {
						from: EMAIL_FROM_NAME,
						to: user.email,
						subject: 'You have requested a password reset',
						text : 'Your new password is: ' + newPassword + '. Please log in to change it.',
						html : '<p>Your new password is: ' + newPassword + '</p><p>Please log in to change it.</p>'
					};
				}
			}
			// Send email with new password
			transporter.sendMail(mailOpts, function (err, response) {
				if (err) { callback(err, false); } 
				else { callback(null, true); }
			});
		});
	});
}

// Send an information email (password changed, etc)
function sendEmail (email, subject, message, callback) {
	var mailOpts = {
		from: EMAIL_FROM_NAME,
		to: email,
		subject: subject,
		text : message
	};
	transporter.sendMail(mailOpts, function (err, response) {
		if (err) { callback(err); } 
		else { callback(null, true); }
	});
}

// Get the last (newest) document from given tech
function getDocsFromTech (tech, collection, callback) {
	DB.collection( collection + "_checkins" ).find({ username: tech }).sort({ _id: -1 }).limit(1).toArray(function (err, results) {
		if (err) {return callback(err);}
		callback(null, results[0]);
	});
}

// Get just what we need for map markers off that last 5 documents from a given tech
function getCheckInLatLng (tech, icon, max, timezone, collection, group, callback) {
	var query = {
		username: tech
	}
	if (group !== undefined && group !== '') {
		query.userGroup = group;
	}
	DB.collection( collection + "_checkins" ).find({ username: tech }, { _id: 0, name: 1, message: 1, timestamp: 1, location: 1 })
	.sort({_id: -1}).limit( max ).toArray(function (err, results) {
		if (err) { return callback(err); }
		if (results.length === 0) {
			return callback(null, undefined);
		}
		results.forEach(function (result) {
			result.timestamp = moment(result.timestamp, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
			result.timestamp = momentTZ.tz(result.timestamp, timezone).format("ddd, MMM Do YYYY, h:mm:ss a");
			result.icon = icon;
		});
		callback(null, results);
	});
}

// Make sure view/admin user is logged in
function hasPermissions (req, res, next) {
	if (req.isAuthenticated()) {
		if (res.locals.user.account_type === 'admin' ||
			res.locals.user.account_type === 'view')
			{
				return next();
		}
		else {
			res.redirect('/admins/login');
		}
	}
	return res.redirect('/admins/login');
}

// Make sure a user is logged in (checkins/edit settings only)
function isUser (req, res, next) {
	if (req.isAuthenticated()) {
		if (res.locals.user.account_type === 'user') {
			return next();
		}
		else {
			res.redirect('/users/login');
		}
	}
	return res.redirect('/users/login');
}

// Make sure an admin is logged in
function isAdmin (req, res, next) {
	if (req.isAuthenticated()) {
		if (res.locals.user.account_type === 'admin') {
			return next();
		}
		else {
			res.redirect('/admins/login');
		}
	}
	return res.redirect('/admins/login');
}

// GET - Check In Page
router.get('/checkin', isUser, function (req, res, next) {
	res.render('checkin', {	
		title: 'Main', 
		MAPS_API_KEY: MAPS_API_KEY
	});
});

// POST - Submit a checkin for user
router.post('/checkin', isUser, function (req, res, next) {
	var checkin = req.body;
	// Validate received input
	if (typeof checkin !== 'object') {
		return res.status(400).send();
	}
	if (typeof checkin.message !== 'string' || typeof checkin.type !== 'string'
		|| typeof checkin.timestamp !== 'string') {
		return res.status(400).send();
	}
	if (typeof checkin.location.lat !== 'number' || typeof checkin.location.lng !== 'number'
		|| typeof checkin.accuracy !== 'number') {
		return res.status(400).send();
	}
	if (checkin.type !== "Start" && checkin.type !== "Check In" && checkin.type !== 'End') {
		return res.status(400).send();
	}
	checkin.message = checkin.message.trim().replace(/[<()>"']/g, '*');
	checkin.timestamp = checkin.timestamp.replace(/[<()>"']/g, '*');
	checkin.name = res.locals.user.firstName + " " + res.locals.user.lastName
	checkin.username = res.locals.user.username;
	checkin.created_at = moment().utc().toString();
	DB.collection(res.locals.user.admin + "_checkins").insertOne(checkin, function (err) {
		if (err) { return res.status(500).send(); }
		return res.status(201).send();
	});
});

// GET - Main app
router.get('/', hasPermissions, function(req, res, next) {
 	res.render('index', {	
		title: 'Main', 
		MAPS_API_KEY: MAPS_API_KEY
	});
});

// GET - Admin Settings page
router.get('/settings', hasPermissions, function(req, res, next) {
	if (res.locals.user.account_type === 'view') {
		res.render('view-settings', {
			title: 'Settings'
		});
	}
	else {
		getUsersForAdmin(res.locals.user.username, function(err, results) {
			if (err) { return res.status(500).send(); }
			res.render('admin-settings', { 
				title: 'Settings',
				userArray: removePasswords(results)
			});
		});
	}
});

// GET - User Settings page
router.get('/userSettings', isUser, function(req, res, next) {
	res.render('user-settings', {
		title: 'Settings'
	});
});

// POST - User edits their settings
router.post('/userSettings', isUser, function(req, res, next) {
	var username = res.locals.user.username;
	// Don't allow any settings to be changed on demo account
	if (username === 'user1' || username === 'user2' || username === 'user3') {
		res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
		return res.end(JSON.stringify({error: 'Cannot modify demo accounts'})); 
	}
	// Do some validation
	if (typeof req.body.data === 'object' && !Array.isArray(req.body.data)) {
		var data = req.body.data;
	}
	else {
		return res.status(400).send();
	}
	selfSettingsEdit(data, res);
});

// GET - All possible marker icons
router.get('/settings/icons', isAdmin, function(req, res, next) {
	fs.readdir(process.cwd() + '/public/images/markers', function (err, files) {
		if (err) {
			console.log(err);
			return res.status(500).send();
		}
		// Remove unwanted file names
		for (var i = 0; i < files.length; i++) {
			if (files[i] === '.DS_Store') {
				files.splice(i, 1);
			}
		}
		var html = jade.renderFile('./views/icons.jade', { iconArray: files });
		res.status(200).send(html);
	});
});

// POST - Edit settings/user/create new users
router.post('/settings', hasPermissions, function (req, res, next) {
	var username;
	var type;
	var data;
	if (typeof req.body.username === 'string') {
		username = req.body.username.trim().replace(/[<()>"']/g, '*').toLowerCase();
	}
	if (typeof req.body.type === 'string') {
		type = req.body.type;
	}
	else {
		return res.status(400).send();
	}
	if (res.locals.user.account_type === 'view' && type !== 'self-edit') {
		return res.status(403).send();
	}
	var adminUsername = res.locals.user.admin || res.locals.user.username
	// Don't allow any settings to be changed on demo account
	if (adminUsername === 'demoaccount') {
		res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
		return res.end(JSON.stringify({error: 'Cannot modify demo account'})); 
	}
	if (typeof req.body.data === 'object' && !Array.isArray(req.body.data)) {
		data = req.body.data;
		if (!username && typeof data.username === 'string') {
			data.username = data.username.trim().replace(/[<()>"']/g, '*').toLowerCase();
			username = data.username;
		}
	}
	if (!username) {
		username = res.locals.user.username;
	}
	console.log("Type: " + type);
	console.log("Username: " + username);
	console.log("Admin: " + adminUsername);
	if (username === adminUsername && type !== 'self-edit') {
		console.log("admin username equal");
		return res.status(400).send();
	}
	if (typeof username === 'string') {
		if (type === 'edit' || type === 'delete' || type === 'create' || type === 'reset' || type === 'self-edit') {
			if (type === 'self-edit') {
				console.log('in self-edit');
				if (res.locals.user.account_type === 'admin') {
					if (typeof data.requiredCheckIn !== 'number' || typeof data.overdueTime !== 'number' 
						|| typeof data.reminderTime !== 'number' || typeof data.emergencyTime !== 'number') {
							res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
							return res.end(JSON.stringify({error: 'Time values must be numbers' })); 
						}
					if (data.requiredCheckIn % 5 !== 0 || data.overdueTime % 5 !== 0 || data.emergencyTime % 5 !== 0 
						|| data.reminderTime % 5 !== 0) {
							res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
							return res.end(JSON.stringify({error: 'Time values must be in multiples of 5' })); 
					}
				}
				selfSettingsEdit(data, res);
			}
			else if (type === 'create') {
				console.log("in create");
				// Make sure we have data object
				if (!data) {
					return res.status(400).send();
				}
				if (typeof data.username !== 'string' || typeof data.email !== 'string' ||
					typeof data.account_type !== 'string' || typeof data.firstName !== 'string' ||
					typeof data.icon !== 'string') {
						return res.status(400).send();
					}
				if (data.account_type === 'user') {
					data = filter.filterProps(data, [VALID_USER_NEW_PROPS, VALID_SUBPROPS]);
				}
				else if (data.account_type === 'view') {
					data = filter.filterProps(data, VALID_VIEW_NEW_PROPS);
				}
				else {
					return res.status(400).send();
				}
				checkIfTaken(data.username, data.email, function (err, result) {
					if (err) { return res.status(500).send(); }
					if (result) {
						res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
						return res.end(JSON.stringify({error: result})); 
					}
					if (data.firstName === '') {
						data.firstName = data.username;
					}
					data.created_at = moment().utc().toString();
					data.admin = adminUsername;
					DB.collection('users').insertOne(data, function (err) {
						if (err) { return res.status(500).send(); }
						sendPassword(data, true, function (err, result) {
							if (err) {
								DB.collection('users').remove({ username: data.username }, 1, function (err) {
									return res.status(500).send();
								});
							}
							else {
								getUsersForAdmin(adminUsername, function (err, results) {
									if (err) { return res.status(205).send(); }
									var html = jade.renderFile('./views/admin-settings-user.jade', { 
										userArray: removePasswords(results) 
									});
									res.writeHead(201, "Created", { "Content-Type":"application/json;charset=UTF-8" } );
									res.end( JSON.stringify( {html: html, data: results} ));
								});
							}
						});
					});
				});
			}
			else {
				checkUsername(username, adminUsername, function(err, result) {
					if (result) {
						if (type === 'delete') {
							console.log("in delete");
							DB.collection('users').remove({ username: username, admin: adminUsername }, 1, function (err) {
								if (err) { return res.status(500).send(); }
								DB.collection(adminUsername + "_checkins").remove({ username: username }, function (err) {
									if (err) { return res.status(500).send(); }
									return res.status(200).send();
								});
							});
						}
						else if (type === 'edit') {
							console.log('in edit');
							// Make sure we have data object
							if (!data) {
								res.status(400).send();
							}
							// Get only the props we need out of the data submitted
							if (result.account_type === 'user') {
								data = filter.filterProps(data, [VALID_ADMIN_USER_EDIT_PROPS, VALID_SUBPROPS]);
							}
							else if (result.account_type === 'view') {
								data = filter.filterProps(data, VALID_ADMIN_VIEW_EDIT_PROPS);
							}
							else {
								return res.status(500).send();
							}
							DB.collection('users').updateOne({ username: username}, { $set : data }, function (err, result) {
								if (err) { return res.status(500).send(); }
								else {
									var newName = data.firstName + " " + data.lastName;
									DB.collection(adminUsername + '_checkins').updateMany({ username: username }
									, { $set: { name : newName }}, function (err, result) {
										if (err) { return res.status(500).send(); }
										else { res.status(200).send(); }
									});
								}
							});
						}
						else {
							console.log('in reset');
							sendPassword(result, false, function (err, sent) {
								if (err) { return res.status(500).send(); }
								if (sent) { return res.status(200).send(); }
								else { return res.status(500).send(); }
							});
							
						}
					}
					else {
						res.status(400).send();
					}
				});
			}
		}
		else {
			res.status(400).send();
		}
	}
	else {
		res.status(400).send();	
	}
});

// GET - Return current time formatted to timezone
router.get('/time', hasPermissions, function(req, res, next) {
	var timezone = req.query.tz
	var currentTime = momentTZ.tz(moment(), timezone).format("dddd, MMMM Do YYYY, h:mm:ss a");
	res.writeHead(200,"OK",{"Content-Type":"text/html;charset=UTF-8"});
	res.end(currentTime);
});

// GET - History page
router.get('/history', hasPermissions, function(req, res, next) {
	res.render('history', {
		title: 'History',
		MAPS_API_KEY: MAPS_API_KEY
	});
});

// POST - History Query
router.post('/history', hasPermissions, function(req, res, next) {
	if (res.locals.user.suspended) {
		return res.status(401).send();
	}
	var name = req.body.name.toLowerCase();
	var timezone = req.body.tz;
	var num = parseInt(req.body.num);
	var userAdmin = res.locals.user.admin || res.locals.user.username
	var group = res.locals.user.userGroup;
	getCheckInLatLng(name, DEFAULT_ICON, num, timezone, userAdmin, group, function(err, results) {
		if (err) { return res.status(500).send(); }
		var coordinates = {};
		coordinates[name] = results;
		res.writeHead(200, "OK", {"Content-Type":"application/json;charset=UTF-8"});
		res.end(JSON.stringify(coordinates));
	});
});

// GET - Return a JSON object with latest info from each tech
router.get('/updateTechs', hasPermissions, function(req, res, next) {
	if (res.locals.user.suspended) {
		var html = "<p id='no-results'>This account has been suspended. After payment is received, your account"
		+" will be re-activated.</p>";
		res.writeHead(200, "OK", {"Content-Type":"text/html;charset=UTF-8"});
		return res.end(html);
	}
	var timezone = req.query.tz;
	var techArray = [];
	var userAdmin = res.locals.user.admin || res.locals.user.username
	var group = res.locals.user.userGroup;
	var query = {
		admin: userAdmin,
		account_type: 'user'
	}
	if (group !== undefined && group !== '') {
		query.userGroup = group;
	}

	DB.collection('users').find(query, { _id: 0, username: 1 }).toArray(function (err, results) {
		if (err) { return res.status(500).send(); }
		if (results.length === 0 ) {
			var html = "<p id='no-results'>You have no users, please add them on the settings page (Gear Icon above)!</p>";
			res.writeHead(200, "OK", {"Content-Type":"text/html;charset=UTF-8"});
			return res.end(html);
		}
		var numTechs = results.length;
		results.forEach(function(tech) {
			getDocsFromTech(tech.username, userAdmin, function(err, results) {
				if (err) {return res.status(500).send();}
				if (results !== undefined) {
					results.timestamp = timeFunctions(results.timestamp, timezone);
					techArray.push(results);
					numTechs--;
				}
				else {
					numTechs--;
				}
				if (numTechs === 0) {
					if (techArray.length === 0 ) {
						var html = "<p id='no-results'>No active users, your users will appear here after they have at"
						+ " least one Check In.</p>";
						res.writeHead(200, "OK", {"Content-Type":"text/html;charset=UTF-8"});
						return res.end(html);
					}
					// Sort array so that it doesn't change around
					techArray.sort(function(a, b) {
						if (a.name > b.name) {return 1;}
						else {return -1;}
					});
					console.log(res.locals.user.account_type);
					if (res.locals.user.account_type !== 'admin') {
						DB.collection('users').findOne( {username : userAdmin}, function (err, admin) {
							res.locals.user.reminderTime = admin.reminderTime;
							res.locals.user.requiredCheckIn = admin.requiredCheckIn;
							var html = jade.renderFile('./views/techList.jade', { 
								techArray: techArray,
								user: res.locals.user
							 });
							res.writeHead(200, "OK", {"Content-Type":"text/html;charset=UTF-8"});
							res.end(html);
						});
					}
					else {
						var html = jade.renderFile('./views/techList.jade', { 
							techArray: techArray,
							user: res.locals.user
						});
						res.writeHead(200, "OK", {"Content-Type":"text/html;charset=UTF-8"});
						res.end(html);
					}
				}
			});
		});
	});
});

// GET - Returns a JSON object with an array of 5 lat and lng values for each tech
router.get('/updateMap', hasPermissions, function(req, res, next) {
	if (res.locals.user.suspended) {
		return res.status(401).send();
	}
	var timezone = req.query.tz;
	var coordinates = {};
	var userAdmin = res.locals.user.admin || res.locals.user.username
	var group = res.locals.user.userGroup;
	var query = {
		admin: userAdmin,
		account_type: 'user'
	}
	if (group !== undefined && group !== '') {
		query.userGroup = group;
	}
	DB.collection('users').find(query, { _id : 0, icon: 1, username: 1 })
	.toArray(function (err, results) {
		if (err) {return res.status(500).send();}
		if (results.length === 0 ) {
			return res.status(204).send();
		}
		var numTechs = results.length;
		results.forEach(function(tech) {
			getCheckInLatLng(tech.username, tech.icon, 5, timezone, userAdmin, group, function(err, results) {
				if (err) { return res.status(500).send(); }
				if (results !== undefined) {
					coordinates[tech.username] = results;
					numTechs--;
				}
				else {
					numTechs--;
				}
				if (numTechs === 0) {
					if (Object.keys(coordinates).length === 0 ) {
						return res.status(204).send();
					}
					res.writeHead(200,"OK",{"Content-Type":"application/json;charset=UTF-8"});
					res.end(JSON.stringify(coordinates));
				}
			});
		});
	});
});

module.exports = router;
