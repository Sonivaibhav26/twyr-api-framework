/*
 * Name			: api_modules/components/component-base.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: Base Component for the Twy'r API Server Framework
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var Events = require('eventemitter3'),
	inflection = require('inflection'),
	path = require('path');

var simpleComponent = prime({
	'constructor': function() {
		console.log('Constructor of the ' + this.name + ' Component');
	},

	'load': function(module, loader, callback) {
		console.log('Loading the ' + this.name + ' Component');
		var self = this;

		self['$module'] = module;
		self['$loader'] = loader;

		self.$loader.loadAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Component Load Error: ', err);
			if(callback) callback(err);
		});
	},

	'initialize': function(callback) {
		console.log('Initializing the ' + this.name + ' Component');

		if(callback) {
			callback(null, true);
		}
	},
	
	'start': function(dependencies, callback) {
		console.log('Starting the ' + this.name + ' Component with dependencies:\n', dependencies);
		var self = this;

		self['$dependencies'] = dependencies;

		self._setupRouter();
		self._addRoutes();

		self.$loader.startAsync()
		.then(function(status) {
			if(!status) throw status;

			for(var idx in self.$components) {
				var thisComponent = self.$components[idx],
					router = thisComponent.getRouter(),
					mountPath = self.$config ? (self.$config.componentMountPath || '') : '';

				self.$router.use(path.join(mountPath, thisComponent.name), router);
			}

			return status;
		})
		.then(function(status) {
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Component Start Error: ', err);
			if(callback) callback(err);
		});
	},

	'getRouter': function() {
		console.log('Returning the ' + this.name + ' Component Router');
		return this.$router;
	},

	'stop': function(callback) {
		console.log('Stopping the ' + this.name + ' Component');
		var self = this;

		self.$loader.stopAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Component Stop Error: ', err);
			if(callback) callback(err);
		})
		.finally(function() {
			delete self['$dependencies'];
			delete self['$router'];
		});
	},

	'uninitialize': function(callback) {
		console.log('Uninitializing the ' + this.name + ' Component');

		if(callback) {
			callback(null, true);
		}
	},

	'unload': function(callback) {
		console.log('Unloading the ' + this.name + ' Component');
		var self = this;

		self.$loader.unloadAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Service Unload Error: ', err);
			if(callback) callback(err);
		})
		.finally(function() {
			delete self['$loader'];
			delete self['$module'];
		});
	},

	'_loadConfig': function(configFilePath) {
		// Load / Store the configuration...
		var env = (process.env.NODE_ENV || 'development').toLowerCase(),
			config = require(configFilePath || './config.js')[env];

		this['$config'] = config;
	},

	'_setupRouter': function() {
		var router = require('express').Router(),
			logger = require('morgan'),
			loggerSrvc = this.$dependencies['logger'];
	
		var loggerStream = {
			'write': function(message, encoding) {
				loggerSrvc.silly(message);
			}
		};
	
		router.use(logger('combined', {
			'stream': loggerStream
		}));
		
		this['$router'] = router;
	},

	'_addRoutes': function() {
		return;
	},

	'_checkPermission': function(request, permission) {
		if(!request.user)
			return false;

		if(request.user.permissions.indexOf(permission) < 0)
			return false;

		return true;
	},

	'_camelize': function(inputObject) {
		var camelizedObject = {},
			self = this;

		if(!inputObject) return inputObject;
		
		Object.keys(inputObject)
		.forEach(function(key) {
			if(!inputObject[key]) {
				camelizedObject[inflection.camelize(key, true)] = inputObject[key];
				return;
			}

			if(typeof inputObject[key] == 'object') {
				if(!Object.keys(inputObject[key]).length) {
					camelizedObject[inflection.camelize(key, true)] = inputObject[key];
					return;
				}

				var subObject = self._camelize(inputObject[key]);
				if(!Object.keys(subObject).length) {
					camelizedObject[inflection.camelize(key, true)] = inputObject[key];
				}
				else {
					camelizedObject[inflection.camelize(key, true)] = subObject;
				}

				return;
			}

			camelizedObject[inflection.camelize(key, true)] = inputObject[key];
		});

		return camelizedObject;
	},

	'name': 'simpleComponent',
	'dependencies': ['logger']
});

exports.baseComponent = simpleComponent;

