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
				subTree = '',
				fetchOptions = { 'withRelated': [] };

			if(tenantId.indexOf('--') < 0) {
				actualTenantId = tenantId;
			}
			else {
				actualTenantId = tenantId.substring(0, tenantId.indexOf('--'));
				subTree = tenantId.substring(2 + tenantId.indexOf('--'));
			}

			switch(subTree) {
				case 'subsidiaries':
				case 'departments':
					fetchOptions.withRelated.push('suborganizations');
					break;

				case 'vendors':
					fetchOptions.withRelated.push('partners.partner');
					break;
			};

			new self.$TenantModel({ 'id': actualTenantId })
			.fetch(fetchOptions)
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
								}, {
									'id': tenant.suborganizations[idx].id + '--vendors',
									'text': '<i>Vendors</i>',
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
								}, {
									'id': tenant.suborganizations[idx].id + '--vendors',
									'text': '<i>Vendors</i>',
									'children': true
								}]
							});
						}
						break;

					case 'vendors':
						for(var idx in tenant.partners) {
							responseData.push({
								'id': tenant.partners[idx].id,
								'text': tenant.partners[idx].partner.name
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
							}, {
								'id': tenant.id + '--vendors',
								'text': '<i>Vendors</i>',
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
				'parent_id':request.body.organizationManagerOrganizationStructure.parent,
				'name': request.body.organizationManagerOrganizationStructure.name,
				'tenant_type': request.body.organizationManagerOrganizationStructure.tenantType,
				'created_on': request.body.organizationManagerOrganizationStructure.createdOn
			})
			.save(null, { 'method': 'insert' })
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationStructure': { 'id': savedRecord.get('id') }
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot retrieve organization information']
					}
				});
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
			.fetch({ 'withRelated': ['parent', 'suborganizations', 'partners'] })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());
				console.log('_camelized Tenant: ', tenant);

				tenant.parent = (tenant.parent ? tenant.parent.id : null);

				var suborganizations = [];
				for(var idx in tenant.suborganizations) {
					suborganizations.push(tenant.suborganizations[idx].id);
				}
				tenant.suborganizations = suborganizations;

				var partners = [];
				for(var idx in tenant.partners) {
					partners.push(tenant.partners[idx].id);
				}
				tenant.partners = partners;

				response.status(200).json({
					'organizationManagerOrganizationStructure': tenant
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot retrieve organization information']
					}
				});
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
				'id': request.params.tenantId,
				'name': request.body.organizationManagerOrganizationStructure.name
			})
			.save(null, { 'method': 'update' })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());
				console.log('_camelized Tenant: ', tenant);

				response.status(200).json({
					'organizationManagerOrganizationStructure': {
						'id': request.params.tenantId
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot retrieve organization information']
					}
				});
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
			.then(function(partnership) {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot delete partnership information']
					}
				});
			});
		});

		this.$router.post('/organizationManagerOrganizationPartners', function(request, response, next) {
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

			new self.$BusinessPartnerModel({
				'id': request.body.organizationManagerOrganizationPartner.id,
				'tenant_id': request.body.organizationManagerOrganizationPartner.tenant,
				'partner_id': request.body.organizationManagerOrganizationPartner.partner	,
				'created_on': request.body.organizationManagerOrganizationPartner.createdOn
			})
			.save(null, { 'method': 'insert' })
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerOrganizationPartner': { 'id': savedRecord.get('id') }
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot delete partnership information']
					}
				});
			});
		});

		this.$router.get('/organizationManagerOrganizationPartners/:partnershipId', function(request, response, next) {
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

			new self.$BusinessPartnerModel({ 'id': request.params.partnershipId })
			.fetch()
			.then(function(partnership) {
				partnership = self._camelize(partnership.toJSON());
				console.log('_camelized Partner: ', partnership);

				partnership.tenant = partnership.tenantId;
				partnership.partner = partnership.partnerId;

				delete partnership.tenantId;
				delete partnership.partnerId;

				response.status(200).json({
					'organizationManagerOrganizationPartner': partnership
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot retrieve partnership information']
					}
				});
			});
		});

		this.$router.delete('/organizationManagerOrganizationPartners/:partnershipId', function(request, response, next) {
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

			new self.$BusinessPartnerModel({ 'id': request.params.partnershipId })
			.destroy()
			.then(function(partnership) {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot delete partnership information']
					}
				});
			});
		});
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
