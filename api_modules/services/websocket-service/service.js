/*
 * Name			: api_modules/services/websocket-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Websocket Service
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../service-base').baseService,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var path = require('path');

var websocketService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'start': function(dependencies, callback) {
		var self = this;
		websocketService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self.$dependencies.eventService.once('twyrstart', self._startPrimus.bind(self));
			callback(null, status);
		});
	},

	'getInterface': function() {
		return this.$websocketServer;
	},

	'stop': function(callback) {
		var self = this;
		websocketService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			if(self['$websocketServer']) {
				self['$websocketServer'].end({
					'close': false,
					'timeout': 0
				});
	
				delete self['$websocketServer'];
			}

			callback(null, status);
		});
	},

	'_startPrimus': function(twyrServer) {
		var PrimusServer = require('primus'),
			self = this;

		// Step 1: Setup the realtime streaming server
		self['$websocketServer'] = new PrimusServer(twyrServer.$apiServer, self.$config);

		// Step 2: Put in the authorization hook
		self.$websocketServer.authorize(self._authorizeWebsocketConnection.bind(self));

		// Step 3: Attach the event handlers...
		self.$websocketServer.on('initialised', self._websocketServerInitialised.bind(self));
		self.$websocketServer.on('log', self._websocketServerLog.bind(self));
		self.$websocketServer.on('error', self._websocketServerError.bind(self));

		// Step 4: Log connection / disconnection events
		self.$websocketServer.on('connection', self._websocketServerConnection.bind(self));
		self.$websocketServer.on('disconnection', self._websocketServerDisconnection.bind(self));
	},

	'_authorizeWebsocketConnection': function(request, done) {
		request.user ? done() : done({ 'statusCode': 403, 'message': 'Public access not allowed' });
	},

	'_websocketServerInitialised': function(transformer, parser, options) {
		this.$dependencies.logger.debug('Websocket Server has been initialised with:\nOptions: ', options);
	},

	'_websocketServerLog': function() {
		this.$dependencies.logger.debug('Websocket Server Log: ', arguments);
	},

	'_websocketServerError': function() {
		this.$dependencies.logger.error('Websocket Server Error: ', arguments);
	},

	'_websocketServerConnection': function(spark) {
		this.$dependencies.eventService.emit('websocket-connect', spark);
	},

	'_websocketServerDisconnection': function(spark) {
		this.$dependencies.eventService.emit('websocket-disconnect', spark);
	},

	'name': 'websocketService',
	'dependencies': ['logger', 'eventService']
});

exports.service = websocketService;

