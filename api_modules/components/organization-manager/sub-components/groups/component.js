/*
 * Name			: portal_modules/components/organization-manager/sub-components/groups/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r Portal Organization Manager Groups Sub-component
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

		this.$router.get('/organization-manager-groups-tree', function(request, response, next) {
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
					if(request.query.group == '#')
						qb.where('tenant_id', '=', request.query.tenant);
					else
						qb
						.where('tenant_id', '=', request.query.tenant)
						.andWhere('parent_id', '=', request.query.group);
				})
				.fetchAll({ 'withRelated': ['subgroups'] });
			})
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
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organization-manager-groups', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.query.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel()
					.where('tenant_id', '=', request.query.tenant)
					.fetchAll({ 'withRelated': ['parent', 'subgroups', 'permissions', 'users'] });
			})
			.then(function(tenantGroups) {
				tenantGroups = self._camelize(tenantGroups.toJSON());

				var responseData = {
					'data':[]	
				};

				for(var idx in tenantGroups) {
					var thisTenantGroup = tenantGroups[idx],
						groupResponse = {
							'id': thisTenantGroup.id,
							'type': 'organization-manager-groups',
							'attributes': {
								'name': thisTenantGroup.displayName,
								'created-on': thisTenantGroup.createdOn								
							},

							'relationships': {
								'tenant': {
									'data': {
										'id': thisTenantGroup.tenantId,
										'type': 'organization-manager'
									}
								},
	
								'parent': {
									'data': {
										'id': thisTenantGroup.parentId,
										'type': 'organization-manager-groups'
									}
								},

								'subgroups': { 'data': [] },
								'permissions': { 'data': [] },
								'users': { 'data': [] }
							}
						};

					for(var sgdx in thisTenantGroup.subgroups) {
						groupResponse.relationships.subgroups.data.push({
							'id': thisTenantGroup.subgroups[sgdx].id,
							'type': 'organization-manager-groups'
						});
					}
	
					for(var pdx in thisTenantGroup.permissions) {
						groupResponse.relationships.permissions.data.push({
							'id': thisTenantGroup.permissions[pdx].id,
							'type': 'organization-manager-group-permissions'
						});
					}
	
					for(var udx in thisTenantGroup.users) {
						groupResponse.relationships.users.data.push({
							'id': thisTenantGroup.users[udx].id,
							'type': 'organization-manager-group-users'
						});
					}

					if(!groupResponse.relationships.parent.data.id)
						delete groupResponse.relationships.parent;

					responseData.data.push(groupResponse);
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

		this.$router.post('/organization-manager-groups', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.data.relationships.tenant.id)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel()
				.save({
					'id': request.body.data.id,
					'display_name': request.body.data.attributes.name,
					'tenant_id': request.body.data.relationships.tenant.data.id,
					'parent_id': request.body.data.relationships.parent.data.id,
					'created_on': request.body.data.attributes['created-on'],
				}, {
					'method': 'insert'
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager-groups'
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

		this.$router.get('/organization-manager-groups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch({ 'withRelated': ['parent', 'subgroups', 'permissions', 'users'] })
			.then(function(tenantGroup) {
				tenantGroup = self._camelize(tenantGroup.toJSON());

				return promises.all([self._checkPermissionAsync(request, requiredPermission, tenantGroup.tenantId), tenantGroup]);
			})
			.then(function(result) {
				var isAllowed = result[0],
					tenantGroup = result[1];

				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var groupResponse = {
					'data': {
						'id': tenantGroup.id,
						'type': 'organization-manager-groups',

						'attributes': {
							'name': tenantGroup.displayName,
							'created-on': tenantGroup.createdOn							
						},

						'relationships': {
							'tenant': {
								'data': {
									'id': tenantGroup.tenantId,
									'type': 'organization-manager'
								}
							},

							'parent': {
								'data': {
									'id': tenantGroup.parentId,
									'type': 'organization-manager-groups'
								}
							},

							'subgroups': { 'data': [] },
							'permissions': { 'data': [] },
							'users': { 'data': [] }
						}
					}
				};

				for(var sgdx in tenantGroup.subgroups) {
					groupResponse.data.relationships.subgroups.data.push({
						'id': tenantGroup.subgroups[sgdx].id,
						'type': 'organization-manager-groups'
					});
				}

				for(var pdx in tenantGroup.permissions) {
					groupResponse.data.relationships.permissions.data.push({
						'id': tenantGroup.permissions[pdx].id,
						'type': 'organization-manager-group-permissions'
					});
				}

				for(var udx in tenantGroup.users) {
					groupResponse.data.relationships.users.data.push({
						'id': tenantGroup.users[udx].id,
						'type': 'organization-manager-group-users'
					});
				}

				if(!groupResponse.data.relationships.parent.data.id)
					delete groupResponse.data.relationships.parent;

				response.status(200).json(groupResponse);
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

		this.$router.patch('/organization-manager-groups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.data.relationships.tenant.id)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel({ 'id': request.params.groupId })
				.save({
					'display_name': request.body.data.attributes.name
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager-group'
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

		this.$router.delete('/organization-manager-groups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch()
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel({ 'id': request.params.groupId }).destroy();
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

		this.$router.post('/organization-manager-group-permissions', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.body.data.relationships.group.data.id })
			.fetch()
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupComponentPermissionModel()
				.save({
					'id': request.body.data.id,
					'group_id': request.body.data.relationships.group.data.id,
					'component_permission_id': request.body.data.relationships.permission.data.id,
					'created_on': request.body.data.attributes['created-on']
				}, {
					'method': 'insert'
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager-group-permissions'
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

		this.$router.get('/organization-manager-group-permissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var groupPermission = null;

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.fetch()
			.then(function(groupPerm) {
				groupPermission = groupPerm;
				return new self.$GroupModel({ 'id': groupPermission.get('group_id') }).fetch();
			})
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var responseData = {
					'data': {
						'id': groupPermission.get('id'),
						'type': 'organization-manager-group-permissions',

						'attributes': {
							'created-on': groupPermission.get('created_on')
						},

						'relationships': {
							'group': {
								'data': {
									'id': groupPermission.get('group_id'),
									'type': 'organization-manager-groups'
								}
							},

							'permission': {
								'data': {
									'id':groupPermission.get('component_permission_id'),
									'type': 'organization-manager-component-permissions'
								}
							}
						}
					}
				};

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

		this.$router.delete('/organization-manager-group-permissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.fetch()
			.then(function(groupPerm) {
				return new self.$GroupModel({ 'id': groupPerm.get('group_id') }).fetch();
			})
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId }).destroy();
			})
			.then(function(groupPermission) {
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

		this.$router.get('/organization-manager-component-permissions/:componentPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$ComponentPermissionModel({ 'id': request.params.componentPermissionId })
			.fetch({ 'withRelated': ['component'] })
			.then(function(componentPermission) {
				componentPermission = self._camelize(componentPermission.toJSON());

				var responseData = {
					'data': {
						'id': request.params.componentPermissionId,
						'type': 'organization-manager-component-permissions',

						'attributes': {
							'component-name': componentPermission.component.displayName,
							'display-name': componentPermission.displayName,
							'description': componentPermission.description
						}
					}
				};

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

		this.$router.post('/organization-manager-group-users', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.body.data.relationships.group.data.id })
			.fetch()
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupUserModel()
				.save({
					'id': request.body.data.id,
					'user_id': request.body.data.relationships.user.data.id,
					'group_id': request.body.data.relationships.group.data.id,
					'created_on': request.body.data.attributes['created-on']
				}, {
					'method': 'insert'
				})
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager-group-users'
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

		this.$router.get('/organization-manager-group-users/:groupUserId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var groupUser = null;

			new self.$GroupUserModel({ 'id': request.params.groupUserId })
			.fetch()
			.then(function(grUser) {
				groupUser = self._camelize(grUser.toJSON());

				return new self.$GroupModel({ 'id': groupUser.groupId }).fetch();
			})
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				response.status(200).json({
					'data': {
						'id': groupUser.id,
						'type': 'organization-manager-group-users',

						'attributes': {
							'created-on': groupUser.createdOn
						},

						'relationships': {
							'group': {
								'data': {
									'id': groupUser.groupId,
									'type': 'organization-manager-groups'
								}
							},

							'user': {
								'data': {
									'id': groupUser.userId,
									'type': 'organization-manager-users'
								}
							},
						}
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

		this.$router.delete('/organization-manager-group-users/:groupUserId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupUserModel({ 'id': request.params.groupUserId })
			.fetch()
			.then(function(groupUser) {
				return new self.$GroupModel({ 'id': groupUser.get('group_id') }).fetch();
			})
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupUserModel({ 'id': request.params.groupUserId }).destroy();
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

	'name': 'organization-manager-groups',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerGroupsComponent;
