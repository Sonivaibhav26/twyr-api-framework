/*
 * Name			: api_modules/components/dummy/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Dummy Component
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./mvc-component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

var dummyComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'name': 'dummy',
	'dependencies': ['logger']
});

exports.component = dummyComponent;
