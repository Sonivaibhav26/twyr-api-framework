/*
 * Name			: api_modules/components/component-base.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: Base MVC Component for the Twy'r API Server Framework
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var Events = require('eventemitter3'),
	path = require('path');

var TwyrMVCModel = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-model')).twyrMVCModel,
	TwyrMVCView = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-view')).twyrMVCView,
	TwyrMVCCtrl = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-controller')).twyrMVCController;

var mvcComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;
		mvcComponent.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			Object.defineProperty(self, '$notifier', {
				'__proto__': null,
				'configurable': true,
				'value': new Events()
			});

			Object.defineProperty(self, '$model', {
				'__proto__': null,
				'configurable': true,
				'value': promises.promisifyAll(new TwyrMVCModel(self))
			});

			Object.defineProperty(self, '$view', {
				'__proto__': null,
				'configurable': true,
				'value': promises.promisifyAll(new TwyrMVCView(self))
			});

			Object.defineProperty(self, '$controller', {
				'__proto__': null,
				'configurable': true,
				'value': promises.promisifyAll(new TwyrMVCCtrl(self))
			});

			callback(null, status);
		});
	},

	'stop': function(callback) {
		var self = this;

		delete self.$controller;
		delete self.$view;
		delete self.$model;

		mvcComponent.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			callback(null, status);
		});
	},

	'name': 'mvcComponent',
	'dependencies': ['logger']
});

exports.baseComponent = mvcComponent;

