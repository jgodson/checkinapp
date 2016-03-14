// If no MONGO_URI is available from process.env then include file for dev purposes
var secureCookie = true;
var COOKIE_SESSION_TTL = (7 * 24 * 60 * 60 * 1000); // 7 days
var SESS_STORE_TOUCH_TIME = (24 * 60 * 60 * 1000) // 24 hours

// If no env variables, include file for development.
if (!process.env.MONGO_URI) {
	require('./env.js');
	// Cookie not secure in dev.
	secureCookie = false;
};

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

var routes = require('./routes/index');
var users = require('./routes/users');
var admins = require('./routes/admins');
var publicRoute = require('./routes/public');

var app = express();

// Remove the powered by express header
app.disable('x-powered-by');

// Alow proxy for https on production 
app.set('trust proxy', 1);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	cookie: {
		name: 'checkinapp.sid',
		secure: secureCookie,
		maxAge: COOKIE_SESSION_TTL
	},
	store: new MongoStore({
		url: process.env.MONGO_URI,
		ttl: COOKIE_SESSION_TTL,
		touchAfter: SESS_STORE_TOUCH_TIME
	}),
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	unset: 'destroy' // Destory session in mongo store on log out.
}));

app.use(passport.initialize());
app.use(passport.session());

// Make user available to all routes
app.all('*', function(req, res, next){
	res.locals.user = req.user || null;
	next();
});

// Set up routes
app.use('/', publicRoute);
app.use('/app', routes);
app.use('/admins', admins);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;