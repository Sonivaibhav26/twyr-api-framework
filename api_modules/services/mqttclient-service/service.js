/*
 * Name			: api_modules/services/mqttclient-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MQTT Client Service
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var base = require('./../service-base').baseService,
	path = require('path'),
	prime = require('prime'),
	promises = require('bluebird'),
	mqtt = require('mqtt');

var mqttclientService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, './config.js'));
	},

	'initialize': function(callback) {
		var self = this;
		mqttclientService.parent.initialize.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$mqtt'] = promises.promisifyAll(mqtt.createClient(self.$config.port, self.$config.host));
			self.$mqtt.on('connect', self._setMQTTConnection.bind(self, callback));
		});
	},

	'getInterface': function() {
		return promises.promisifyAll(this.$mqtt);
	},

	'uninitialize': function(callback) {
		var self = this;

		mqttclientService.parent.uninitialize.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self.$mqtt.end();
			delete self['$mqtt'];
			
			if(callback) callback(null, true);
		});
	},

	'_setMQTTConnection': function(callback) {
		callback(null, true);
	},

	'name': 'mqttclientService',
	'dependencies': ['logger']
});

exports.service = mqttclientService;
