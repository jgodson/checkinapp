const MongoClient = require('mongodb').MongoClient;
const URI = process.env.MONGO_URI;
const DB = global.DB.s.topology;

DB.on('close', function () {
	console.log(Date() + ' DB CLOSED EVENT');
});

DB.on('reconnect', function () {
	console.log(Date() + ' DB RECONNECT EVENT');
});

DB.on('error', function () {
	console.log(Date() + ' DB ERROR');
});

DB.on('timeout', function () {
	console.log(Date() + ' DB TIMEOUT');
});

DB.on('parseError', function () {
	console.log(Date() + ' DB PARSE ERROR');
});

DB.on('fullSetup', function () {
	console.log(Date() + ' DB Setup');
});

DB.on('all', function () {
	console.log(Date() + ' DB Operation');
});