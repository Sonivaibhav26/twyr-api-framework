/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-controller.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC Controller implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var NodeCache = require('node-cache'),
	prime = require('prime'),
	promises = require('bluebird');

var mvcController = prime({
	'constructor': function(facade) {
		console.log('Setting up the MVC-Controller for: ' + facade.name);

		Object.defineProperty(this, '$facade', {
			'__proto__': null,
			'value': facade
		});

		Object.defineProperty(this, '$commandMap', {
			'__proto__': null,
			'value': promises.promisifyAll(new NodeCache({ 'stdTTL': 0, 'checkperiod': 0, 'useClones': false }))
		});
	},

	'addCommand': function(Command, callback) {
		var self = this,
			command = promises.promisifyAll(new Command(self));

		self.$commandMap.getAsync(command.name)
		.then(function(exists) {
			if(!!exists) {
				throw ({ 'code': 403, 'message': 'Duplicate command: ' + command.name });
				return;
			}

			return self.$commandMap.setAsync(command.name, command);
		})
		.then(function(success) {
			if(!success) {
				throw ({ 'code': 403, 'message': 'Could not add command: ' + command.name });
				return;
			}

			callback(null, success);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'delCommand': function(commandName, callback) {
		var self = this;

		self.$commandMap.delAsync(commandName)
		.then(function() {
			callback(null, true);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'hasCommand': function(commandName, callback) {
		var self = this;

		self.$commandMap.getAsync(commandName)
		.then(function(exists) {
			callback(null, !!exists);
		})
		.catch(function(err) {
			callback(err);
		});
	},

	'execCommand': function(commandData, callback) {
		var self = this;
		self.$commandMap.getAsync(commandData.name)
		.then(function(CommandType) {
			if(!CommandType) {
				throw ({ 'code': 403, 'message': 'Command ' + commandData.name + ' not found' });
				return;
			}

			var command = promises.promisifyAll(new CommandType(self));
			return command.executeAsync(commandData);
		})
		.then(function(result) {
			callback(null, result);
		})
		.catch(function(err) {
			callback(err);
		});
	}
});

exports.twyrMVCController = mvcController;
