const express = require('express');
const router = express.Router();
const passport = require('passport');
const moment = require("moment");
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt-nodejs');
const filter = require('../filter.js');
const passwordGen = require('../passwordGen.js');

const VALID_NEW_ADMIN_PROPS = 'username firstName lastName companyName overdueNotifications'.split(' ')
	.concat('phone requiredCheckIn reminderTime overdueTime emergencyTime email'.split(' '));

// Set up nodemailer
const SMTP_CONFIG = {
	service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD
    }
};
const transporter = nodemailer.createTransport(SMTP_CONFIG);
const EMAIL_FROM_NAME = 'Tech Check Ins';

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

// Send new account info
function sendPassword(user, callback) {
	var username = user.username;
	var email = user.email;
	var newPassword = passwordGen.genPassword(12);
	bcrypt.hash(newPassword, bcrypt.genSaltSync(), null, function(err, hash) {
		if (err) { callback(err); return; }
		DB.collection('users').updateOne({ username: username }, { $set : { password: hash } }
		, function (err, result) {
			if (err) { callback(err); return; }
			var mailOpts = {
				from: EMAIL_FROM_NAME,
				to: email,
				subject: 'You have created an account on Tech Check Ins',
				text : 'Your username is: ' + username + ' and your password is: ' 
					+ newPassword + '. Please log in and create your users!',
				html : '<p>Your username is: <strong>' + username + '</strong> and your password is: <strong>' 
					+ newPassword + '</strong></p><p>Please log in and create your users!</p>'
			};
			// Send email with new password
			transporter.sendMail(mailOpts, function (err, response) {
				if (err) { callback(err, false); } 
				else { callback(null, true); }
			});
		});
	});
}

// GET admin login page
router.get('/login', function (req, res, next) {
	if (!!req.user) {
		if (req.user.account_type === 'admin' || req.user.account_type === 'view') {
			return res.redirect('/app');
		}
	}
 	res.render('admin_login', { title: 'Admin Login' });
});

// GET Admin signup page
router.get('/signup', function(req, res, next) {
	if (!!req.user) {
		if (req.user.account_type === 'admin' || req.user.account_type === 'view') {
			return res.redirect('/app');
		}
	}
	res.render('admin-signup', { title: 'Sign Up' });
});

router.post('/signup', function (req, res, next) {
	var data = req.body.data;
	// Make sure we have data object
	if (!data) {
		return res.status(400).send();
	}
	// Make sure everything we need is there
	if (!(typeof data.username !== 'string' || typeof data.email !== 'string' ||
		typeof data.lastName !== 'string' || typeof data.firstName !== 'string' ||
		typeof data.phone !== 'string' || typeof data.requiredCheckIn !== 'number' ||
		typeof data.reminderTime !== 'number' || typeof data.overdueTime !== 'number' ||
		typeof data.emergencyTime !== 'number' || data.overdueNotifications !== 'boolean')) {
			console.log('failed data check');
			return res.status(400).send();
	}
	if (data.phone !== '' && (data.phone.search(/^\d{1}[- .]\d{3}[- .]\d{3}[- .]\d{4}$/) > -1
		|| data.phone.search(/^\d{11}$/) > -1)) {
			data.phone = data.phone.replace(/[ -.]/g, '');
	}
	else {
		res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
		return res.end(JSON.stringify({error: 'Invalid phone number'})); 
	}
	if (data.email === '' || data.email.search(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i) === -1) {
		res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
		return res.end(JSON.stringify({error: {email: true } })); 
	}
	if (data.requiredCheckIn % 5 !== 0 || data.overdueTime % 5 !== 0 || data.emergencyTime % 5 !== 0 
		|| data.reminderTime % 5 !== 0) {
			res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
			return res.end(JSON.stringify({error: 'Times must be multiples of 5' })); 
	}
	// Eliminate anything we don't need
	data = filter.filterProps(data, VALID_NEW_ADMIN_PROPS);
	// Check if the username or email already exist
	checkIfTaken(data.username, data.email, function (err, result) {
		if (err) { return res.status(500).send(); }
		if (result) {
			res.writeHead(400, "Bad Request", { "Content-Type":"application/json;charset=UTF-8" } );
			return res.end(JSON.stringify({error: result})); 
		}
		// Set the other fields we need
		data.account_type = 'admin';
		data.dateRegistered = moment().utc().toString();
		data.payStartDate = moment().utc().add(1, 'months').toString();
		data.currentBalance = 0;
		data.suspended = false;
		// Add new admin into database
		DB.collection('users').insertOne(data, function (err) {
			if (err) { return res.status(500).send(); }
			// Send the password to the email given
			sendPassword(data, function (err, result) {
				if (err) {
					// If password wasn't sent for some reason delete newly created admin
					DB.collection('users').remove({ username: data.username }, 1, function (err) {
						return res.status(500).send();
					});
				}
				else {
					return res.status(200).send();
				}
			});
		});
	});
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/admins/login', 
    failureFlash: false,
	successRedirect: '/app'
    })
);

router.get('/logout', function (req, res) {
    req.logOut();
	req.session.destroy();
    res.redirect('/admins/login');
});

module.exports = router;
