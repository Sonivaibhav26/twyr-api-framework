/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-proxy.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC Proxy implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var prime = require('prime'),
	promises = require('bluebird');

var mvcProxy = prime({
	'constructor': function(model) {
		console.log('Setting up the MVC-Proxy for: ' + model.$facade.name);

		Object.defineProperty(this, '$model', {
			'__proto__': null,
			'configurable': true,
			'value': model
		});

		Object.defineProperty(this, '$logger', {
			'__proto__': null,
			'value': model.$facade.$dependencies.logger
		});
	},

	// TO BE OVERRIDDEN BY ACTUAL PROXY IMPLEMENTATION
	'get': function(inputData, callback) {
		callback(null, inputData);
	},

	'name': 'twyrMVCProxy'
});

exports.twyrMVCProxy = mvcProxy;
