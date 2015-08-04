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

					'departments': function() {
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

		this.$router.get('/organizationManagerBasicInformation/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.fetch({ 'withRelated': ['departments', 'partners.partner', 'partnered.tenant'] })
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());
				console.log('_camelize Tenant: ', tenant);

				tenant.parent = tenant.parentId;
				delete tenant.parentId;

				var departments = tenant.departments;
				tenant.departments = [];
				for(var idx in departments) {
					if(departments[idx].tenant_type != 'Department')
						continue;

					tenant.departments.push(departments[idx].id);
				}

				var partners = tenant.partners;
				tenant.partners = [];
				for(var idx in partners) {
					tenant.partners.push(partners[idx].partnerId);
				}

				var partnered = tenant.partnered;
				delete tenant.partnered;
				for(var idx in partnered) {
					tenant.partners.push(partnered[idx].tenantId);
				}

				console.log('GET Tenant Response: ', tenant);
				response.status(200).json({
					'organizationManagerBasicInformation': [tenant]
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.put('/organizationManagerBasicInformation/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({ 'id': request.params.tenantId })
			.save({
				'parent_id': request.body.organizationManagerBasicInformation.parent,
				'name': request.body.organizationManagerBasicInformation.name,
				'tenant_type': request.body.organizationManagerBasicInformation.tenantType
			}, {
				'patch': true
			})
			.then(function(savedDepartment) {
				response.status(200).json({ 'organizationManagerBasicInformation': { 'id': savedDepartment.get('id') } });
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

		this.$router.post('/organizationManagerBasicInformation', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$TenantModel({
				'id': request.body.organizationManagerBasicInformation.id || uuid.v4().toString(),
				'parent_id': request.body.organizationManagerBasicInformation.parent,
				'name': request.body.organizationManagerBasicInformation.name,
				'tenant_type': request.body.organizationManagerBasicInformation.tenantType,
				'created_on': request.body.organizationManagerBasicInformation.createdOn
			})
			.save(null, { 'method':'insert' })
			.then(function(savedDepartment) {
				response.status(200).json({ 'organizationManagerBasicInformation': { 'id': savedDepartment.get('id') } });
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

		this.$router.delete('/organizationManagerBasicInformation/:tenantId', function(request, response, next) {
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

		this.$router.post('/organizationManagerBusinessPartners', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$BusinessPartnerModel({
				'id': request.body.organizationManagerBusinessPartner.id,
				'tenant_id': request.body.organizationManagerBusinessPartner.tenantId,
				'partner_id': request.body.organizationManagerBusinessPartner.partnerId
			})
			.save()
			.then(function(savedRel) {
				response.status(200).json({
					'organizationManagerBusinessPartners': { 'id': savedRel.get('id') }
				});
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

		this.$router.delete('/organizationManagerBusinessPartners/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');
			response.status(200).json({});
		});
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
