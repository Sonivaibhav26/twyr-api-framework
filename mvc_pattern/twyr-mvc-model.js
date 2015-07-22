/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-model.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC Model implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var NodeCache = require('node-cache'),
	prime = require('prime'),
	promises = require('bluebird');

var mvcModel = prime({
	'constructor': function(facade) {
		console.log('Setting up the MVC-Model for: ' + facade.name);

		Object.defineProperty(this, '$facade', {
			'__proto__': null,
			'configurable': true,
			'value': facade
		});

		Object.defineProperty(this, '$proxyMap', {
			'__proto__': null,
			'value': promises.promisifyAll(new NodeCache({ 'stdTTL': 0, 'checkperiod': 0, 'useClones': false }))
		});
	},

	'addProxy': function(Proxy, callback) {
		var self = this,
			proxy = promises.promisifyAll(new Proxy(self));

		proxy = promises.promisifyAll(proxy);
		self.$proxyMap.getAsync(proxy.name)
		.then(function(exists) {
			if(!!exists) {
				throw ({ 'code': 403, 'message': 'Duplicate proxy: ' + proxy.name });
				return;
			}

			return self.$proxyMap.setAsync(proxy.name, proxy);
		})
		.then(function(success) {
			if(!success) {
				throw ({ 'code': 403, 'message': 'Could not add proxy: ' + proxy.name });
				return;
			}

			return proxy.registerAsync();
		})
		.then(function(success) {
			callback(null, success);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'delProxy': function(proxyName, callback) {
		var self = this;

		self.$proxyMap.getAsync(proxyName)
		.then(function(proxy) {
			if(!proxy) {
				return;
			}

			return proxy.unregisterAsync();
		})
		.then(function() {
			return self.$proxyMap.delAsync(proxyName);
		})
		.then(function() {
			callback(null, true);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'hasProxy': function(proxyName, callback) {
		var self = this;

		self.$proxyMap.getAsync(proxyName)
		.then(function(exists) {
			callback(null, !!exists);
		})
		.catch(function(err) {
			callback(err);
		});
	}
});

exports.twyrMVCModel = mvcModel;
