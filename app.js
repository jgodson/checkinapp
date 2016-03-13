// If no MONGO_URI is available from process.env then include file for dev purposes
var secureCookie = true;
if (!process.env.MONGO_URI) {
	require('./env.js');
	// Cookie not secure in dev
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
app.disable('x-powered-by');

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
		secure: secureCookie
	},
	store: new MongoStore({
		url: process.env.MONGO_URI,
		ttl: 7 * 24 * 60 * 60, // 7 days
		touchAfter: 24 * 60 * 60 // only change every 24 hours
	}),
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	unset: 'destroy'
}));

app.use(passport.initialize());
app.use(passport.session());


app.all('*', function(req, res, next){
	res.locals.user = req.user || null;
	next();
});

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