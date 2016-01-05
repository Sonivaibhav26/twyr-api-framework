/// <reference path="./typings/node/node.d.ts"/>
/*
 * Name			: api-server.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server "Application Class"
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var domain = require('domain'),
	filesystem = require('fs'),
	path = require('path'),
	uuid = require('node-uuid');

var app = prime({
	'constructor': function() {
		this['$uuid'] = uuid.v4().toString().replace(/-/g, '');
		this._loadConfig(path.join(__dirname, 'api-config.js'));
	},

	'load': function(module, loader, callback) {
		console.log('\nTwyr API Server Load');

		this['$module'] = module;
		this['$loader'] = loader;

		this.$loader.loadAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Load Error: ', err);
			if(callback) callback(err);
		});
	},

	'initialize': function(callback) {
		console.log('\nTwyr API Server Initialize');

		this.$loader.initializeAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Initialize Error: ', err);
			if(callback) callback(err);
		});
	},

	'start': function(dependencies, callback) {
		console.log('\nTwyr API Server Start');

		var self = this;
		this.$loader.startAsync()
		.then(function(status) {
			if(!status) throw status;

			// Step 1: Initialize the Web/API Server
			var express = require('express'),
				acceptOverride = require('connect-acceptoverride'),
				bodyParser = require('body-parser'),
				cookieParser = require('cookie-parser'),
				compress = require('compression'),
				cors = require('cors'),
				debounce = require('connect-debounce'),
				engines = require('consolidate'),
				flash = require('connect-flash'),
				logger = require('morgan'),
				methodOverride = require('method-override'),
				poweredBy = require('connect-powered-by'),
				session = require('express-session'),
				sessStore = require('connect-' + self.$config.session.store.media)(session),
				timeout = require('connect-timeout'),
				loggerSrvc = self.$services.logger.getInterface();

			// Step 2: Setup Winston for Express Logging & CORS
			var loggerStream = {
				'write': function(message, encoding) {
					loggerSrvc.silly(message);
				}
			};

			var corsOptions = {
				'origin': function(origin, callback) {
					var isAllowedOrigin = (self.$config.corsAllowedDomains.indexOf(origin) !== -1);
					callback(null, isAllowedOrigin);
				},

				'credentials': true
			};

			// Step 3: Setup Express
			var apiServer = express();
			apiServer.set('view engine', self.$config.templateEngine);
			apiServer.set('views', path.join(__dirname, self.$config.templateDir));
			apiServer.engine(self.$config.templateEngine, engines[self.$config.templateEngine]);
			if(self.$config.cookieParser.secure) apiServer.set('trust proxy', 1);

			// Step 3.1: Setup the Session Store
			var sessionStore = new sessStore({
				'client': self.$services.cacheService.getInterface(),
				'prefix': self.$config.session.store.prefix,
				'ttl': self.$config.session.ttl
			});

			self['$cookieParser'] = cookieParser(self.$config.session.secret, self.$config.cookieParser);
			self['$session'] = session({
				'cookie': self.$config.cookieParser,
				'key': self.$config.session.key,
				'secret': self.$config.session.secret,
				'store': sessionStore,
				'saveUninitialized': true,
				'resave': false
			});

			// Step 3.2: Setup the standard stuff...
			apiServer
				.use(logger('combined', {
					'stream': loggerStream
				}))
				.use(debounce())
				.use(cors(corsOptions))
				.use(acceptOverride())
				.use(methodOverride())
				.use(compress())
				.use(poweredBy(self.$config.poweredBy))
				.use(timeout(self.$config.requestTimeout * 1000))
				.use(flash())
				.use(self.$cookieParser)
				.use(self.$session)
				.use(bodyParser.json({
					'limit': self.$config.maxRequestSize
				}))
				.use(bodyParser.json({
					'type': 'application/vnd.api+json',
					'limit': self.$config.maxRequestSize
				}))
				.use(bodyParser.raw({
					'limit': self.$config.maxRequestSize
				}))
				.use(bodyParser.text({
					'limit': self.$config.maxRequestSize
				}))
				.use(bodyParser.urlencoded({
					'extended': true,
					'limit': self.$config.maxRequestSize
				}))
				.use(self.$services.authService.getInterface().initialize())
				.use(self.$services.authService.getInterface().session())
				.use(function(request, response, next) {
					var requestDomain = domain.create();
					requestDomain.add(request);
					requestDomain.add(response);

					requestDomain.on('error', function(error) {
						loggerSrvc.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', error);
						response.status(500).redirect('/error.html');
					});

					next();
				});

			// Step 3.3: Hook-in the component routers...
			for(var idx in self.$components) {
				var thisComponent = self.$components[idx],
					router = thisComponent.getRouter();

				console.log('Loading ' + thisComponent.name + ' @ ' + path.join((self.$config.componentMountPath || '/'), thisComponent.name));
				apiServer.use(path.join((self.$config.componentMountPath || '/'), thisComponent.name), router);
			}

			// Step 3.4: Add in the framework router...
			var frameworkRouter = require(self.$config.router).router.bind(self);
			apiServer.use(frameworkRouter());

			// Step 3.5: Finally, The error handlers...
			apiServer
				.use(function(err, request, response, next) {
					if(err) {
						loggerSrvc.error('API Server Error: ', err);
						response.status(err.code || err.number || 500).redirect('/error.html');
					}
					else {
						loggerSrvc.error('API Server Error: Unhandled Route');
						response.status(err.code || err.number || 404).redirect('/error.html');
					}
				});

			// Step 4: Persist for future use
			var protocol = require(self.$config.protocol || 'http');
			if((self.$config.protocol || 'http') == 'http') {
				self['$apiServer'] = protocol.createServer(apiServer);
			}
			else {
				self.$config.ssl.key = filesystem.readFileSync(path.join(__dirname, self.$config.ssl.key));
				self.$config.ssl.cert = filesystem.readFileSync(path.join(__dirname, self.$config.ssl.cert));
				self['$apiServer'] = protocol.createServer(self.$config.ssl, apiServer);
			}

			// Step 5: Cleanup stuff...
			self.$apiServer.on('connection', self._apiServerConnection.bind(self));
			self.$apiServer.on('error', self._apiServerError.bind(self));

			// Finally, start listening and emit
			self.$apiServer.listen(self.$config.port || 8000);
			(self.$services.eventService.getInterface()).emit('twyrstart', self);

			if(callback) callback(null, status);
			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Start Error: ', err);
			if(callback) callback(err);
		});
	},

	'stop': function(callback) {
		console.log('\nTwyr API Server Stop');

		this.$apiServer.on('close', this._apiServerClose.bind(this, callback));
		this.$apiServer.close();
	},

	'uninitialize': function(callback) {
		console.log('\nTwyr API Server Uninitialize');

		this.$loader.uninitializeAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Uninitialize Error: ', err);
			if(callback) callback(err);
		});
	},

	'unload': function(callback) {
		console.log('\nTwyr API Server Unload');

		var self = this;
		this.$loader.unloadAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Unload Error: ', err);
			if(callback) callback(err);
		})
		.finally(function() {
			delete self['$loader'];
			delete self['$module'];

			return null;
		});
	},

	'_loadConfig': function(configFilePath) {
		// Load / Store the configuration...
		var env = (process.env.NODE_ENV || 'development').toLowerCase(),
			config = require(configFilePath || './config.js')[env];

		this['$config'] = config;
	},

	'_apiServerConnection': function(socket) {
		socket.setTimeout(this.$config.connectionTimeout * 1000);
	},

	'_apiServerError': function(error) {
		this.$services.logger.getInterface().error('API Server Error: ', JSON.stringify(error));
	},

	'_apiServerClose': function(callback) {
		var self = this;

		this.$loader.stopAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);

			return null;
		})
		.catch(function(err) {
			console.error('Twyr API Server Stop Error: ', err);
			if(callback) callback(err);
		})
		.finally(function() {
			delete self['$apiServer'];
			delete self['$session'];
			delete self['$cookieParser'];

			return null;
		});
	},

	'name': 'Twyr API Server',
	'dependencies': []
});

exports.twyrAPIServer = app;

