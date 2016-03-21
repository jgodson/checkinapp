var nodemailer = require('nodemailer');

// Set up nodemailer
var smtpConfig = {
	service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASSWORD
    }
};

var mailOpts = {
    from: 'FST Check In',
    to: 'jason.godson@ambyint.com',
    subject: 'Jason is overdue for Check In',
    text : ' has not checked for minutes! Please contact to ensure they are safe.',
    html : '<p> has not checked for minutes! Please contact to ensure they are safe.</p>'
};

var transporter = nodemailer.createTransport(smtpConfig);

transporter.sendMail(mailOpts, function (err, response) {
	if (err) {
		console.log('Error');
	} else {
		console.log('Sent!');
	}
});