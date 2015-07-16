/*
 * Name			: api_modules/services/database-service/service.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Database Service
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var base = require('./../service-base').baseService,
	bookshelf = require('bookshelf'),
	knex = require('knex'),
	path = require('path'),
	prime = require('prime');

var databaseService = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},
	
	'start': function(dependencies, callback) {
		var self = this;
		databaseService.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			self['$database'] = bookshelf(knex(self.$config));
			self.$database.knex.client.on('notice', self._databaseNotice.bind(self));
			self.$database.knex.client.on('error', self._databaseError.bind(self));

			callback(null, status);
		});
	},

	'getInterface': function() {
		return this.$database;
	},

	'stop': function(callback) {
		var self = this;
		databaseService.parent.stop.call(self, function(err, status) {
			if(err) {
				callback(err);
				return;
			}
		
			self.$database.knex.destroy()
			.then(function() {
				if(callback) callback(null, status);
			})
			.catch(function(err) {
				if(callback) callback(err);
			})
			.finally(function() {
				delete self['$database'];
			});
		});
	},

	'_databaseNotice': function(msg) {
		this.$dependencies['logger'].info('Database Notice: ', msg);
	},

	'_databaseError': function(err) {
		this.$dependencies['logger'].error('Database Error:\n', err);
	},

	'name': 'databaseService',
	'dependencies': ['logger']
});

exports.service = databaseService;

