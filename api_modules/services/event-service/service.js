/*
 * Name			: api_modules/services/event-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Event Emitter Service
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var base = require('./../service-base').baseService,
	path = require('path'),
	prime = require('prime'),
	promises = require('bluebird'),
	Events = require('eventemitter3');

var eventService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;
		eventService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$emitter'] = new Events();
			callback(null, status);
		});
	},

	'getInterface': function() {
		return this.$emitter;
	},

	'stop': function(callback) {
		var self = this;
		eventService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			delete self['$emitter'];
			callback(null, status);
		});
	},

	'name': 'eventService',
	'dependencies': ['logger']
});

exports.service = eventService;

