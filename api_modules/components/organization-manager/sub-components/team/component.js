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

					'groups': function() {
						return this.hasMany(self.$GroupModel, 'tenant_id');
					},

					'users': function() {
						return this.hasMany(self.$UserTenantModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$GroupModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'groups',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'parent': function() {
						return this.belongsTo(self.$GroupModel, 'parent_id');
					},

					'subgroups': function() {
						return this.hasMany(self.$GroupModel, 'parent_id');
					},

					'users': function() {
						return this.hasMany(self.$UserGroupModel, 'group_id');
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
					},

					'groups': function() {
						return this.hasMany(self.$UserGroupModel, 'user_id');
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

			Object.defineProperty(self, '$UserGroupModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'users_groups',
					'idAttribute': 'id',

					'group': function() {
						return this.belongsTo(self.$GroupModel, 'group_id');
					},

					'user': function() {
						return this.belongsTo(self.$UserModel, 'user_id');
					}
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organization-manager-team-unused-groups-tree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.query.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel()
				.query(function(qb) {
					qb.where('tenant_id', '=', request.query.tenant);
					if(request.query.group == '#')
						qb.whereNull('parent_id');
					else
						qb.andWhere('parent_id', '=', request.query.group);

					qb.andWhereRaw('id NOT IN (SELECT group_id FROM users_groups WHERE user_id = \'' + request.query.user + '\')');
				})
				.fetchAll({ 'withRelated': ['subgroups'] });
			})
			.then(function(tenantGroups) {
				tenantGroups = self._camelize(tenantGroups.toJSON());

				var responseData = [];
				for(var idx in tenantGroups) {
					var responseGroup = {};
					responseGroup.id = tenantGroups[idx].id;
					responseGroup.text = tenantGroups[idx].displayName;
					responseGroup.children = !!(tenantGroups[idx].subgroups[0]);

					responseData.push(responseGroup);
				}

				response.status(200).json(responseData);
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organization-manager-team-used-groups-tree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.query.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel()
				.query(function(qb) {
					qb.where('tenant_id', '=', request.query.tenant);
					if(request.query.group == '#')
						qb.andWhereRaw('id IN (SELECT group_id FROM users_groups WHERE user_id = \'' + request.query.user + '\')');
					else
						qb.andWhere('parent_id', '=', request.query.group);
				})
				.fetchAll({ 'withRelated': ['subgroups'] });
			})
			.then(function(tenantGroups) {
				tenantGroups = self._camelize(tenantGroups.toJSON());

				var responseData = [];
				for(var idx in tenantGroups) {
					var responseGroup = {};
					responseGroup.id = tenantGroups[idx].id;
					responseGroup.text = tenantGroups[idx].displayName;
					responseGroup.children = !!(tenantGroups[idx].subgroups[0]);

					responseData.push(responseGroup);
				}

				response.status(200).json(responseData);
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

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

						'attributes': {
							'created-on': thisTenantUser.createdOn
						},

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
				return null;
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

				return null;
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
				return null;
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

		this.$router.post('/organization-manager-team-add-user-group', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserGroupModel()
				.save({
					'user_id': request.body.user,
					'group_id': request.body.group
				}, {
					'method': 'insert'
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({ 'id': savedRecord.get('id') });
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.post('/organization-manager-team-delete-user-group', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
				}

				return new self.$UserGroupModel()
				.query(function(qb) {
					qb.where('user_id', '=', request.body.user);
					qb.andWhere('group_id', '=', request.body.group);
				})
				.fetch();
			})
			.then(function(existingUserGroup) {
				if(!existingUserGroup) return;
				return existingUserGroup.destroy();
			})
			.then(function() {
				response.status(200).json({});
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});
	},

	'name': 'organization-manager-team',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerTeamComponent;
