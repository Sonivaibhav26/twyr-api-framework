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
 * Module dependencies.
 */
var base = require('./component-base').baseComponent,
	Events = require('eventemitter3'),
	path = require('path'),
	prime = require('prime'),
	promises = require('bluebird');

var TwyrMVCModel = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-model')).twyrMVCModel,
	TwyrMVCView = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-view')).twyrMVCView,
	TwyrMVCCtrl = require(path.join(path.dirname(require.main.filename), 'mvc_pattern/twyr-mvc-controller')).twyrMVCController;

var mvcComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);

		Object.defineProperty(this, '$notifier', {
			'__proto__': null,
			'configurable': true,
			'value': new Events()
		});
	},

	'initialize': function(callback) {
		var self = this;
		mvcComponent.parent.initialize.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

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

			callback(null, true);
		});
	},

	'uninitialize': function(callback) {
		var self = this;

		delete self.$controller;
		delete self.$view;
		delete self.$model;

		mvcComponent.parent.uninitialize.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			callback(null, true);
		});
	},

	'name': 'mvcComponent',
	'dependencies': ['logger']
});

exports.baseComponent = mvcComponent;

