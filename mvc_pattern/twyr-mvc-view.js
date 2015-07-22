/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-view.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC View implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var NodeCache = require('node-cache'),
	prime = require('prime'),
	promises = require('bluebird');

var mvcView = prime({
	'constructor': function(facade) {
		console.log('Setting up the MVC-View for: ' + facade.name);

		Object.defineProperty(this, '$facade', {
			'__proto__': null,
			'configurable': true,
			'value': facade
		});

		Object.defineProperty(this, '$mediatorMap', {
			'__proto__': null,
			'value': promises.promisifyAll(new NodeCache({ 'stdTTL': 0, 'checkperiod': 0, 'useClones': false }))
		});
	},

	'addMediator': function(Mediator, callback) {
		var self = this,
			mediator = promises.promisifyAll(new Mediator(self));

		self.$mediatorMap.getAsync(mediator.name)
		.then(function(exists) {
			if(!!exists) {
				throw ({ 'code': 403, 'message': 'Duplicate mediator: ' + mediator.name });
				return;
			}

			return self.$mediatorMap.setAsync(mediator.name, mediator);
		})
		.then(function(success) {
			if(!success) {
				throw ({ 'code': 403, 'message': 'Could not add mediator: ' + mediator.name });
				return;
			}

			return mediator.registerAsync();
		})
		.then(function(success) {
			callback(null, success);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'delMediator': function(mediatorName, callback) {
		var self = this;

		self.$mediatorMap.getAsync(mediatorName)
		.then(function(mediator) {
			if(!mediator) {
				return;
			}

			return mediator.unregisterAsync();
		})
		.then(function() {
			return self.$mediatorMap.delAsync(mediatorName);
		})
		.then(function() {
			callback(null, true);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'hasMediator': function(mediatorName, callback) {
		var self = this;

		self.$mediatorMap.getAsync(mediatorName)
		.then(function(exists) {
			callback(null, !!exists);
		})
		.catch(function(err) {
			callback(err);
		});
	}
});

exports.twyrMVCView = mvcView;
