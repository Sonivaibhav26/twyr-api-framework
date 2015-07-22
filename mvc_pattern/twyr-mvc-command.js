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
				callback(null, results);
			})
			.catch(function(err) {
				callback(err);
			})
		}
	},

	'_executeSimple': function(data, callback) {
		this.$controller.$facade.$notifier.emit((data.notificationName || data.name || ''), data);
		callback(null, !!data);
	},

	'name': 'twyrMVCCommand'
});

exports.twyrMVCCommand = mvcCommand;
