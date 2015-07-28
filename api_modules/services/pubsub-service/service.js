/*
 * Name			: api_modules/services/pubsub-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Pubsub Service
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
var path = require('path'),
	redis = require('redis');

var pubsubService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'start': function(dependencies, callback) {
		var self = this;
		pubsubService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$publishConnection'] = promises.promisifyAll(redis.createClient(self.$config.port, self.$config.host, self.$config.options));
			self.$publishConnection.on('connect', self._setConnection.bind(self, callback, status));
			self.$publishConnection.on('error', self._errorConnection.bind(self, callback, status));
	
			self['$subscribeConnection'] = promises.promisifyAll(redis.createClient(self.$config.port, self.$config.host, self.$config.options));
			self.$subscribeConnection.on('connect', self._setConnection.bind(self, callback, status));
			self.$subscribeConnection.on('error', self._errorConnection.bind(self, callback, status));
		});
	},

	'getInterface': function() {
		return {
			'publishConnection': this.$publishConnection,
			'subscribeConnection': this.$subscribeConnection
		};
	},

	'stop': function(callback) {
		var self = this;
		pubsubService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}
	
			promises.all([self.$publishConnection.quitAsync(), self.$subscribeConnection.quitAsync()])
			.then(function() {
				self.$publishConnection.end();
				self.$subscribeConnection.end();

				delete self['$subscribeConnection'];
				delete self['$publishConnection'];

				if(callback) callback(null, status);
			})
			.catch(function(err) {
				if(callback) callback(err);
			});
		});
	},

	'_setConnection': function(callback, status) {
		this.$ready++;
		if((this.$ready == 2) && callback)
			callback(null, status);
	},

	'_errorConnection': function(callback, status, err) {
		if(callback) callback(err, status);
	},

	'name': 'pubsubService',
	'dependencies': ['logger'],

	'$ready': 0
});

exports.service = pubsubService;
