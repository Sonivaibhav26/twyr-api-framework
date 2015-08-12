/*
 * Name			: api_modules/components/masterdata/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MasterData Component
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

var masterdataComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/genders', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			self.$dependencies.databaseService.knex.raw('SELECT unnest(enum_range(NULL::gender)) AS genders;')
			.then(function(genders) {
				var responseData = [];
				for(var idx in genders.rows) {
					responseData.push(genders.rows[idx]['genders']);
				}

				self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nResponse: ', responseData);
				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({ 'code': 422, 'message': err.message || err.detail || 'Error fetching genders from the database' });
			});
		});

		this.$router.get('/partners', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			if(!request.user) {
				response.status(200).send('');
				return;
			}

			self.$dependencies.databaseService.knex.raw('SELECT * FROM tenants WHERE name ILIKE \'%' + request.query.filter + '%\' AND id <> \'' + request.user.currentTenant.id + '\';')
			.then(function(partners) {
				var responseData = [];
				for(var idx in partners.rows) {
					responseData.push({
						'id': partners.rows[idx].id,
						'name': partners.rows[idx].name
					});
				}

				self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nResponse: ', responseData);
				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({ 'code': 422, 'message': err.message || err.detail || 'Error fetching genders from the database' });
			});
		});

		this.$router.get('/emails', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			if(!request.user) {
				response.status(200).send('');
				return;
			}

//			self.$dependencies.databaseService.knex.raw('SELECT * FROM users WHERE email ILIKE \'%' + request.query.filter + '%\' AND id <> \'' + request.user.id + '\';')
			self.$dependencies.databaseService.knex.raw('SELECT * FROM users WHERE email ILIKE \'%' + request.query.filter + '%\' AND is_searchable = true;')
			.then(function(users) {
				var responseData = [];
				for(var idx in users.rows) {
					responseData.push({
						'id': users.rows[idx].id,
						'name': users.rows[idx].first_name + ' ' + users.rows[idx].last_name,
						'email': users.rows[idx].email
					});
				}

				self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nResponse: ', responseData);
				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({ 'code': 422, 'message': err.message || err.detail || 'Error fetching genders from the database' });
			});
		});
	},

	'name': 'masterdata',
	'dependencies': ['logger', 'databaseService']
});

exports.component = masterdataComponent;
