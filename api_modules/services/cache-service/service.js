/*
 * Name			: api_modules/services/cache-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Cache Service
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
	redis = require('redis');

var cacheService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'start': function(dependencies, callback) {
		var self = this;
		cacheService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$cache'] = promises.promisifyAll(redis.createClient(self.$config.port, self.$config.host, self.$config.options));
			self.$cache.on('connect', self._setCache.bind(self, callback, status));
			self.$cache.on('error', self._cacheError.bind(self, callback, status));
		});
	},

	'getInterface': function() {
		return this.$cache;
	},

	'stop': function(callback) {
		var self = this;
		cacheService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self.$cache.quitAsync()
			.then(function() {
				self.$cache.end();
				delete self['$cache'];

				callback(null, status);
			})
			.catch(function(err) {
				callback(err);
			});
		});
	},

	'_setCache': function(callback, status) {
		if(callback) callback(null, status);
	},

	'_cacheError': function(callback, status, err) {
		if(callback) callback(err, status);
	},

	'name': 'cacheService',
	'dependencies': ['logger']
});

exports.service = cacheService;
