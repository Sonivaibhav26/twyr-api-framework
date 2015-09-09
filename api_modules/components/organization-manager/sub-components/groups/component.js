/*
 * Name			: portal_modules/components/organization-manager/sub-components/suborganizations/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r Portal Organization Manager Suborganization Sub-component
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

var organizationManagerGroupsComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;

		organizationManagerGroupsComponent.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var database = self.$dependencies.databaseService;

			Object.defineProperty(self, '$GroupModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'groups',
					'idAttribute': 'id',

					'parent': function() {
						return this.belongsTo(self.$GroupModel, 'parent_id');
					},

					'tenant': function() {
						return this.belongsTo(self.$GroupTenantModel, 'tenant_id');
					},

					'subgroups': function() {
						return this.hasMany(self.$GroupModel, 'parent_id');
					},

					'permissions': function() {
						return this.hasMany(self.$GroupComponentPermissionModel, 'group_id');
					},

					'users': function() {
						return this.hasMany(self.$GroupUserModel, 'group_id');
					}
				})
			});

			Object.defineProperty(self, '$GroupTenantModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenants',
					'idAttribute': 'id',

					'groups': function() {
						return this.hasMany(self.$GroupModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$GroupComponentPermissionModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'group_component_permissions',
					'idAttribute': 'id',

					'group': function() {
						return this.belongsTo(self.$GroupModel, 'group_id');
					},

					'permission': function() {
						return this.belongsTo(self.$ComponentPermissionModel, 'component_permission_id');
					}
				})
			});

			Object.defineProperty(self, '$ComponentPermissionModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'component_permissions',
					'idAttribute': 'id',

					'component': function() {
						return this.belongsTo(self.$ComponentModel, 'component_id');
					}
				})
			});

			Object.defineProperty(self, '$ComponentModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'components',
					'idAttribute': 'id'
				})
			});

			Object.defineProperty(self, '$GroupUserModel', {
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

			Object.defineProperty(self, '$UserModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'users',
					'idAttribute': 'id'
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organizationGroupsTree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel()
			.query(function(qb) {
				if(request.query.group == '#')
					qb.where('tenant_id', '=', request.query.tenant);
				else
					qb
					.where('tenant_id', '=', request.query.tenant)
					.andWhere('parent_id', '=', request.query.group);
			})
			.fetchAll({ 'withRelated': ['subgroups'] })
			.then(function(tenantGroups) {
				tenantGroups = self._camelize(tenantGroups.toJSON());
				self.$dependencies.logger.debug('Tenant Groups: ', JSON.stringify(tenantGroups));

				var responseData = [];

				if(request.query.group == '#') {
					for(var idx in tenantGroups) {
						if(tenantGroups[idx].parentId)
							continue;

						var responseGroup = {};
						responseGroup.id = tenantGroups[idx].id;
						responseGroup.text = tenantGroups[idx].displayName;
						responseGroup.children = !!(tenantGroups[idx].subgroups[0]);

						responseData.push(responseGroup);
					}
				}
				else {
					for(var idx in tenantGroups) {
						var responseGroup = {};
						responseGroup.id = tenantGroups[idx].id;
						responseGroup.text = tenantGroups[idx].displayName;
						responseGroup.children = !!(tenantGroups[idx].subgroups[0]);

						responseData.push(responseGroup);
					}
				}

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organizationManagerGroups', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel()
			.where('tenant_id', '=', request.query.tenant)
			.fetchAll({ 'withRelated': ['parent', 'subgroups', 'permissions', 'users'] })
			.then(function(tenantGroups) {
				tenantGroups = self._camelize(tenantGroups.toJSON());

				var responseData = {
					'organizationManagerGroup':[]	
				};

				for(var idx in tenantGroups) {
					var thisTenantGroup = tenantGroups[idx],
						groupResponse = {
							'id': thisTenantGroup.id,
							'name': thisTenantGroup.displayName,
							'tenant': thisTenantGroup.tenantId,
							'parent': thisTenantGroup.parentId,
							'createdOn': thisTenantGroup.createdOn,

							'subgroups': [],
							'permissions': [],
							'users': []
						};

					for(var sgdx in thisTenantGroup.subgroups) {
						groupResponse.subgroups.push(thisTenantGroup.subgroups[sgdx].id);
					}

					for(var pdx in thisTenantGroup.permissions) {
						groupResponse.permissions.push(thisTenantGroup.permissions[pdx].id);
					}

					for(var udx in thisTenantGroup.users) {
						groupResponse.users.push(thisTenantGroup.users[udx].id);
					}

					responseData.organizationManagerGroup.push(groupResponse);
				}

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.post('/organizationManagerGroups', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel()
			.save({
				'id': request.body.organizationManagerGroup.id,
				'display_name': request.body.organizationManagerGroup.name,
				'tenant_id': request.body.organizationManagerGroup.tenant,
				'parent_id': request.body.organizationManagerGroup.parent,
				'created_on': request.body.organizationManagerGroup.createdOn,
			}, {
				'method': 'insert'
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerGroup': {
						'id': savedRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.get('/organizationManagerGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch({ 'withRelated': ['parent', 'subgroups', 'permissions', 'users'] })
			.then(function(tenantGroup) {
				tenantGroup = self._camelize(tenantGroup.toJSON());

				var groupResponse = {
					'id': tenantGroup.id,
					'name': tenantGroup.displayName,
					'tenant': tenantGroup.tenantId,
					'parent': tenantGroup.parentId,
					'createdOn': tenantGroup.createdOn,

					'subgroups': [],
					'permissions': [],
					'users': []
				};

				for(var sgdx in tenantGroup.subgroups) {
					groupResponse.subgroups.push(tenantGroup.subgroups[sgdx].id);
				}

				for(var pdx in tenantGroup.permissions) {
					groupResponse.permissions.push(tenantGroup.permissions[pdx].id);
				}

				for(var udx in tenantGroup.users) {
					groupResponse.users.push(tenantGroup.users[udx].id);
				}

				response.status(200).json({
					'organizationManagerGroup': groupResponse
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.put('/organizationManagerGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.save({
				'display_name': request.body.organizationManagerGroup.name
			}, {
				'method': 'update',
				'patch': true
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerGroup': {
						'id': savedRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.delete('/organizationManagerGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.destroy()
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.post('/organizationManagerGroupPermissions', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupComponentPermissionModel()
			.save({
				'id': request.body.organizationManagerGroupPermission.id,
				'group_id': request.body.organizationManagerGroupPermission.group,
				'component_permission_id': request.body.organizationManagerGroupPermission.permission,
				'created_on': request.body.organizationManagerGroupPermission.createdOn
			}, {
				'method': 'insert'
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerGroupPermission': {
						'id': savedRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.get('/organizationManagerGroupPermissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.fetch()
			.then(function(groupPermission) {
				var responseData = {
					'id': groupPermission.get('id'),
					'group': groupPermission.get('group_id'),
					'permission': groupPermission.get('component_permission_id'),
					'createdOn': groupPermission.get('created_on')
				};

				response.status(200).json({
					'organizationManagerGroupPermission': responseData
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.delete('/organizationManagerGroupPermissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.destroy()
			.then(function(groupPermission) {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.get('/organizationManagerComponentPermissions/:componentPermissionId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$ComponentPermissionModel({ 'id': request.params.componentPermissionId })
			.fetch({ 'withRelated': ['component'] })
			.then(function(componentPermission) {
				componentPermission = self._camelize(componentPermission.toJSON());

				var responseData = {
					'id': request.params.componentPermissionId,
					'componentName': componentPermission.component.displayName,
					'displayName': componentPermission.displayName,
					'description': componentPermission.description
				};

				response.status(200).json({
					'organizationManagerComponentPermission': responseData
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.post('/organizationManagerGroupUsers', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupUserModel()
			.save({
				'id': request.body.organizationManagerGroupUser.id,
				'user_id': request.body.organizationManagerGroupUser.user,
				'group_id': request.body.organizationManagerGroupUser.group,
				'created_on': request.body.organizationManagerGroupUser.createdOn
			}, {
				'method': 'insert'
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerGroupUser': savedRecord.get('id')
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.get('/organizationManagerGroupUsers/:groupUserId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupUserModel({ 'id': request.params.groupUserId })
			.fetch()
			.then(function(groupUser) {
				groupUser = self._camelize(groupUser.toJSON());
				response.status(200).json({
					'organizationManagerGroupUser': {
						'id': groupUser.id,

						'group': groupUser.groupId,
						'user': groupUser.userId,

						'createdOn': groupUser.createdOn
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});

		this.$router.delete('/organizationManagerGroupUsers/:groupUserId', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupUserModel({ 'id': request.params.groupUserId })
			.destroy()
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});
	},

	'name': 'organization-manager-groups',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerGroupsComponent;
