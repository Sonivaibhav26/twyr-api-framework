/*
 * Name			: portal_modules/components/organization-manager/sub-components/locations/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r Portal Organization Manager Locations Sub-component
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

var organizationManagerLocationsComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;

		organizationManagerLocationsComponent.parent.start.call(self, dependencies, function(err, status) {
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
						return this.hasMany(self.$TenantAddressModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$TenantAddressModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenant_addresses',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'address': function() {
						return this.belongsTo(self.$AddressModel, 'user_id');
					}
				})
			});

			Object.defineProperty(self, '$AddressModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'addresses',
					'idAttribute': 'id',

					'tenants': function() {
						return this.hasMany(self.$TenantAddressModel, 'user_id');
					}
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/organizationManagerTenantLocations', function(request, response, next) {
			self.$dependencies.logger.debug('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.query.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantAddressModel()
				.where('tenant_id', '=', request.query.tenant)
				.fetchAll();
			})
			.then(function(tenantLocations) {
				tenantLocations = self._camelize(tenantLocations.toJSON());

				var responseData = [];
				for(var idx in tenantLocations) {
					var thisTenantLocation = tenantLocations[idx];
					responseData.push({
						'id': thisTenantLocation.id,
						'name': thisTenantLocation.name,
						'tenant': thisTenantLocation.tenantId,
						'location': thisTenantLocation.addressId,
						'createdOn': thisTenantLocation.createdOn
					});
				}

				response.status(200).json({
					'organizationManagerTenantLocations': responseData
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

		this.$router.post('/organizationManagerTenantLocations', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManagerTenantLocation.tenant)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantAddressModel()
				.save({
					'id': request.body.organizationManagerTenantLocation.id,
					'name': request.body.organizationManagerTenantLocation.name,
					'tenant_id': request.body.organizationManagerTenantLocation.tenant,
					'address_id': request.body.organizationManagerTenantLocation.location,
					'created_on': request.body.organizationManagerTenantLocation.createdOn
				}, {
					'method': 'insert'
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManagerTenantLocation': {
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

		this.$router.get('/organizationManagerTenantLocations/:tenantLocationId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var tenantLocation = null;

			new self.$TenantAddressModel({ 'id': request.params.tenantLocationId })
			.fetch()
			.then(function(tenantLocationRecord) {
				tenantLocation = self._camelize(tenantLocationRecord.toJSON());
				return self._checkPermissionAsync(request, requiredPermission, tenantLocation.tenantId);
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				response.status(200).json({
					'organizationManagerTenantLocation': {
						'id': tenantLocation.id,
						'tenant': tenantLocation.tenantId,
						'location': tenantLocation.addressId,
						'createdOn': tenantLocation.createdOn
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

		this.$router.delete('/organizationManagerTenantLocations/:tenantLocationId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$TenantAddressModel({ 'id': request.params.tenantLocationId })
			.fetch()
			.then(function(tenantLocationRecord) {
				return self._checkPermissionAsync(request, requiredPermission, tenantLocationRecord.get('tenant_id'));
			})
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantAddressModel({ 'id': request.params.tenantLocationId }).destroy();
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

		this.$router.post('/organizationManagerLocations', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$AddressModel({ 'latitude': request.body.organizationManagerLocation.latitude, 'longitude': request.body.organizationManagerLocation.longitude })
			.fetch()
			.then(function(existingAddress) {
				if(existingAddress) {
					return existingAddress;
				}

				return new self.$AddressModel()
				.save({
					'route': request.body.organizationManagerLocation.route,
					'area': request.body.organizationManagerLocation.area,
					'city': request.body.organizationManagerLocation.city,
					'postal_code': request.body.organizationManagerLocation.postalCode,
					'state': request.body.organizationManagerLocation.state,
					'country': request.body.organizationManagerLocation.country,
					'latitude': request.body.organizationManagerLocation.latitude,
					'longitude': request.body.organizationManagerLocation.longitude,
					'created_on': request.body.organizationManagerLocation.createdOn
				}, {
					'method': 'insert'
				});
			})
			.then(function(locationRecord) {
				response.status(200).json({
					'organizationManagerLocation': {
						'id': locationRecord.get('id')
					}
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
			});
		});

		this.$router.get('/organizationManagerLocations/:locationId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$AddressModel({ 'id': request.params.locationId })
			.fetch()
			.then(function(locationRecord) {
				locationRecord = self._camelize(locationRecord.toJSON());
				response.status(200).json({
					'organizationManagerLocation': locationRecord
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

	'name': 'organization-manager-locations',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerLocationsComponent;
