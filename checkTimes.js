// CHECK IF USERS ARE OVERDUE/NEED REMINDER AND TAKE ACTION (Runs every 5 minutes)
// Check if in DEV environment
if (!process.env.MONGO_URI) {
	require('./env.js');
}

// RUN INTERVAL VARIABLE. MUST BE SET TO HOW OFTEN SCRIPT IS RUN
const runInterval = parseInt(process.env.runInterval);

// Require what we need
const MongoClient = require('mongodb').MongoClient;
const URI = process.env.MONGO_URI;
const nodemailer = require('nodemailer');
const moment = require('moment');
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH); 
var DB; // DB object to be created later

// Set up nodemailer
const SMTP_CONFIG = {
	service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD
    }
};
const EMAIL_FROM_NAME = 'Tech Check Ins';
const transporter = nodemailer.createTransport(SMTP_CONFIG);

// Function to connect to DB. Returns the DB object
function connectToDB(URI, callback) {
	MongoClient.connect(URI, function (err, db) {
		if (err) { return callback(err); }
		DB = db;
		callback(null);
	});
}

// GET ALL ADMINS
function getAdmins (callback) {
	DB.collection('users').find({ account_type: 'admin' }).toArray(function (err, results) {
		if (err) { return callback(err); }
		callback(null, results);
	});
}

// Get Last Check In for given user
function getLastCheckIn (user, admin, callback) {
	DB.collection(admin.username + '_checkins').find({ username: user.username }).sort({ _id: -1 })
		.limit(1).toArray(function (err, result) {
			if (err) { return callback(err); }
			callback(null, result[0]);
	});
}

// Get View Users that have notifications On
function getViewUsers (admin, callback) {
	DB.collection('users').find({ admin: admin.username, account_type: 'view' })
		.toArray(function (err, results) {
			if (err) { return callback(err); }
			callback(null, results);
	});
}

// Get Check In Users for Admin
function getCheckInUsers (admin, callback) {
	DB.collection('users').find({ admin: admin.username, account_type: 'user' })
		.toArray(function (err, results) {
			if (err) { return callback(err); }
			callback(null, results);
	});
}

// CHECK IF NOTIFICATION NEEDED
// Using the last checkin, if it was a checkin or a start then compare it to the time and see if 
// a notification needs to be sent
function checkNotification (user, admin, callback) {
	getLastCheckIn(user, admin, function (err, previous) {
		if (previous === undefined) {
			console.log("No Checkins for user");
			return callback(null);
		}
		var checkInInterval = admin.requiredCheckIn;
		var reminderTime = admin.reminderTime;
		var notifyEmergencyContact = admin.emergencyTime;
		var overdueTime = admin.overdueTime;
		if (previous.type === 'Check In' || previous.type === 'Start') {
			var timeNow = moment();
			var previousTime = moment(previous.timestamp, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
			var timeDiff = timeNow.diff(previousTime, 'minutes'); // get time difference in mins
			console.log(previous.name + " last check in was " + timeDiff + " minutes ago");
			if (timeDiff >= (checkInInterval - reminderTime)) {
				console.log("In Reminder/Overdue");
				var tech = previous.username;
				var dontSend = false;
				// Stop sending messages if it's been too long
				if (timeDiff < (checkInInterval + notifyEmergencyContact)) {
					console.log("Checking if: " + timeDiff + " is less than " + (checkInInterval + notifyEmergencyContact));
					var overdueAlert = timeDiff >= (checkInInterval + overdueTime);
					console.log("Reminders are: " + (user.reminders ? 'ON' : 'OFF'));
					console.log("Notifications are: " + (user.notifications ? 'ON' : 'OFF'));
					console.log("Checking if: " + timeDiff + " > " + checkInInterval);
					if (timeDiff > checkInInterval && user.reminders) {
						console.log("OVERDUE REMINDER");
						var message = "You are " + (-(checkInInterval - timeDiff)) + " minutes overdue for Check In!";
						var subject = "OVERDUE WARNING";
					}
					else if (timeDiff < checkInInterval && user.notifications) {
						console.log("NORMAL REMINDER");
						var message = "You are due for a Check In in " + (checkInInterval - timeDiff) + " minutes";
						var subject = "REMINDER NOTIFICATION"
					}
					else {
						console.log("Setting dontSend to: true");
						dontSend = true;
					}
					if (!dontSend) {
						console.log("Sending REMINDER/OVERDUE Notification");
						var emailObj = {
							to: user.email,
							text: message,
							subject: subject
						}
						sendEmail(emailObj, function (err) {
							if (err) { 
								var emailError = {
									to: process.env.ERROR_EMAIL,
									subject: "Error sending email to " + user.email,
									text: err
								}
								sendEmail(emailError);
							}
						});
					}
					console.log("OVERDUE ALERT (ADMIN/VIEW USERS): " + overdueAlert);
					if (overdueAlert) {
						var massEmail = {
							text: user.firstName + " " + user.lastName + " (" + user.username + ") is " 
								+ (-(checkInInterval - timeDiff)) + " minutes overdue for check in!",
							subject: subject
						}
						console.log("Admin notifications are " + (admin.overdueNotifications ? 'ON' : 'OFF'));
						if (admin.overdueNotifications) {
							massEmail.to = admin.email;
							sendEmail(massEmail);
						}
						getViewUsers(admin, function (err, viewUsers) {
							if (err) {
								var emailError = {
									to: process.env.ERROR_EMAIL,
									subject: "Error getting view users for " + admin.username,
									text: err
								}
								sendEmail(emailError);
								throw err;
							}
							if (viewUsers.length !== 0) {
								viewUsers.forEach(function (viewUser) {
									if (viewUser !== undefined) {
										console.log(viewUser.username + " has notifications " + (viewUser.notifications ? 'ON' : 'OFF'));
										if (viewUser.notifications) {
											massEmail.to = viewUser.email;
											sendEmail(massEmail);
										}
									}
								});
							}
							callback(null);
						});
					}
					else {
						callback(null);
					}
				}
				else {
					// Ensure they are only sent a message once
					console.log("Checking if: " + timeDiff + " is less than " + (checkInInterval + notifyEmergencyContact + runInterval));
					if (timeDiff < (checkInInterval + notifyEmergencyContact + runInterval)) {
						console.log("In Emergency Noticications");
						if (user.emergencyContact.email !== '') {
							console.log("Sending EMERG msg to " + user.emergencyContact.email);
							var mailOpts = {
								to: user.emergencyContact.email,
								subject: user.firstName + " " + user.lastName + ' is overdue for Check In',
								html : '<p>' + user.firstName + " " + user.lastName + ' (' + user.username + ')'
									+ ' is overdue by ' + (timeDiff - checkInInterval) + ' minutes! Please ' 
									+ 'ensure they are safe.</p><p><strong>You will only receive this email' 
									+ ' once</strong></p>'
							};
							sendEmail(mailOpts);
						}
						if (user.emergencyContact.phone !== '') {
							console.log("Sending EMERG text to " + user.emergencyContact.phone);
							var phoneOpts = {
								phone: user.emergencyContact.phone,
								body: user.firstName + " " + user.lastName + " is overdue by " + (timeDiff - checkInInterval) 
									+ " minutes. Please ensure they are safe. You will only get this message once."
							}
							sendText(phoneOpts);
						}
					}
					else {
						console.log("Emergency contact already notified.");
					}
					callback(null);
				}
			}
			else {
				console.log(timeDiff + " not >= " + (checkInInterval - reminderTime));
				console.log("NO ACTION TAKEN");
				callback(null);
			}
		}
		else {
			console.log('Last checkin was END');
			callback(null);
		}
	});
}

// NOTIFICATIONS
// Send Email
function sendEmail (emailObj, callback) {
	emailObj.from = EMAIL_FROM_NAME;
	if (typeof emailObj.text === 'object' && !Array.isArray(emailObj.text)) {
		emailObj.text = JSON.stringify(emailObj.text);
	}
	transporter.sendMail(emailObj, function (err, response) {
		if (err) { 
			if (typeof callback === 'undefined') {
				console.log("Error sending email to " + emailObj.to);
				console.log("Subject " + emailObj.subject);
				console.log(emailObj.text);
			}
			else {
				return callback(err);
			}
		}
		else if (typeof callback === 'undefined') {
			console.log('Email Sent to ' + emailObj.to + ' about ' + emailObj.subject);
		}
		else {
			console.log('Email Sent to ' + emailObj.to + ' about ' + emailObj.subject);
			callback(null); 
		}
	});
}

// Send Text
function sendText (messageObj) {
	twilio.messages.create({ 
		to: messageObj.phone, 
		from: process.env.TWILIO_PHONE, 
		body: messageObj.body,   
	}, function(err, message) { 
		if (err) {
			var emailObj = {
				to: process.env.ERROR_EMAIL,
				subject: "Error sending text to " + messageObj.phone,
				text: err
			}
			sendEmail(emailObj);
		}
		else {
			console.log("Text sent to " + messageObj.phone);
		}
	});
}

// MAIN SCRIPT
var totalAdmins = 0; // Keep track of the total number of admins
var doneAdmins = 0; // Keep track of how many admins have been finished
var totalUsersObj = {}; // Keep track of how many users for each admin
var doneUsersObj = {}; // Keep track of how many users done for each admin

// CONNECT TO DB
connectToDB(URI, function (err) {
	console.log(Date());
	if (err) {
		var emailObj = {
			to: process.env.ERROR_EMAIL,
			subject: "Error connecting to DB",
			text: err
		}
		sendEmail(emailObj);
		throw err;
	}
	// GET ADMINS
	getAdmins(function (err, results) {
		if (err) {
			var emailObj = {
				to: process.env.ERROR_EMAIL,
				subject: "Error getting Admins",
				text: err
			}
			sendEmail(emailObj);
			throw err;
		}
		// LOOP THROUGH ADMINS
		totalAdmins = results.length;
		results.forEach(function (admin) {
			console.log("Working on admin " + admin.username);
			// GET CHECKIN USERS FOR ADMINS
			getCheckInUsers(admin, function (err, users) {
				if (err) {
					var emailObj = {
						to: process.env.ERROR_EMAIL,
						subject: "Error getting users for " + admin.username,
						text: err
					}
					sendEmail(emailObj);
					throw err;
				}
				if (users.length === 0) {
					console.log("No users for " + admin.username);
					doneAdmins++;
					console.log("Finished " + doneAdmins + "/" + totalAdmins + " admins");
					if (doneAdmins === totalAdmins) {
						console.log("Finished");
						DB.close();
					}
				}
				totalUsersObj[admin.username] = users.length;
				doneUsersObj[admin.username] = 0;
				// LOOP THROUGH USERS FOR ADMIN
				users.forEach(function (user) {
					console.log("Working on user " + user.username);
					// CHECK NOTIFICATION FOR USER
					checkNotification(user, admin, function (err) {
						if (err) {
							var emailError = {
								to: process.env.ERROR_EMAIL,
								subject: "Error checking notifications for " + user.username,
								text: err
							}
							sendEmail(emailError);
							throw err;
						}
						doneUsersObj[admin.username]++;
						console.log("Finished " + doneUsersObj[admin.username]
							+ "/" + totalUsersObj[admin.username] + " users");
						if (doneUsersObj[admin.username] === totalUsersObj[admin.username]) {
							doneAdmins++;
							console.log("Finished " + doneAdmins + "/" + totalAdmins + " admins");
							if (doneAdmins === totalAdmins) {
								console.log("Finished");
								DB.close();
							}
						}
					});
				});
			});
		});
	});
});