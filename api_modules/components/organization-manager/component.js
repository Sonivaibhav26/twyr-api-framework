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
var uuid = require('node-uuid');

/**
 * Magic Numbers
 */
var requiredPermission = '00000000-0000-0000-0000-000000000000';

var organizationManagerComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
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

			Object.defineProperty(self, '$GroupModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'groups',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'subgroups': function() {
						return this.hasMany(self.$GroupModel, 'parent_id');
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

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			var tenantId = ((request.query.id != '#') ? request.query.id : request.user.currentTenant.id),
				actualTenantId = '',
				subTree = '';

			if(tenantId.indexOf('--') < 0) {
				actualTenantId = tenantId;
			}
			else {
				actualTenantId = tenantId.substring(0, tenantId.indexOf('--'));
				subTree = tenantId.substring(2 + tenantId.indexOf('--'));
			}

			new self.$TenantModel({ 'id': actualTenantId })
			.fetch((subTree !== '') ? { 'withRelated': ['suborganizations'] } : null)
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());

				var responseData = [];
				switch(subTree) {
					case 'subsidiaries':
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
						break;
				};

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.post('/organizationManagerOrganizationStructures', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});


				return;
			}

			new self.$TenantModel({
				'id': request.body.organizationManagerOrganizationStructure.id,
				'name': request.body.organizationManagerOrganizationStructure.name,
				'parent_id': request.body.organizationManagerOrganizationStructure.parent,
				'tenant_type': request.body.organizationManagerOrganizationStructure.tenantType,
				'created_on': request.body.organizationManagerOrganizationStructure.createdOn
			})
			.save(null, { 'method': 'insert' })
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationStructure': {
						'id': savedRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});

		});


		this.$router.get('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$TenantModel({ 'id': request.params.tenantId })
			.fetch({ 'withRelated': ['parent', 'suborganizations', 'groups', 'users', 'partners'] })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());
				tenant.parent = (tenant.parent ? ((tenant.parent.id != request.user.currentTenant.id) ? tenant.parent.id : null) : null);

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

				response.status(200).json({
					'organizationManagerOrganizationStructure': tenant
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.put('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$TenantModel({
				'id': request.params.tenantId
			})
			.save({ 'name': request.body.organizationManagerOrganizationStructure.name }, { 'method': 'update', 'patch': true })
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationStructure': {
						'id': savedRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.delete('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$TenantModel({ 'id': request.params.tenantId })
			.destroy()
			.then(function(savedRecord) {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organizationManagerOrganizationUserTenants/:userTenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$UserTenantModel({ 'id': request.params.userTenantId })
			.fetch({ 'withRelated': [ 'tenant', 'user' ] })
			.then(function(userTenantRel) {
				userTenantRel = self._camelize(userTenantRel.toJSON());

				userTenantRel.tenant = userTenantRel.tenantId;
				userTenantRel.user = userTenantRel.userId;

				delete userTenantRel.tenantId;
				delete userTenantRel.userId;

				response.status(200).json({
					'organizationManagerOrganizationUserTenant': userTenantRel
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.delete('/organizationManagerOrganizationUserTenants/:userTenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$UserTenantModel({ 'id': request.params.userTenantId })
			.destroy()
			.then(function(savedRecord) {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.get('/organizationManagerOrganizationUsers/:userId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			if(!self._checkPermission(request, requiredPermission)) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: Un-authorized access');
				response.status(422).json({
					'errors': {
						'id': ['Un-authorized access! You are not allowed to retrieve this information!!']
					}
				});

				return;
			}

			new self.$UserModel({ 'id': request.params.userId })
			.fetch()
			.then(function(user) {
				user = self._camelize(user.toJSON());
				delete user.password;

				response.status(200).json({
					'organizationManagerOrganizationUser': user
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
