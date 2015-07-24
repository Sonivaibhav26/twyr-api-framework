/*
 * Name			: api_modules/mvc_pattern/twyr-mvc-mediator.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MVC Mediator implementation, based heavily on the PureMVC implementation (https://github.com/PureMVC)
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r MVC artifacts
 */
var prime = require('prime'),
	promises = require('bluebird');

var mvcMediator = prime({
	'constructor': function(view) {
		console.log('Setting up the MVC-Mediator for: ' + view.$facade.name);

		Object.defineProperty(this, '$view', {
			'__proto__': null,
			'configurable': true,
			'value': view
		});

		Object.defineProperty(this, '$logger', {
			'__proto__': null,
			'value': view.$facade.$dependencies.logger
		});
	},

	'update': function(modelData, callback) {
		callback(null, modelData);
	},

	'name': 'twyrMVCMediator'
});

exports.twyrMVCMediator = mvcMediator;
