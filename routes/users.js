var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId; 

var uri = process.env.MONGO_URI;

router.get('/login', function(req, res, next) {
 	res.render('user_login', { title: 'User Login' });
});

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	MongoClient.connect(uri, function(err, db) {
		if (err) { return done(err, null); }
 		db.collection('users').findOne({_id: ObjectId(id)}, function(err, user) {
			if (err) { return done(err, null); }
			else {
				db.close();
				done(err, user);
			}
  		});
	});
});

passport.use(new LocalStrategy({
	passReqToCallback: true
	},
  function(req, username, password, done) {
	  username = username.toLowerCase();
	  MongoClient.connect(uri, function(err, db) {
		db.collection('users').findOne({ username: username }, function (err, user) {
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
