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
	Events = require('eventemitter3'),
	prime = require('prime'),
	promises = require('bluebird');

var mvcView = prime({
	'constructor': function(facade) {
		facade.$dependencies.logger.debug('Setting up the MVC-View for: ' + facade.name);

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
		var self = this;

		self.$facade.$dependencies.logger.debug('Adding Mediator for ' + self.$facade.name + ': ' + Mediator.prototype.name);
		self.$mediatorMap.getAsync(Mediator.prototype.name)
		.then(function(exists) {
			if(!!exists) {
				throw ({ 'code': 403, 'message': 'Duplicate mediator: ' + Mediator.prototype.name });
				return;
			}

			var mediator = promises.promisifyAll(new Mediator(self));
			return self.$mediatorMap.setAsync(mediator.name, mediator);
		})
		.then(function(success) {
			if(!success) {
				throw ({ 'code': 403, 'message': 'Could not add mediator: ' + Mediator.prototype.name });
				return;
			}

			callback(null, true);
		})
		.catch(function(err) {
			self.$facade.$dependencies.logger.error('Error adding Mediator for ' + self.$facade.name + ': ' + Mediator.prototype.name + '\nError: ', err);
			callback(err);
		});
	},

	'delMediator': function(mediatorName, callback) {
		var self = this;

		self.$facade.$dependencies.logger.debug('Deleting Mediator for ' + self.$facade.name + ': ' + mediatorName);
		self.$mediatorMap.delAsync(mediatorName)
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
	},

	'updateMediator': function(modelData, callback) {
		var self = this;

		self.$facade.$dependencies.logger.debug('Updating Mediator for ' + self.$facade.name + ': ' + modelData.name);
		self.$mediatorMap.getAsync(modelData.name)
		.then(function(mediator) {
			if(!mediator) {
				throw ({ 'code': 403, 'message': 'Mediator ' + modelData.name + ' not found' });
				return;
			}

			return mediator.updateAsync(modelData);
		})
		.then(function(result) {
			callback(null, result);
		})
		.catch(function(err) {
			self.$facade.$dependencies.logger.error('Error updating Mediator for ' + self.$facade.name + ': ' + modelData.name + '\nError: ', err);
			callback(err);
		});
	}
});

exports.twyrMVCView = mvcView;
