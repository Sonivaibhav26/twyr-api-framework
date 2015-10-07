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

		this.$router.get('/organization-manager-tenant-locations', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
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

				var responseData = { 'data': [] };
				for(var idx in tenantLocations) {
					var thisTenantLocation = tenantLocations[idx];
					responseData.data.push({
						'id': thisTenantLocation.id,
						'type': 'organization-manager-tenant-locations',

						'attributes': {
							'name': thisTenantLocation.name,
							'created-on': thisTenantLocation.createdOn
						},

						'relationships': {
							'tenant': {
								'data': {
									'id': thisTenantLocation.tenantId,
									'type': 'organization-manager'
								}
							},

							'location': {
								'data': {
									'id': thisTenantLocation.addressId,
									'type': 'organization-manager-locations'
								}
							}
						}
					});
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

		this.$router.post('/organization-manager-tenant-locations', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.data.relationships.tenant.data.id)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				return new self.$TenantAddressModel()
				.save({
					'id': request.body.data.id,
					'name': request.body.data.attributes.name,
					'tenant_id': request.body.data.relationships.tenant.data.id,
					'address_id': request.body.data.relationships.location.data.id,
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

		this.$router.delete('/organization-manager-tenant-locations/:tenantLocationId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
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

		this.$router.post('/organization-manager-locations', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$AddressModel({ 'latitude': request.body.data.attributes.latitude, 'longitude': request.body.data.attributes.longitude })
			.fetch()
			.then(function(existingAddress) {
				if(existingAddress) {
					return existingAddress;
				}

				return new self.$AddressModel()
				.save({
					'route': request.body.data.attributes.route,
					'area': request.body.data.attributes.area,
					'city': request.body.data.attributes.city,
					'postal_code': request.body.data.attributes['postal-code'],
					'state': request.body.data.attributes.state,
					'country': request.body.data.attributes.country,
					'latitude': request.body.data.attributes.latitude,
					'longitude': request.body.data.attributes.longitude,
					'created_on': request.body.data.attributes['created-on']
				}, {
					'method': 'insert'
				});
			})
			.then(function(locationRecord) {
				response.status(200).json({
					'data': {
						'id': locationRecord.get('id'),
						'type': request.body.data.type
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

		this.$router.get('/organization-manager-locations/:locationId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$AddressModel({ 'id': request.params.locationId })
			.fetch()
			.then(function(locationRecord) {
				locationRecord = self._camelize(locationRecord.toJSON());
				response.status(200).json({
					'data': {
						'id': locationRecord.id,
						'type': 'organization-manager-locations',
						'attributes': {
							'area': locationRecord.area,
							'city': locationRecord.city,
							'country': locationRecord.country,
							'created-on': locationRecord.createdOn,
							'latitude': locationRecord.latitude,
							'longitude': locationRecord.longitude,
							'postal-code': locationRecord.postalCode,
							'route': locationRecord.route,
							'state': locationRecord.state
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
	},

	'name': 'organization-manager-locations',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerLocationsComponent;
