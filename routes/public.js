var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
	if (req.user) { res.redirect('/app/checkin'); }
	else { res.redirect('/users/login'); }
});

module.exports = router;