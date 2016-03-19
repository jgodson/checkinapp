const express = require('express');
const router = express.Router();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const ObjectId = require('mongodb').ObjectId; 
const DB = global.DB;

router.get('/login', function(req, res, next) {
	if (!!req.user) {
		if (req.user.account_type === 'user') {
			return res.redirect('/app/checkin');
		}
	}
 	res.render('user_login', { title: 'User Login' });
});

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	DB.collection('users').findOne({_id: ObjectId(id)}, function(err, user) {
		if (err) { return done(err, null); }
		else {
			done(err, user);
		}
	});
});

passport.use(new LocalStrategy({ passReqToCallback: true },
	function(req, username, password, done) {
		username = username.toLowerCase();
		DB.collection('users').findOne({ username: username }, function (err, user) {
			if (err) { return done(err); }
			if (!user){
				return done(null, false);
			}
			else {
				bcrypt.compare(password, user.password, function(error, result) {
					if (error) { return done(error); }
					if (result) {
						if (req.baseUrl === '/admins') {
							if (user.account_type === 'admin' || user.account_type === 'view')
							{
								return done(null, user);
							}
							else {
								return done(null, false);
							}
						}
						else if (req.baseUrl === '/users') {
							return user.account_type === 'user' ? done(null, user) : done(null, false);
						}
						else {
							return done(null, false);
						}
							
						
					} else {
						return done(null, false);
					}
				});
			}
		});
	}
));

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/users/login', 
    failureFlash: false,
	successRedirect: '/app/checkin'
    })
);

router.get('/logout', function(req, res){
    req.logOut();
	req.session.destroy();
    res.redirect('/users/login');
});

module.exports = router;
