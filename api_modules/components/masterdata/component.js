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

			self.$dependencies.databaseService.knex.raw('SELECT * FROM users WHERE email ILIKE \'%' + request.query.filter + '%\' AND id <> \'' + request.user.id + '\' AND is_searchable = true;')
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

		this.$router.get('/groupPermissions', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			if(!request.user) {
				response.status(200).send('');
				return;
			}

			self.$dependencies.databaseService.knex.raw('SELECT B.id, A.display_name AS component, B.display_name AS permission FROM components A INNER JOIN component_permissions B ON (B.component_id = A.id) WHERE B.id IN (SELECT component_permission_id FROM group_component_permissions WHERE group_id = \'' + request.query.parentId + '\') AND B.id NOT IN (SELECT component_permission_id FROM group_component_permissions WHERE group_id = \'' + request.query.groupId + '\');')
			.then(function(remainingPermissions) {
				var responseData = [];
				for(var idx in remainingPermissions.rows) {
					responseData.push({
						'id': remainingPermissions.rows[idx].id,
						'name': remainingPermissions.rows[idx].component + ': ' + remainingPermissions.rows[idx].permission
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

		this.$router.get('/userGroups', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			if(!request.user) {
				response.status(200).send('');
				return;
			}

			self.$dependencies.databaseService.knex.raw('SELECT id FROM groups WHERE tenant_id = \'' + request.query.tenantId + '\' AND id IN (SELECT group_id FROM users_groups WHERE user_id = \'' + request.query.userId + '\');')
			.then(function(userGroups) {
				var promiseResolutions = [];

				for(var idx in userGroups.rows) {
					promiseResolutions.push(self.$dependencies.databaseService.knex.raw('SELECT id FROM fn_get_group_tree(\'' + userGroups.rows[idx].id + '\');'));
				}

				return promises.all(promiseResolutions);
			})
			.then(function(allUserGroups) {
				var consolidatedUserGroups = [];
				for(var idx in allUserGroups) {
					var thisUserGroups = allUserGroups[idx].rows;
					for(var jdx in thisUserGroups) {
						if(consolidatedUserGroups.indexOf(thisUserGroups[jdx].id) < 0)
							consolidatedUserGroups.push(thisUserGroups[jdx].id);
					}
				}

				return self.$dependencies.databaseService.knex.raw('SELECT id, display_name FROM groups WHERE tenant_id = \'' + request.query.tenantId + '\' AND id NOT IN (\'' + consolidatedUserGroups.join('\',\'') + '\');');
			})
			.then(function(remainingUserGroups) {
				response.status(200).json(remainingUserGroups.rows);
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
