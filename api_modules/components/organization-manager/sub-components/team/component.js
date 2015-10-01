/*
 * Name			: portal_modules/components/organization-manager/sub-components/team/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r Portal Organization Manager Team Sub-component
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../../../component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var filesystem = promises.promisifyAll(require('fs')),
	path = require('path'),
	uuid = require('node-uuid');

/**
 * Magic Numbers
 */
var requiredPermission = '00000000-0000-0000-0000-000000000000';

var organizationManagerTeamComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;

		organizationManagerTeamComponent.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var database = self.$dependencies.databaseService;


			Object.defineProperty(self, '$TenantModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenants',
					'idAttribute': 'id',

					'users': function() {
						return this.hasMany(self.$UserTenantModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$UserTenantModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'users_tenants',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'user': function() {
						return this.belongsTo(self.$UserModel, 'user_id');
					}
				})
			});

			Object.defineProperty(self, '$UserModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'users',
					'idAttribute': 'id',

					'tenants': function() {
						return this.hasMany(self.$UserTenantModel, 'user_id');
					}
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organization-manager-teams', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.query.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantModel()
				.where('tenant_id', '=', request.query.tenant)
				.fetchAll();
			})
			.then(function(tenantUsers) {
				tenantUsers = self._camelize(tenantUsers.toJSON());

				var responseData = { 'data': [] };
				for(var idx in tenantUsers) {
					var thisTenantUser = tenantUsers[idx];
					responseData.data.push({
						'id': thisTenantUser.id,
						'type': 'organization-manager-team',

						'relationships': {
							'tenant': {
								'data': {
									'id': thisTenantUser.tenantId,
									'type': 'organization-manager'
								}
							},

							'user': {
								'data': {
									'id': thisTenantUser.userId,
									'type': 'organization-manager-user'
								}
							}
						}
					});
				}

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': [{
						'source': { 'pointer': 'data/attributes/id' },
						'detail': err.detail || err.message
					}]
				});
			});
		});

		this.$router.post('/organization-manager-teams', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.data.relationships.tenant.data.id)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantModel()
				.save({
					'id': request.body.data.id,
					'tenant_id': request.body.data.relationships.tenant.data.id,
					'user_id': request.body.data.relationships.user.data.id,
					'created_on': request.body.data.attributes['created-on']
				}, {
					'method': 'insert'
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': request.body.data.type
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': [{
						'source': { 'pointer': 'data/attributes/id' },
						'detail': err.detail || err.message
					}]
				});
			});
		});

		this.$router.delete('/organization-manager-teams/:userTenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserTenantModel({ 'id': request.params.userTenantId })
			.fetch()
			.then(function(userTenantRecord) {
				return self._checkPermissionAsync(request, requiredPermission, userTenantRecord.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantModel({ 'id': request.params.userTenantId }).destroy();
			})
			.then(function() {
				response.status(204).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': [{
						'source': { 'pointer': 'data/attributes/id' },
						'detail': err.detail || err.message
					}]
				});
			});
		});
	},

	'name': 'organization-manager-team',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerTeamComponent;
