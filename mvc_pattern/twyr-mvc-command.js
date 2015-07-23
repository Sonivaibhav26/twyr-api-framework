/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-command.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC Command implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var prime = require('prime'),
	promises = require('bluebird');

var mvcCommand = prime({
	'constructor': function(controller) {
		console.log('Setting up the MVC-Command for: ' + controller.$facade.name);

		Object.defineProperty(this, '$controller', {
			'__proto__': null,
			'configurable': true,
			'value': controller
		});

		Object.defineProperty(this, '$commandMap', {
			'__proto__': null,
			'value': []
		});

		Object.defineProperty(this, '$logger', {
			'__proto__': null,
			'value': controller.$facade.$dependencies.logger
		});
	},

	'addSubCommand': function(commandType, callback) {
		try {
			this.$commandMap.push(commandType);
			callback(null, true);
		}
		catch(err) {
			callback(err);
		}
	},

	'delSubCommand': function(commandType, callback) {
		try {
			var commandTypeIndex = this.$commandMap.indexOf(commandType);
			if(commandTypeIndex >= 0) this.$commandMap.splice(commandTypeIndex, 1);

			callback(null, true);
		}
		catch(err) {
			callback(err);
		}
	},

	'execute': function(data, callback) {
		if(!this.$commandMap.length) {
			this._executeSimple(data, callback);
		}
		else {
			var promiseResolutions = [];

			for(var idx in this.$commandMap) {
				var SubCommandType = this.$commandMap[idx],
					command = promises.promisifyAll(new SubCommandType(self.$controller));

				promiseResolutions.push(command.executeAsync(data));
			}

			promises.all(promiseResolutions)
			.then(function(results) {
				self._mergeResults(results, callback);
			})
			.catch(function(err) {
				callback(err);
			})
		}
	},

	// TO BE OVERRIDDEN BY ACTUAL COMMAND IMPLEMENTATION
	// IF SUB-COMMANDS ARE ABSENT
	'_executeSimple': function(data, callback) {
		callback(null, data);
	},

	// TO BE OVERRIDDEN BY ACTUAL COMMAND IMPLEMENTATION
	// IF SUB-COMMANDS ARE PRESENT
	'_mergeResults': function(subCommandResults, callback) {
		callback(null, subCommandResults);
	},

	'name': 'twyrMVCCommand'
});

exports.twyrMVCCommand = mvcCommand;
