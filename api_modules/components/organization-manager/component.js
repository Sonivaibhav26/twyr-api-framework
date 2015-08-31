/*
 * Name			: api_modules/components/organization-manager/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Organization Manager Component
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var bcrypt = require('bcrypt-nodejs'),
	emailExists = promises.promisifyAll(require('email-existence')),
	path = require('path'),
	uuid = require('node-uuid');

/**
 * Magic Numbers
 */
var requiredPermission = '00000000-0000-0000-0000-000000000000';

var organizationManagerComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'start': function(dependencies, callback) {
		var self = this;

		organizationManagerComponent.parent.start.call(self, dependencies, function(err, status) {
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

					'parent': function() {
						return this.belongsTo(self.$TenantModel, 'parent_id');
					},

					'suborganizations': function() {
						return this.hasMany(self.$TenantModel, 'parent_id');
					},

					'partners': function() {
						return this.hasMany(self.$BusinessPartnerModel, 'tenant_id');
					},

					'groups': function() {
						return this.hasMany(self.$GroupModel, 'tenant_id');
					},

					'users': function() {
						return this.hasMany(self.$UserTenantModel, 'tenant_id');
					},

					'machines': function() {
						return this.hasMany(self.$TenantMachineModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$BusinessPartnerModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenant_business_partners',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'partner': function() {
						return this.belongsTo(self.$TenantModel, 'partner_id');
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

			Object.defineProperty(self, '$UserTenantMachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'user_tenant_machines',
					'idAttribute': 'id',

					'tenantMachine': function() {
						return this.belongsTo(self.$TenantMachineModel, 'tenant_machine_id');
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
					},

					'groups': function() {
						return this.hasMany(self.$UserGroupModel, 'user_id');
					}
				})
			});

			Object.defineProperty(self, '$GroupModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'groups',
					'idAttribute': 'id',

					'parent': function() {
						return this.belongsTo(self.$GroupModel, 'parent_id');
					},

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'subgroups': function() {
						return this.hasMany(self.$GroupModel, 'parent_id');
					},

					'permissions': function() {
						return this.hasMany(self.$GroupComponentPermissionModel, 'group_id');
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

			Object.defineProperty(self, '$TenantMachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenant_machines',
					'idAttribute': 'id',

					'machine': function() {
						return this.belongsTo(self.$MachineModel, 'machine_id');
					},

					'plc': function() {
						return this.belongsTo(self.$PLCModel, 'plc_id');
					},

					'protocol': function() {
						return this.belongsTo(self.$ProtocolModel, 'protocol_id');
					},

					'users': function() {
						return this.hasMany(self.$UserTenantMachineModel, 'tenant_machine_id');
					}
				})
			});

			Object.defineProperty(self, '$MachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'machines',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'machine_id');
					}
				})
			});

			Object.defineProperty(self, '$PLCModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'plcs',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'plc_id');
					}
				})
			});

			Object.defineProperty(self, '$ProtocolModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'protocols',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'protocol_id');
					}
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organizationStructureTree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var tenantId = request.query.id,
				actualTenantId = '',
				subTree = '';

			if(tenantId.indexOf('--') < 0) {
				actualTenantId = tenantId;
			}
			else {
				actualTenantId = tenantId.substring(0, tenantId.indexOf('--'));
				subTree = tenantId.substring(2 + tenantId.indexOf('--'));
			}

			new self.$UserTenantModel()
			.query('where', 'user_id', '=', request.user.id)
			.fetchAll()
			.then(function(userTenants) {
				userTenants = self._camelize(userTenants.toJSON());

				var promiseResolutions = [];

				if(actualTenantId == '#') {
					for(var idx in userTenants) {
						promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, userTenants[idx].tenantId));
					}
				}
				else {
					promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, actualTenantId));
				}

				promiseResolutions.push(userTenants);
				return promises.all(promiseResolutions);
			})
			.then(function(authorizations) {
				var promiseResolutions = [],
					userTenants = authorizations.pop();

				if(actualTenantId == '#') {
					for(var idx in userTenants) {
						if(!authorizations[idx])
							continue;

						promiseResolutions.push(new self.$TenantModel({ 'id': userTenants[idx].tenantId }).fetch());
					}
				}
				else {
					if(authorizations[0]) {
						if(subTree !== '')
							promiseResolutions.push(new self.$TenantModel({ 'id': actualTenantId }).fetch({ 'withRelated': ['suborganizations'] }));
						else
							promiseResolutions.push(new self.$TenantModel({ 'id': actualTenantId }).fetch());
					}
				}

				return promises.all(promiseResolutions);
			})
			.then(function(tenants) {
				var responseData = [];
				if(!tenants.length) {
					response.status(200).json(responseData);
					return;
				}

				switch(subTree) {
					case 'subsidiaries':
						var tenant = self._camelize((tenants[0]).toJSON());
						for(var idx in tenant.suborganizations) {
							if(tenant.suborganizations[idx].tenantType != 'Organization')
								continue;

							responseData.push({
								'id': tenant.suborganizations[idx].id,
								'text': tenant.suborganizations[idx].name,
								'children' : [{
									'id': tenant.suborganizations[idx].id + '--subsidiaries',
									'text': '<i>Subsidiaries</i>',
									'children': true
								}, {
									'id': tenant.suborganizations[idx].id + '--departments',
									'text': '<i>Departments</i>',
									'children': true
								}]
							});
						}
						break;

					case 'departments':
						var tenant = self._camelize((tenants[0]).toJSON());
						for(var idx in tenant.suborganizations) {
							if(tenant.suborganizations[idx].tenantType != 'Department')
								continue;

							responseData.push({
								'id': tenant.suborganizations[idx].id,
								'text': tenant.suborganizations[idx].name,
								'children' : [{
									'id': tenant.suborganizations[idx].id + '--departments',
									'text': '<i>Departments</i>',
									'children': true
								}]
							});
						}
						break;

					default:
						for(var idx in tenants) {
							var tenant = self._camelize((tenants[idx]).toJSON());
							responseData.push({
								'id': tenant.id,
								'text': tenant.name,
								'children': [{
									'id': tenant.id + '--subsidiaries',
									'text': '<i>Subsidiaries</i>',
									'children': true
								}, {
									'id': tenant.id + '--departments',
									'text': '<i>Departments</i>',
									'children': true
								}]
							});
						}
						break;
				};

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organizationStructureGroupsTree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var tenantId = ((request.query.tenantId != '#') ? request.query.tenantId : request.user.currentTenant.id),
				groupId =  ((request.query.groupId != '#') ? request.query.groupId : null);

			self._checkPermissionAsync(request, requiredPermission, tenantId)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				if(!groupId) {
					new self.$TenantModel({ 'id': tenantId })
					.fetch({ 'withRelated': ['groups'] })
					.then(function(tenant) {
						tenant = self._camelize(tenant.toJSON());

						var responseData = [];
						for(var idx in tenant.groups) {
							if(tenant.groups[idx].parentId)
								continue;

							responseData.push({
								'id': tenant.groups[idx].id,
								'text': tenant.groups[idx].displayName,
								'children' : true
							});
						}

						response.status(200).json(responseData);
					})
					.catch(function(err) {
						self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
						response.status(err.code || err.number || 500).json(err);
					});
				}
				else {
					new self.$GroupModel({ 'id': groupId })
					.fetch({ 'withRelated': ['subgroups'] })
					.then(function(group) {
						group = self._camelize(group.toJSON());

						var responseData = [];
						for(var idx in group.subgroups) {
							if(group.subgroups[idx].tenantId != group.tenantId)
								continue;

							responseData.push({
								'id': group.subgroups[idx].id,
								'text': group.subgroups[idx].displayName,
								'children' : true
							});
						}

						response.status(200).json(responseData);
					})
					.catch(function(err) {
						self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
						response.status(err.code || err.number || 500).json(err);
					});
				}
			})
		});

		this.$router.post('/organizationManagerOrganizationStructures', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManagerOrganizationStructure.parent)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantModel({
					'id': request.body.organizationManagerOrganizationStructure.id,
					'name': request.body.organizationManagerOrganizationStructure.name,
					'parent_id': request.body.organizationManagerOrganizationStructure.parent,
					'tenant_type': request.body.organizationManagerOrganizationStructure.tenantType,
					'created_on': request.body.organizationManagerOrganizationStructure.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationStructure': {
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


		this.$router.get('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.params.tenantId)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantModel({
					'id': request.params.tenantId
				})
				.fetch({
					'withRelated': ['parent', 'suborganizations', 'groups', 'users', 'partners', 'machines']
				});
			})
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());

				tenant.parent = (tenant.parent ? ((tenant.id != request.user.currentTenant.id) ? tenant.parent.id : null) : null);
				delete tenant.parentId;

				var suborganizations = [];
				for(var idx in tenant.suborganizations) {
					suborganizations.push(tenant.suborganizations[idx].id);
				}
				tenant.suborganizations = suborganizations;

				var groups = [];
				for(var idx in tenant.groups) {
					groups.push(tenant.groups[idx].id);
				}
				tenant.groups = groups;

				var users = [];
				for(var idx in tenant.users) {
					users.push(tenant.users[idx].id);
				}
				tenant.users = users;

				var machines = [];
				for(var idx in tenant.machines) {
					machines.push(tenant.machines[idx].id);
				}
				tenant.machines = machines;

				response.status(200).json({
					'organizationManagerOrganizationStructure': tenant
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

		this.$router.put('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.params.tenantId)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantModel({
					'id': request.params.tenantId
				})
				.save({
					'name': request.body.organizationManagerOrganizationStructure.name
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationStructure': {
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

		this.$router.delete('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.params.tenantId)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantModel({ 'id': request.params.tenantId }).destroy();
			})
			.then(function(savedRecord) {
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

		this.$router.post('/organizationManagerOrganizationUserTenants', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManagerOrganizationUserTenant.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantModel({
					'id': request.body.organizationManagerOrganizationUserTenant.id,
					'tenant_id': request.body.organizationManagerOrganizationUserTenant.tenant,
					'user_id': request.body.organizationManagerOrganizationUserTenant.user,
					'created_on': request.body.organizationManagerOrganizationUserTenant.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationUserTenant' : {
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

		this.$router.get('/organizationManagerOrganizationUserTenants/:userTenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var userTenant = null;
			new self.$UserTenantModel({ 'id': request.params.userTenantId })
			.fetch({ 'withRelated': [ 'tenant', 'user' ] })
			.then(function(userTenantRel) {
				userTenantRel = self._camelize(userTenantRel.toJSON());

				userTenantRel.tenant = userTenantRel.tenantId;
				userTenantRel.user = userTenantRel.userId;

				delete userTenantRel.tenantId;
				delete userTenantRel.userId;

				userTenant = userTenantRel;
				return self._checkPermissionAsync(request, requiredPermission, userTenant.tenant);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				response.status(200).json({
					'organizationManagerOrganizationUserTenant': userTenant
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

		this.$router.delete('/organizationManagerOrganizationUserTenants/:userTenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserTenantModel({ 'id': request.params.userTenantId })
			.fetch()
			.then(function(userTenant) {
				return self._checkPermissionAsync(request, requiredPermission, userTenant.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantModel({ 'id': request.params.userTenantId }).destroy();
			})
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

		this.$router.post('/organizationManagerOrganizationUserGroups', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.body.organizationManagerOrganizationUserGroup.group })
			.fetch()
			.then(function(group) {
				return self._checkPermissionAsync(request, requiredPermission, group.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserGroupModel({
					'id': request.body.organizationManagerOrganizationUserGroup.id,
					'user_id': request.body.organizationManagerOrganizationUserGroup.user,
					'group_id': request.body.organizationManagerOrganizationUserGroup.group,
					'created_on': request.body.organizationManagerOrganizationUserGroup.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationUserGroup': {
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

		this.$router.get('/organizationManagerOrganizationUserGroups/:userGroupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var userGroup = null;

			new self.$UserGroupModel({ 'id': request.params.userGroupId })
			.fetch({ 'withRelated': ['group'] })
			.then(function(record) {
				userGroup = self._camelize(record.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, userGroup.group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				response.status(200).json({
					'organizationManagerOrganizationUserGroup': {
						'id': userGroup.id,
						'tenant': userGroup.group.tenantId,
						'user': userGroup.userId,
						'group': userGroup.groupId,
						'createdOn': userGroup.createdOn
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

		this.$router.delete('/organizationManagerOrganizationUserGroups/:userGroupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserGroupModel({ 'id': request.params.userGroupId })
			.fetch({ 'withRelated': ['group'] })
			.then(function(userGroup) {
				userGroup = self._camelize(userGroup.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, userGroup.group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserGroupModel({ 'id': request.params.userGroupId }).destroy();
			})
			.then(function(userGroup) {
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

		this.$router.post('/organizationManagerOrganizationUsers', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var newPassword = '';

			new self.$UserModel({ 'email': request.body.organizationManagerOrganizationUser.email })
			.fetch()
			.then(function(userRecord) {
				if(userRecord) {
					throw({
						'number': 403,
						'message': 'Username already exists! Please try with a different email id'
					});
				}

				return emailExists.checkAsync(request.body.organizationManagerOrganizationUser.email);
			})
			.then(function(emailExists) {
				if(!emailExists) {
					throw { 'code': 403, 'message': 'Invalid Email Id (' + request.body.organizationManagerOrganizationUser.email + ')' };
					return;
				}

				var randomRequestData = JSON.parse(JSON.stringify(self.$config.randomServer.options));
				randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
				randomRequestData.data = JSON.stringify(randomRequestData.data);

				return self.$module.$utilities.restCall(self.$config.randomServer.protocol, randomRequestData);
			})
			.then(function(randomPassword) {
				randomPassword = (randomPassword ? JSON.parse(randomPassword) : null);
				newPassword = (randomPassword ? randomPassword.result.random.data[0] : null);

				var newUser = new self.$UserModel({
					'id': request.body.organizationManagerOrganizationUser.id,
					'email': request.body.organizationManagerOrganizationUser.email,
					'password': bcrypt.hashSync(newPassword),
					'first_name': request.body.organizationManagerOrganizationUser.firstName,
					'last_name': request.body.organizationManagerOrganizationUser.lastName,
					'created_on': request.body.organizationManagerOrganizationUser.createdOn
				});

				return newUser.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationUser': {
						'id': savedRecord.get('id')
					}
				});
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.newAccountPath;
				notificationOptions.data = JSON.stringify({
					'username': request.body.organizationManagerOrganizationUser.email,
					'password': newPassword
				});

				return self.$module.$utilities.restCall(self.$config.notificationServer.protocol, notificationOptions);
			})
			.then(function(notificationResponse) {
				self.$dependencies.logger.debug('Response from Notificaton Server: ', notificationResponse);
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

		this.$router.get('/organizationManagerOrganizationUsers/:userId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserModel({ 'id': request.params.userId })
			.fetch({ 'withRelated': ['groups'] })
			.then(function(user) {
				user = self._camelize(user.toJSON());
				delete user.password;

				var userGroups = [];
				for(var idx in user.groups) {
					userGroups.push(user.groups[idx].id);
				}
				user.groups = userGroups;

				response.status(200).json({
					'organizationManagerOrganizationUser': user
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

		this.$router.post('/organizationManagerOrganizationGroups', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManagerOrganizationGroup.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel({
					'id': request.body.organizationManagerOrganizationGroup.id,
					'display_name': request.body.organizationManagerOrganizationGroup.displayName,
					'parent_id': request.body.organizationManagerOrganizationGroup.parent,
					'tenant_id': request.body.organizationManagerOrganizationGroup.tenant,
					'created_on': request.body.organizationManagerOrganizationGroup.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationGroup': {
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

		this.$router.get('/organizationManagerOrganizationGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var group = null;

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch({ 'withRelated': ['subgroups', 'permissions'] })
			.then(function(record) {
				group = self._camelize(record.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var subGroups = [];
				for(var idx in group.subgroups) {
					if(group.subgroups[idx].tenantId != group.tenantId)
						continue;

					subGroups.push(group.subgroups[idx].id);
				}

				var permissions = [];
				for(var idx in group.permissions) {
					permissions.push(group.permissions[idx].id);
				}

				group.parent = group.parentId;
				group.tenant = group.tenantId;

				group.subgroups = subGroups;
				group.permissions = permissions;

				delete group.canBeParent;
				delete group.visibleToSubTenants;
				delete group.parentId;
				delete group.tenantId;

				response.status(200).json({
					'organizationManagerOrganizationGroup': group
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

		this.$router.put('/organizationManagerOrganizationGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch()
			.then(function(group) {
				group = self._camelize(group.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel({ 'id': request.params.groupId })
				.save({ 'display_name': request.body.organizationManagerOrganizationGroup.displayName }, { 'method': 'update', 'patch': true });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationGroup': {
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

		this.$router.delete('/organizationManagerOrganizationGroups/:groupId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.params.groupId })
			.fetch()
			.then(function(group) {
				group = self._camelize(group.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupModel({ 'id': request.params.groupId }).destroy();
			})
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

		this.$router.post('/organizationManagerOrganizationGroupPermissions', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupModel({ 'id': request.body.organizationManagerOrganizationGroupPermission.group })
			.fetch()
			.then(function(group) {
				group = self._camelize(group.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupComponentPermissionModel({
					'id': request.body.organizationManagerOrganizationGroupPermission.id,
					'group_id': request.body.organizationManagerOrganizationGroupPermission.group,
					'component_permission_id': request.body.organizationManagerOrganizationGroupPermission.permission,
					'created_on': request.body.organizationManagerOrganizationGroupPermission.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationGroupPermission': {
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

		this.$router.get('/organizationManagerOrganizationGroupPermissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var groupPermission = null;

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.fetch({ 'withRelated': ['group'] })
			.then(function(record) {
				groupPermission = self._camelize(record.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, groupPermission.group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				groupPermission.group = groupPermission.groupId;
				groupPermission.permission = groupPermission.componentPermissionId;
				
				delete groupPermission.groupId;
				delete groupPermission.componentPermissionId;

				response.status(200).json({
					'organizationManagerOrganizationGroupPermission': groupPermission
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

		this.$router.delete('/organizationManagerOrganizationGroupPermissions/:groupPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId })
			.fetch({ 'withRelated': ['group'] })
			.then(function(record) {
				groupPermission = self._camelize(record.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, groupPermission.group.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$GroupComponentPermissionModel({ 'id': request.params.groupPermissionId }).destroy();
			})
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

		this.$router.get('/organizationManagerComponentPermissions/:componentPermissionId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$ComponentPermissionModel({ 'id': request.params.componentPermissionId })
			.fetch({ 'withRelated': ['component'] })
			.then(function(componentPermission) {
				componentPermission = self._camelize(componentPermission.toJSON());

				var responseData = {};
				responseData.id = componentPermission.id;
				responseData.displayName = componentPermission.displayName;
				responseData.description = componentPermission.description;
				responseData.componentName = componentPermission.component.displayName;

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

		this.$router.post('/organizationManagerTenantMachines', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantMachineModel({
					'id': request.body.organizationManagerTenantMachine.id,
					'name': request.body.organizationManagerTenantMachine.name,
					'tenant_id': request.body.organizationManagerTenantMachine.tenant,
	
					'machine_id': request.body.organizationManagerTenantMachine.machine,
					'plc_id': request.body.organizationManagerTenantMachine.plc,
					'protocol_id': request.body.organizationManagerTenantMachine.protocol,
	
					'tag_data': {},
					'tag_computed': {},
	
					'sms_alert': request.body.organizationManagerTenantMachine.smsAlert,
					'push_alert': request.body.organizationManagerTenantMachine.pushAlert,
					'email_alert': request.body.organizationManagerTenantMachine.emailAlert,
					'status_alert': request.body.organizationManagerTenantMachine.statusAlert,
					'status_alert_period': request.body.organizationManagerTenantMachine.statusAlertPeriod || 0,
	
					'created_on': request.body.organizationManagerTenantMachine.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerTenantMachine': {
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

		this.$router.get('/organizationManagerTenantMachines/:tenantMachineId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$TenantMachineModel({ 'id': request.params.tenantMachineId })
			.fetch({ 'withRelated': ['machine', 'plc', 'protocol', 'users', 'users.user'] })
			.then(function(tenantMachine) {
				tenantMachine = self._camelize(tenantMachine.toJSON());

				var promiseResolutions = [];
				promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, tenantMachine.tenantId));
				promiseResolutions.push(tenantMachine);

				return promises.all(promiseResolutions);
			})
			.then(function(results) {
				var isAllowed = results[0],
					tenantMachine = results[1];

				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var tags = [],
					computed = [];

				tenantMachine.tags = [];
				for(var tagIdx in tenantMachine.tagData) {
					var thisTag = tenantMachine.tagData[tagIdx];

					thisTag.id = tenantMachine.id + '-' + tagIdx;
					thisTag.machine = tenantMachine.id;

					tenantMachine.tags.push(tenantMachine.id + '-' + tagIdx);
					tags.push(thisTag);
				}

				tenantMachine.computed = [];
				for(var compIdx in tenantMachine.tagComputed) {
					var thisComputed = tenantMachine.tagComputed[compIdx];

					thisComputed.id = tenantMachine.id + '-' + compIdx;
					thisComputed.machine = tenantMachine.id;

					tenantMachine.computed.push(tenantMachine.id + '-' + compIdx);
					computed.push(thisComputed);
				}

				var tenantMachineUsers = tenantMachine.users,
					users = [];

				tenantMachine.users = [];
				for(var uidx in tenantMachineUsers) {
					var thisUser = tenantMachineUsers[uidx];
					tenantMachine.users.push(thisUser.id);

					thisUser.tenantMachine = thisUser.tenantMachineId;
					thisUser.user = thisUser.userId;

					delete thisUser.tenantMachineId;
					delete thisUser.userId;

					users.push(thisUser);
				}

				var responseData = {};

				responseData['organizationManagerTenantMachine'] = tenantMachine;
				responseData['organizationManagerMachine'] = [tenantMachine.machine];
				responseData['organizationManagerPlc'] = [tenantMachine.plc];
				responseData['organizationManagerProtocol'] = [tenantMachine.protocol];
				responseData['organizationManagerTenantMachineTag'] = tags;
				responseData['organizationManagerTenantMachineTagComputed'] = computed;
				responseData['organizationManagerTenantMachineUser'] = users;

				tenantMachine.machine = tenantMachine.machineId;
				tenantMachine.plc = tenantMachine.plcId;
				tenantMachine.protocol = tenantMachine.protocol.id;

				delete tenantMachine.machineId;
				delete tenantMachine.plcId;
				delete tenantMachine.protocolId;
				delete tenantMachine.tagData;
				delete tenantMachine.tagComputed;

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

		this.$router.put('/organizationManagerTenantMachines/:tenantMachineId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManagerTenantMachine.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantMachineModel({
					'id': request.params.tenantMachineId
				})
				.save({
					'name': request.body.organizationManagerTenantMachine.name,
					'sms_alert': request.body.organizationManagerTenantMachine.smsAlert,
					'push_alert': request.body.organizationManagerTenantMachine.pushAlert,
					'email_alert': request.body.organizationManagerTenantMachine.emailAlert,
					'status_alert': (request.body.organizationManagerTenantMachine.statusAlertPeriod > 0),
					'status_alert_period': (request.body.organizationManagerTenantMachine.statusAlertPeriod || 0)
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerTenantMachine': {
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

		this.$router.delete('/organizationManagerTenantMachines/:tenantMachineId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$TenantMachineModel({ 'id': request.params.tenantMachineId })
			.fetch()
			.then(function(tenantMachine) {
				tenantMachine = self._camelize(tenantMachine.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, tenantMachine.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantMachineModel({ 'id': request.params.tenantMachineId }).destroy();
			})
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

		this.$router.post('/organizationManagerTenantMachineUsers', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$TenantMachineModel({ 'id': request.body.organizationManagerTenantMachineUser.tenantMachine })
			.fetch()
			.then(function(tenantMachine) {
				tenantMachine = self._camelize(tenantMachine.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, tenantMachine.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantMachineModel({
					'id': request.body.organizationManagerTenantMachineUser.id,
					'user_id': request.body.organizationManagerTenantMachineUser.user,
					'tenant_machine_id': request.body.organizationManagerTenantMachineUser.tenantMachine,
					'created_on': request.body.organizationManagerTenantMachineUser.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
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

		this.$router.delete('/organizationManagerTenantMachineUsers/:userTenantMachineId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserTenantMachineModel({ 'id': request.params.userTenantMachineId })
			.fetch({ 'withRelated': ['tenantMachine'] })
			.then(function(userTenantMachine) {
				userTenantMachine = self._camelize(userTenantMachine.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, userTenantMachine.tenantMachine.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$UserTenantMachineModel({ 'id': request.params.userTenantMachineId }).destroy();
			})
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

		this.$router.post('/organizationManagerTenantMachineTags', function(request, response, next) {
			response.status(200).json({
				'organizationManagerTenantMachineTag': {
					'id': request.body.organizationManagerTenantMachineTag.id
				}
			});
		});

		this.$router.put('/organizationManagerTenantMachineTags', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantMachineModel({
					'id': request.body.machine
				})
				.save({
					'tag_data': JSON.stringify(request.body.tags || {})
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function() {
				response.status(200).json({
					'status': 'true',
					'responseText': 'Updated Tag Information successfully'
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'status': 'true',
					'responseText': err.detail || err.message
				});
			});
		});

		this.$router.post('/organizationManagerTenantMachineTagComputeds', function(request, response, next) {
			response.status(200).json({
				'organizationManagerTenantMachineTagComputed': {
					'id': request.body.organizationManagerTenantMachineTagComputed.id
				}
			});
		});

		this.$router.put('/organizationManagerTenantMachineTagComputeds', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantMachineModel({
					'id': request.body.machine
				})
				.save({
					'tag_computed': JSON.stringify(request.body.tags || {})
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function() {
				response.status(200).json({
					'status': 'true',
					'responseText': 'Updated Tag Information successfully'
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'status': 'true',
					'responseText': err.detail || err.message
				});
			});
		});

		this.$router.put('/organizationManagerTenantMachineTags/:tagId', function(request, response, next) {
			response.status(200).json({
				'organizationManagerTenantMachineTag': {
					'id': request.params.tagId
				}
			});
		});

		this.$router.put('/organizationManagerTenantMachineTagComputeds/:tagId', function(request, response, next) {
			response.status(200).json({
				'organizationManagerTenantMachineTagComputed': {
					'id': request.params.tagId
				}
			});
		});

		this.$router.post('/organizationManagerMachines', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$MachineModel()
			.query(function(qb) {
				qb
				.where({ 'id': request.body.organizationManagerMachine.id })
				.orWhere(function() {
					this
					.where({
						'manufacturer': request.body.organizationManagerMachine.manufacturer,
						'model': request.body.organizationManagerMachine.model
					});
				});
			})
			.fetch()
			.then(function(machine) {
				if(machine) {
					return machine;
				}

				return new self.$MachineModel({
					'id': request.body.organizationManagerMachine.id || uuid.v4().toString(),
					'name': request.body.organizationManagerMachine.name,
					'manufacturer': request.body.organizationManagerMachine.manufacturer,
					'category': request.body.organizationManagerMachine.category,
					'model': request.body.organizationManagerMachine.model,
					'created_on': request.body.organizationManagerMachine.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				request.body.organizationManagerMachine.id = savedRecord.get('id');
				response.status(200).json({
					'organizationManagerMachine': self._camelize(savedRecord.toJSON())
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

		this.$router.post('/organizationManagerPlcs', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$PLCModel()
			.query(function(qb) {
				qb
				.where({ 'id': request.body.organizationManagerPlc.id })
				.orWhere(function() {
					this
					.where({
						'manufacturer': request.body.organizationManagerPlc.manufacturer,
						'model': request.body.organizationManagerPlc.model
					});
				})
			})
			.fetch()
			.then(function(plc) {
				if(plc) {
					return plc;
				}

				return new self.$PLCModel({
					'id': request.body.organizationManagerPlc.id || uuid.v4().toString(),
					'name': request.body.organizationManagerPlc.name,
					'manufacturer': request.body.organizationManagerPlc.manufacturer,
					'category': request.body.organizationManagerPlc.category,
					'model': request.body.organizationManagerPlc.model,
					'created_on': request.body.organizationManagerPlc.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				request.body.organizationManagerPlc.id = savedRecord.get('id');
				response.status(200).json({
					'organizationManagerPlc': self._camelize(savedRecord.toJSON())
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

		this.$router.post('/organizationManagerProtocols', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$ProtocolModel()
			.query(function(qb) {
				qb
				.where({ 'id': request.body.organizationManagerProtocol.id })
				.orWhere(function() {
					this
					.where({
						'name': request.body.organizationManagerProtocol.name,
						'version': request.body.organizationManagerProtocol.version
					});
				});
			})
			.fetch()
			.then(function(protocol) {
				if(protocol) {
					return protocol;
				}

				return new self.$ProtocolModel({
					'id': request.body.organizationManagerProtocol.id || uuid.v4().toString(),
					'name': request.body.organizationManagerProtocol.name,
					'version': request.body.organizationManagerProtocol.version,
					'created_on': request.body.organizationManagerProtocol.createdOn
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				request.body.organizationManagerProtocol.id = savedRecord.get('id');
				response.status(200).json({
					'organizationManagerProtocol': self._camelize(savedRecord.toJSON())
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
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
