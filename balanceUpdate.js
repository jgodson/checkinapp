// PURPOSE: REMOVE PROPER AMOUNT FROM ACCOUNT BALANCE (RUNS ONCE PER DAY)
// Check if in DEV environment
if (!process.env.MONGO_URI) {
	require('./env.js');
}
// Set up monthly Charge
const serviceFee = 1 // $1.00/user/month

// Require what we need
const MongoClient = require('mongodb').MongoClient;
const URI = process.env.MONGO_URI;
const nodemailer = require('nodemailer');
const moment = require('moment');

// Set up nodemailer
const SMTP_CONFIG = {
	service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD
    }
};
const EMAIL_FROM_NAME = 'Tech Check Ins';

// Create some variables
var done = 0;
var now = moment().utc();
var DB;


// Function to connect to DB. Returns the DB object
function connectToDB(URI, callback) {
	MongoClient.connect(URI, function (err, db) {
		if (err) { callback(err); }
		DB = db;
		callback(null);
	});
}

// Email me if any errors occur
function emailOnError(error) {
	var transporter = nodemailer.createTransport(SMTP_CONFIG);
	var mailOpts = {
		from: EMAIL_FROM_NAME,
		to: process.env.ERROR_EMAIL,
		subject: 'Error occured when running Balance Update Script',
		text : error
	};
	// Send email
	transporter.sendMail(mailOpts, function (err) {
		if (err) { console.log('error'); }
	});
}

// Calculate billing amount and subtract, suspend account (if necessary)
function doBilling(result, callback) {
	var changed = {};
	var numUsers = 0;
	// Only count Check In Users
	DB.collection('users').find({ admin: result.username, account_type: 'user' }).toArray( function (err, users) {
		if (err) { callback(err); }
		if (users) {
			// COUNT USERS FOR ADMIN
			numUsers = users.length;
			console.log(numUsers + " users");
			// CALCULATE AMOUNT
			var daysInMonth = moment().daysInMonth();
			var billAmount = serviceFee / daysInMonth * numUsers;
			// REMOVE APPROPRIATE AMOUNT
			result.currentBalance -= billAmount;
			// IF NOT ENOUGH MONEY, SUSPEND ACCOUNT
			if (result.currentBalance < 0) {
				changed.suspended = true;
				console.log('Account Suspended');
			}
			else if (result.suspended === true) {
				changed.suspended = false;
				console.log('Account Activated')
			}
			changed.currentBalance = result.currentBalance;
			console.log(changed);
			// UPDATE DATABASE
			DB.collection('users').updateOne({ username : result.username }, {$set : changed}, function (err) {
				if (err) { callback(err); }
				// IF ACCOUNT WAS SUSPENDED/UNSUSPENDED, ALSO DO SO TO VIEW ACCOUNTS
				if (typeof changed.suspended !== 'undefined') {
					var setSuspended = { suspended: changed.suspended };
					DB.collection('users').updateMany({ admin : result.username, account_type : 'view' }
						, { $set : setSuspended}, function (err) {
							if (err) { callback(err); }
					});
				}
				// CREATE BILLING OBJECT FOR BILLING DATABASE
				var billing = {
					timestamp: now.format('x'),
					date: now.format('MMM D YYYY'),
					message: "Daily charge for " + numUsers + " users.",
					amount: billAmount.toFixed(2)
				}
				// INSERT INTO DATABASE
				DB.collection(result.username + "_billing").insertOne(billing, function (err) {
					if (err) { callback(err); }
					console.log(result.username + ' finished');
					done++;
					callback(null);
				});
			});
		}
		else {
			console.log("No Users");
			done++;
			callback(null);
		}
	});
}
// CONNECT TO DB
connectToDB(URI, function (err){
	if (err) { emailOnError(err); throw err; }
	// GET ALL ADMINS
	DB.collection('users').find({ account_type: "admin" }).toArray(function (err, results) {
		if (err) { emailOnError(err); throw err; }
		// FOR EACH ADMIN DO THIS
		if (results.length === 0) {
			console.log('No Admins Found');
			DB.close();
			return;
		}
		admins = results.length;
		results.forEach(function (result) {
			console.log("Working on " + result.username);
			var billDate = moment(result.payStartDate, 'ddd, MMM Do YYYY, h:mm:ss a Z', 'en');
			// CHECK IF THEY SHOULD BE CHARGED (TRIAL PERIOD)
			if (now.diff(billDate, 'days') > 0) {
				doBilling(result, function(err) {
					if (err) { emailOnError(err); throw err; }
					console.log("Finished " + done + "/" + admins);
					if (done === admins) {
						DB.close();
					}
				});
			}
			else {
				console.log('Trial Account');
				done++;
				console.log("Finished " + done + "/" + admins);
				if (done === admins) {
					DB.close();
				}
			}
		});
	});
});

