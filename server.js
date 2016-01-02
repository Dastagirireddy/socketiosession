var express 	= require('express'),
	bodyParser 	= require('body-parser'),
	mongoose 	= require('mongoose'),
	Session 	= require('express-session'),
	MongoStore 	= require('connect-mongo')(Session),
	cookieParser= require('cookie-parser');

var Promise 	= require("bluebird");
var app 		= express();
var port 		= process.env.PORT || 3000;
var Schema 		= mongoose.Schema;

var http 		= require('http').createServer(app);
var io 			= require('socket.io')(http);

Promise.promisifyAll(mongoose);

mongoose
	.connectAsync('mongodb://localhost:27017/socketiosession')
	.catch(function(err){

		console.log(err);
	});

var UserSchema 	= new Schema({
	username	: { type: String, required: true },
	email		: { type: String, unique: true, required: true },
	password	: { type: String, required: true },
	created_at	: { type: Date, default: Date.now },
	last_login	: { type: Date }
});

var SessionSchema 	= new Schema({
	sessionId		: { type: String },
	session 		: { type: String },
	expires			: { type: String }
});

var UserModel 		= mongoose.model('User', UserSchema, 'users');
var SessionModel 	= mongoose.model('Session', SessionSchema, 'sessions');

var SessionStore 	= new MongoStore({
	url: 'mongodb://localhost:27017/socketiosession',
	autoRemove: 'interval',
	autoRemoveInterval: 10
});

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(Session({
	name: '__proanalytic',
	secret: 'proanalytic',
	store: SessionStore,
	resave: true,
	saveUninitialized: true
}));

function AuthStatus(req, res, next) {

	if(req.session && req.session.user) {

		next();
	} else {

		res.statusCode = 401;
		res.end();
	}
}

app.get('/api/auth', AuthStatus, function(req, res){

	res.json({
		user: req.session.user
	});
});

app.get('/api/logout', AuthStatus, function(req, res){

	req.session.destroy(function(err){
		console.log(err);
	});

	res.json({
		statusText: 'Logged out successfully...'
	});
});

app.post('/api/login', function(req, res){

	var user 	= req.body;
	if(req.session && !req.session.user) {

		UserModel
			.findOneAsync(req.body)
			.then(function(result){

				result.last_login = new Date();
				return result.saveAsync();
			})
			.then(function(result){

				result.password = undefined;
				req.session.user = result;
				res.json(result);
			})
			.catch(function(err){

				res.statusCode = 401;
				res.end();
			});
	}
});

app.post('/api/users', function(req, res){

	var User 		= new UserModel();
	var user 		= req.body;

	User.username 	= user.username;
	User.email 		= user.email;
	User.password 	= user.password;
	User.created_at = new Date();

	User
		.saveAsync()
		.then(function(result){

			delete result.password;
			res.json(result);
		})
		.catch(function(err){

			res.statusCode = 400;
			res.end();
		})
});

http.listen(port, function(){
	console.log("Http server running at http://localhost:", port);
});

io.use(function(client, next){

	var cookies 		= client.handshake.headers.cookie;
	var handshake 		= client.request;
	var parseCookie 	= cookieParser('proanalytic');

	parseCookie(handshake, null, function (err, data) {

		var session = handshake.signedCookies['__proanalytic'];

		SessionModel
			.findOneAsync({'sessionId': session})
			.then(function(result){

				var userSession = JSON.parse(result.session);
				userSession['sessionId'] = session;
				handshake.session = userSession;
				next();
			})
			.catch(function(err){

				console.log(err);
			});
	});
});

var socketMap = {};

io.on('connection', function(client){

	console.log(client.id + ' has been connected to socket server');

	var socketSession = getSocketSession(client);

	if(typeof socketSession !== undefined) {

		var id = socketSession.sessionId;
		
		if(!socketMap.hasOwnProperty(id)) {

			socketMap[id] = [];
			socketMap[id].push(client.id);
		} else {

			socketMap[id].push(client.id);
		}
		console.log(stringifyJSON(socketMap));
		client.emit('auth', 'You are Authorized user.', socketSession.user);
	} else {

		client.emit('auth', 'You are not Authorized user.', undefined);
	}

	client.on('logout', function() {

		client.disconnect();
	});

	client.on('disconnect', function(){

		var id = socketSession.sessionId;
		deleteClientSocket(id, client);
		console.log(stringifyJSON(socketMap));
	});
});

function getRandomNumber() {

	return Math.floor(Math.random() * 10000000);
}

function stringifyJSON(data) {

	return JSON.stringify(data);
}

function deleteClientSocket(mapId, client) {

	if(socketMap.hasOwnProperty(mapId)) {

		var index = socketMap[mapId].indexOf(client.id);
		socketMap[mapId].splice(index, 1);

		if(socketMap[mapId].length === 0) {

			delete socketMap[mapId];
		}
	}
}

function getSocketSession(client) {

	if(typeof client.request.session !== undefined) {

		return client.request.session;
	} else {

		return undefined;
	}
}