const MongoClient = require('mongodb').MongoClient;
const URI = process.env.MONGO_URI;
const DB = global.DB.s.topology;

DB.on('close', function () {
	console.log('DB CLOSED EVENT');
});

DB.on('reconnect', function () {
	console.log('DB RECONNECT EVENT');
});

DB.on('error', function () {
	console.log('DB ERROR');
});

DB.on('timeout', function () {
	console.log('DB TIMEOUT');
});

DB.on('parseError', function () {
	console.log('DB PARSE ERROR');
});

DB.on('fullSetup', function () {
	console.log('DB Setup');
});

DB.on('all', function () {
	console.log('DB Operation');
});