/*
 * Name			: api_modules/services/service-base.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: Base Service for the Twy'r API Server Framwork
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var prime = require('prime'),
	promises = require('bluebird');

var baseService = prime({
	'constructor': function() {
		console.log('Constructor of the ' + this.name + ' Service');
	},

	'load': function(module, loader, callback) {
		console.log('Loading the ' + this.name + ' Service');
		var self = this;

		self['$module'] = module;
		self['$loader'] = loader;

		self.$loader.loadAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Service Load Error: ', err);
			if(callback) callback(err);
		});
	},

	'initialize': function(callback) {
		console.log('Initializing the ' + this.name + ' Service');

		if(callback) {
			callback(null, true);
		}
	},
	
	'start': function(dependencies, callback) {
		console.log('Starting the ' + this.name + ' Service');
		var self = this;

		self['$dependencies'] = dependencies;
		self.$loader.startAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Service Start Error: ', err);
			if(callback) callback(err);
		});
	},

	'getInterface': function() {
		return promises.promisifyAll(this);
	},

	'stop': function(callback) {
		console.log('Stopping the ' + this.name + ' Service');
		var self = this;

		self.$loader.stopAsync()
		.then(function(status) {
			if(!status) throw status;
			if(callback) callback(null, status);
		})
		.catch(function(err) {
			console.error(self.name + ' Service Stop Error: ', err);
			if(callback) callback(err);
		})
		.finally(function() {
			delete self['$dependencies'];
		});
	},

	'uninitialize': function(callback) {
		console.log('Uninitializing the ' + this.name + ' Service');

		if(callback) {
			callback(null, true);
		}
	},

	'unload': function(callback) {
		console.log('Unloading the ' + this.name + ' Service');
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

	'name': 'baseService',
	'dependencies': []
});

exports.baseService = baseService;
