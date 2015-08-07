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

					'partnered': function() {
						return this.hasMany(self.$BusinessPartnerModel, 'partner_id');
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

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organizationManagerOrganizationStructures/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.fetch({ 'withRelated': ['parent', 'suborganizations', 'partners.partner', 'partnered.tenant'] })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());

				tenant.parent = tenant.parent ? tenant.parent.id : null;

				var suborganizations = tenant.suborganizations;

				tenant.suborganizations = [];
				for(var idx in suborganizations) {
					tenant.suborganizations.push(suborganizations[idx].id);
				}

				var partners = tenant.partners;
				var partnered = tenant.partnered;

				tenant.partners = [];
				delete tenant.partnered;

				for(var idx in partners) {
					tenant.partners.push(partners[idx].id);
				}

				for(var idx in partnered) {
					tenant.partners.push(partnered[idx].id);
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
						'tenant': (businessPartner.tenant.id == request.user.currentTenant.id) ? businessPartner.tenant.id : businessPartner.partner.id,
						'partner': (businessPartner.tenant.id == request.user.currentTenant.id) ? businessPartner.partner.id : businessPartner.tenant.id,
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
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
