const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
	if (!!req.user) { 
		if (req.user.account_type === 'admin' || req.user.account_type === 'view') {
			res.redirect('/app');
		}
		else { res.redirect('/app/checkin'); }
	}
	else { res.redirect('/users/login'); }
});

module.exports = router;