var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId; 

var uri = process.env.MONGO_URI;

router.get('/login', function(req, res, next) {
 	res.render('admin_login', { title: 'Admin Login' });
});

router.post('/login', passport.authenticate('local', {
    failureRedirect: '/admins/login', 
    failureFlash: false,
	successRedirect: '/app'
    })
);

router.get('/logout', function(req, res){
    req.logOut();
	req.session.destroy();
    res.redirect('/admins/login');
});

module.exports = router;
