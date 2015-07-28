/*
 * Name			: api_modules/services/api-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server API Registry Service
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../service-base').baseService,
	prime = require('prime'),
	promises = require('bluebird');

var apiService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;
		apiService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var logger = self.$dependencies['logger'];
			self['$seneca'] = require('seneca')({
				'log': {
					'map': [{
						'level': 'all',
						'type': 'init,status,plugin,error',
						'handler': function(date, instanceId, loglevel, type, module, what, action, actionId, command) {
							var logString = 'Seneca: ' + type + '/' + module + '/' + action;
							
							if(command) logString += ': ' + command;
							if(what) logString += ': ' + what;
	
							logger.log(loglevel, logString);
						}
					}]
				}
			});
	
			self.$seneca.ready(self._setAPIAggregator.bind(self, callback, status));
		});
	},

	'getInterface': function() {
		return this.$seneca;
	},

	'stop': function(callback) {
		var self = this;
		delete self['$seneca'];

		apiService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			callback(null, status);
		});
	},

	'_setAPIAggregator': function(callback, status, err) {
		callback(err, status);
	},

	'name': 'apiService',
	'dependencies': ['logger']
});


exports.service = apiService;
