/// <reference path="../../../../typings/node/node.d.ts"/>
/*
 * Name			: api_modules/services/auth-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../service-base').baseService,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var filesystem = require('fs'),
	path = require('path');

var authService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, './config.js'));
	},

	'load': function(module, loader, callback) {
		var self = this;
		authService.parent.load.call(self, module, loader, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$passport'] = promises.promisifyAll(require('passport'));
			callback(null, status);
		});
	},

	'start': function(dependencies, callback) {
		var self = this;
		authService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var authStrategyPath = path.resolve(path.join(__dirname, self.$config.strategies.path)),
				availableStrategies = filesystem.readdirSync(authStrategyPath);

			for(var idx in availableStrategies) {
				var thisStrategyFile = path.join(authStrategyPath, availableStrategies[idx]),
					thisStrategy = require(thisStrategyFile).strategy;
	
				if(thisStrategy) {
					(thisStrategy.bind(self))();
				}
			}

			callback(null, status);
		});
	},

	'getInterface': function() {
		return this.$passport;
	},

	'unload': function(callback) {
		var self = this;
		authService.parent.unload.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			delete self['$passport'];
			callback(null, status);
		});
	},

	'name': 'authService',
	'dependencies': ['logger', 'cacheService', 'databaseService', 'eventService']
});


exports.service = authService;

