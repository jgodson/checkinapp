const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/login', function(req, res, next) {
	if (!!req.user) {
		if (req.user.account_type === 'admin' || req.user.account_type === 'view') {
			return res.redirect('/app');
		}
	}
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
