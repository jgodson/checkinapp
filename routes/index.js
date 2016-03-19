// Require statements
const express = require('express');
const router = express.Router();
const moment = require("moment");
const momentTZ = require("moment-timezone");
const jade = require("jade");
const url = require("url");
const DB = global.DB;

// Declare a few constant variables
const MAPS_API_KEY = process.env.MAPS_API_KEY;
const DEFAULT_ICON = "/images/markers/default.png";

// Takes the time from the document and the current time and gets the time diff and formats the current time
function timeFunctions (docTime, currentMoment, timezone) {
	var docMoment = moment(docTime, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
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

// NOT USED YET
function getUserInfo (username, admin, callback) {
	DB.collection('users').findOne({ username: username, admin: admin }, function (err, result) {
		if (err) { return callback(err); }
		if (result) { return callback(null, result); }
		callback('No user found');
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
function getCheckInLatLng (tech, icon, max, timezone, collection, callback) {
	DB.collection( collection + "_checkins" ).find({ username: tech }, { _id: 0, name: 1, message: 1, timestamp: 1, location: 1 })
	.sort({_id: -1}).limit( max ).toArray(function (err, results) {
		if (err) { return callback(err); }
		results.forEach(function (result) {
			result.timestamp = moment(result.timestamp, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
			result.timestamp = momentTZ.tz(result.timestamp, timezone).format("ddd, MMM Do YYYY, h:mm:ss a");
			result.icon = icon;
		});
		callback(null, results);
	});
}

// Make sure user is logged in when sending requests
function hasPermissions (req, res, next) {
	if ( req.isAuthenticated()) {
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

router.get('/checkin', isUser, function (req, res, next) {
	res.render('checkin', {	
		title: 'Main', 
		MAPS_API_KEY: MAPS_API_KEY
	});
});

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
	checkin.created_At = moment().utc().toString();
	DB.collection(res.locals.user.admin + "_checkins").insertOne(checkin, function (err, checkin) {
		if (err) { return res.status(500).send(); }
		return res.status(200).send();
	});
});

/* GET home page. */
router.get('/', hasPermissions, function(req, res, next) {
 	res.render('index', {	
		title: 'Main', 
		MAPS_API_KEY: MAPS_API_KEY
	});
});

router.get('/settings', isAdmin, function(req, res, next) {
	getUsersForAdmin(res.locals.user.username, function(err, results) {
		if (err) { return res.status(500).send(); }
		res.render('settings', { 
			title: 'Settings',
			userArray: removePasswords(results)
		});
	});
});

router.post('/settings', isAdmin, function (req, res, next) {
	var username = req.body.username.trim().replace(/[<()>"']/g, '*');
	var type = req.body.type;
	var adminUsername = res.locals.user.username;
	if (typeof req.body.data === 'object') {
		var data = req.body.data;
	}
	console.log("Type: " + type);
	console.log("Username: " + username);
	console.log("Admin: " + adminUsername);
	if (username === adminUsername) {
		console.log("username equal");
		return res.status(400).send();
	}
	if (typeof type === 'string' && typeof username === 'string') {
		if (type === 'edit' || type === 'delete' || type === 'create') {
			if (type === 'create') {
				console.log("in create");
				// getUsersForAdmin(adminUsername, function (err, results) {
				// 	var html = jade.renderFile('./views/settings-user.jade', { userArray: results });
				// 	return res.status(200).send(html);
				// });
			}
			else if (type === 'edit') {
				console.log("in edit");
			}
			else {
				console.log("in delete");
				DB.collection('users').remove({username: username, admin: adminUsername}, 1, function (err) {
					if (err) { return res.status(500).send(); }
					DB.collection(adminUsername + "_checkins").remove({username: username}, function (err) {
						if (err) { return res.status(500).send(); }
						return res.status(200).send();
					});
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

// Return current time formatted to timezone
router.get('/time', hasPermissions, function(req, res, next) {
	var timezone = req.query.tz
	var currentTime = momentTZ.tz(moment(), timezone).format("dddd, MMMM Do YYYY, h:mm:ss a");
	res.writeHead(200,"OK",{"Content-Type":"text/html"});
	res.end(currentTime);
});

// History page
router.get('/history', hasPermissions, function(req, res, next) {
	res.render('history', {
		title: 'History',
		MAPS_API_KEY: MAPS_API_KEY
	});
});

// History Query
router.post('/history', hasPermissions, function(req, res, next) {
	var name = req.body.name.toLowerCase();
	var timezone = req.body.tz;
	var num = parseInt(req.body.num);
	getCheckInLatLng(name, DEFAULT_ICON, num, timezone, res.locals.user.username, function(err, results) {
		if (err) { return res.status(500).send(); }
		var coordinates = {};
		coordinates[name] = results;
		res.writeHead(200,"OK",{"Content-Type":"application/json"});
		res.end(JSON.stringify(coordinates));
	});
});

// Return a JSON object with latest info from each tech
router.get('/updateTechs', hasPermissions, function(req, res, next) {
	var timezone = req.query.tz;
	var techArray = [];
	var currentMoment = moment();
	DB.collection('users').find( { admin: res.locals.user.username }, { _id: 0, username: 1 }).toArray(function (err, results) {
		if (err) { return res.status(500).send(); }
		var numTechs = results.length;
		results.forEach(function(tech) {
			getDocsFromTech(tech.username, res.locals.user.username, function(err, results) {
				if (err) {return res.status(500).send();}
				if (results !== undefined) {
					results.timestamp = timeFunctions(results.timestamp, currentMoment, timezone);
					techArray.push(results);
					numTechs--;
				}
				else {
					numTechs--;
				}
				if (numTechs === 0) {
					// Sort array so that it doesn't change around
					techArray = techArray.sort(function(a, b) {
						if (a.name > b.name) {return 1;}
						else {return -1;}
					});
					if (techArray.length === 0 ) {
						var html = "No active users, your users will appear here after they have at least one Check In."
						+ " If you have no users, please add them on the settings page (Gear Icon above)!";
					}
					else {
						var html = jade.renderFile('./views/techList.jade', { techArray: techArray });
					}
					res.writeHead(200,"OK",{"Content-Type":"text/html"});
					res.end(html);
				}
			});
		});
	});
});

// Returns a JSON object with an array of 5 lat and lng values for each tech
router.get('/updateMap', hasPermissions, function(req, res, next) {
	var timezone = req.query.tz;
	var coordinates = {};
	DB.collection('users').find({ admin: res.locals.user.username }, { _id : 0, icon: 1, username: 1 })
	.toArray(function (err, results) {
		if (err) {return res.status(500).send();}
		var numTechs = results.length;
		results.forEach(function(tech) {
			getCheckInLatLng(tech.username, tech.icon, 5, timezone, res.locals.user.username, function(err, results) {
				if (err) {return res.status(500).send();}
				if (results !== undefined) {
					coordinates[tech.username] = results;
					numTechs--;
				}
				else {
					numTechs--;
				}
				if (numTechs === 0) {
					res.writeHead(200,"OK",{"Content-Type":"application/json"});
					res.end(JSON.stringify(coordinates));
				}
			});
		});
	});
});

module.exports = router;
