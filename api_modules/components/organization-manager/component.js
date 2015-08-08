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

		this.$router.get('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.fetch({ 'withRelated': ['parent', 'suborganizations', 'partners', 'users'] })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());
				console.log('_camelized Tenant: ', tenant);

				tenant.parent = tenant.parent ? tenant.parent.id : null;

				var suborganizations = tenant.suborganizations;
				tenant.suborganizations = [];
				for(var idx in suborganizations) {
					tenant.suborganizations.push(suborganizations[idx].id);
				}

				var partners = tenant.partners;
				tenant.partners = [];
				for(var idx in partners) {
					tenant.partners.push(partners[idx].id);
				}

				var users = tenant.users;
				tenant.users = [];
				for(var idx in users) {
					tenant.users.push(users[idx].id);
				}

				console.log('GET Tenant Response: ', tenant);
				response.status(200).json({
					'organizationManagerOrganizationStructures': [tenant]
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.put('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.save({
				'name': request.body.organizationManagerOrganizationStructure.name,
			}, {
				'patch': true
			})
			.then(function(savedDepartment) {
				response.status(200).json({ 'organizationManagerOrganizationStructure': { 'id': savedDepartment.get('id') } });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error updating department']
					}
				});
			});
		});

		this.$router.post('/organizationManagerOrganizationStructures', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({
				'id': request.body.organizationManagerOrganizationStructure.id || uuid.v4().toString(),
				'parent_id': request.body.organizationManagerOrganizationStructure.parent,
				'name': request.body.organizationManagerOrganizationStructure.name,
				'tenant_type': request.body.organizationManagerOrganizationStructure.tenantType,
				'created_on': request.body.organizationManagerOrganizationStructure.createdOn
			})
			.save(null, { 'method':'insert' })
			.then(function(savedOrganization) {
				response.status(200).json({ 'organizationManagerOrganizationStructure': { 'id': savedOrganization.get('id') } });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error saving new department']
					}
				});
			});
		});

		this.$router.delete('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.destroy()
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error deleting department']
					}
				});
			});
		});

		this.$router.get('/organizationManagerOrganizationPartners/:id', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$BusinessPartnerModel({ 'id': request.params.id })
			.fetch({ 'withRelated': [ 'tenant', 'partner' ] })
			.then(function(businessPartner) {
				businessPartner = self._camelize(businessPartner.toJSON());
				response.status(200).json({
					'organizationManagerOrganizationPartner': {
						'id': request.params.id,
						'tenant': businessPartner.tenant.id,
						'partner': businessPartner.partner.id,
						'createdOn': businessPartner.createdOn
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error retrieving business partner']
					}
				});
			});
		});

		this.$router.post('/organizationManagerOrganizationPartners', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$BusinessPartnerModel({
				'id': request.body.organizationManagerOrganizationPartner.id,
				'tenant_id': request.body.organizationManagerOrganizationPartner.tenant,
				'partner_id': request.body.organizationManagerOrganizationPartner.partner,
				'created_on': request.body.organizationManagerOrganizationPartner.createdOn
			})
			.save(null, { 'method': 'insert' })
			.then(function(savedRel) {
				response.status(200).json({
					'organizationManagerBusinessPartner': { 'id': savedRel.get('id') }
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error adding business partner']
					}
				});
			});
		});

		this.$router.delete('/organizationManagerOrganizationPartners/:id', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$BusinessPartnerModel({ 'id': request.params.id })
			.destroy()
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error deleting department']
					}
				});
			});
		});

		this.$router.get('/organizationManagerOrganizationUsers/:id', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserTenantModel({ 'id': request.params.id })
			.fetch({ 'withRelated': [ 'tenant', 'user' ] })
			.then(function(userTenant) {
				userTenant = self._camelize(userTenant.toJSON());
				response.status(200).json({
					'organizationManagerOrganizationUser': {
						'id': request.params.id,
						'tenant': userTenant.tenant.id,
						'user': userTenant.user.id,
						'createdOn': userTenant.createdOn
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error retrieving user tenant']
					}
				});
			});
		});

		this.$router.post('/organizationManagerOrganizationUsers', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserTenantModel({
				'id': request.body.organizationManagerOrganizationUser.id,
				'tenant_id': request.body.organizationManagerOrganizationUser.tenant,
				'user_id': request.body.organizationManagerOrganizationUser.user,
				'created_on': request.body.organizationManagerOrganizationUser.createdOn
			})
			.save(null, { 'method': 'insert' })
			.then(function(savedRel) {
				response.status(200).json({
					'organizationManagerOrganizationUser': { 'id': savedRel.get('id') }
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error adding user tenant']
					}
				});
			});
		});

		this.$router.delete('/organizationManagerOrganizationUsers/:id', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserTenantModel({ 'id': request.params.id })
			.destroy()
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error deleting user tenant']
					}
				});
			});
		});

		this.$router.get('/organizationManagerUsers/:id', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserModel({ 'id': request.params.id })
			.fetch()
			.then(function(user) {
				user = self._camelize(user.toJSON());
				response.status(200).json({
					'organizationManagerUser': {
						'id': request.params.id,
						'firstName': user.firstName,
						'lastName': user.lastName,
						'email': user.email,
						'createdOn': user.createdOn
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).send({
					'errors': {
						'id': [err.message || err.detail || 'Error retrieving user']
					}
				});
			});
		});
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
