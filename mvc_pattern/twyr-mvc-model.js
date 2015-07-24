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
		facade.$dependencies.logger.debug('Setting up the MVC-Model for: ' + facade.name);

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
		var self = this;

		self.$facade.$dependencies.logger.debug('Adding Proxy for ' + this.$facade.name + ': ' + Proxy.prototype.name);
		self.$proxyMap.getAsync(Proxy.prototype.name)
		.then(function(exists) {
			if(!!exists) {
				throw ({ 'code': 403, 'message': 'Duplicate proxy: ' + Proxy.prototype.name });
				return;
			}

			var proxy = promises.promisifyAll(new Proxy(self));
			return self.$proxyMap.setAsync(proxy.name, proxy);
		})
		.then(function(success) {
			if(!success) {
				throw ({ 'code': 403, 'message': 'Could not add proxy: ' + Proxy.prototype.name });
				return;
			}

			callback(null, success);
		})
		.catch(function(err) {
			self.$facade.$dependencies.logger.error('Error adding Proxy for ' + self.$facade.name + ': ' + Proxy.prototype.name + '\nError: ', err);
			callback(err);
		});
	},

	'delProxy': function(proxyName, callback) {
		var self = this;

		self.$facade.$dependencies.logger.debug('Deleting Proxy for ' + self.$facade.name + ': ' + proxyName);
		self.$proxyMap.delAsync(proxyName)
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
	},

	'getData': function(inputData, callback) {
		var self = this;

		self.$facade.$dependencies.logger.debug('Getting Data for ' + self.$facade.name + ': ' + inputData.name);
		self.$proxyMap.getAsync(inputData.name)
		.then(function(proxy) {
			if(!proxy) {
				throw ({ 'code': 403, 'message': 'Proxy ' + inputData.name + ' not found' });
				return;
			}

			return proxy.getAsync(inputData);
		})
		.then(function(result) {
			callback(null, result);
		})
		.catch(function(err) {
			self.$facade.$dependencies.logger.error('Error getting Data for ' + self.$facade.name + ': ' + inputData.name + '\nError:', err);
			callback(err);
		});
	},

	'setData': function(inputData, callback) {
		var self = this;

		self.$facade.$dependencies.logger.debug('Setting Data for ' + self.$facade.name + ': ' + inputData.name);
		self.$proxyMap.getAsync(inputData.name)
		.then(function(proxy) {
			if(!proxy) {
				throw ({ 'code': 403, 'message': 'Proxy ' + inputData.name + ' not found' });
				return;
			}

			return promises.all([proxy.name, proxy.setAsync(inputData)]);
		})
		.then(function(result) {
			var proxyName = result[0],
				setResult = result[1];

			callback(null, setResult);
			self.notify('twyr-mvc-model-data-change', proxyName);
		})
		.catch(function(err) {
			self.$facade.$dependencies.logger.error('Error setting Data for ' + self.$facade.name + ': ' + inputData.name + '\nError:', err);
			callback(err);
		});
	},

	'notify': function(eventName, proxyName) {
		this.$facade.$notifier.emit(eventName, proxyName);
	}
});

exports.twyrMVCModel = mvcModel;
