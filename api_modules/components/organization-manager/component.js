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

					'users': function() {
						return this.hasMany(self.$UserTenantModel, 'tenant_id');
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

			new self.$UserTenantModel()
			.query('where', 'user_id', '=', request.user.id)
			.fetchAll()
			.then(function(userTenants) {
				userTenants = self._camelize(userTenants.toJSON());

				var promiseResolutions = [];

				if(request.query.id == '#') {
					for(var idx in userTenants) {
						promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, userTenants[idx].tenantId));
					}
				}
				else {
					promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, request.query.id));
				}

				promiseResolutions.push(userTenants);
				return promises.all(promiseResolutions);
			})
			.then(function(authorizations) {
				var promiseResolutions = [],
					userTenants = authorizations.pop();

				if(request.query.id == '#') {
					for(var idx in userTenants) {
						if(!authorizations[idx])
							continue;

						promiseResolutions.push(new self.$TenantModel({ 'id': userTenants[idx].tenantId }).fetch({ 'withRelated': ['suborganizations'] }));
					}
				}
				else {
					if(authorizations[0]) {
						promiseResolutions.push(new self.$TenantModel({ 'id': request.query.id }).fetch({ 'withRelated': ['suborganizations'] }));
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

				for(var idx in tenants) {
					var tenant = self._camelize((tenants[idx]).toJSON()),
						tenantTree = {
							'id': tenant.id,
							'text': tenant.name,
							'children': []
						};

					for(var subIdx in tenant.suborganizations) {
						var thisSubOrg = tenant.suborganizations[subIdx];
						tenantTree.children.push({
							'id': thisSubOrg.id,
							'text': thisSubOrg.name,
							'children': true
						});
					}

					responseData.push(tenantTree);
				}

				response.status(200).json(responseData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.post('/organizationManagers', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.organizationManager.parent)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var newOrganization = new self.$TenantModel({
					'id': request.body.organizationManager.id,
					'name': request.body.organizationManager.name,
					'parent_id': request.body.organizationManager.parent,
					'tenant_type': request.body.organizationManager.tenantType,
					'created_on': request.body.organizationManager.createdOn
				});

				return newOrganization.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManager': {
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

		this.$router.get('/organizationManagers/:tenantId', function(request, response, next) {
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
					'withRelated': ['suborganizations', 'users']
				});
			})
			.then(function(tenant) {
				tenant = self._camelize(tenant.toJSON());

				var promiseResolutions = [];
				if(tenant.parentId) {
					promiseResolutions.push(self._checkPermissionAsync(request, requiredPermission, tenant.parentId));
				}
				else {
					promiseResolutions.push(false);
				}

				promiseResolutions.push(tenant);
				return promises.all(promiseResolutions);
			})
			.then(function(results) {
				var parentPermission = results[0],
					tenant = results[1];

				tenant.parent = (parentPermission ? tenant.parentId : null);
				delete tenant.parentId;

				var suborganizations = [];
				for(var idx in tenant.suborganizations) {
					suborganizations.push(tenant.suborganizations[idx].id);
				}
				tenant.suborganizations = suborganizations;

				var users = [];
				for(var idx in tenant.users) {
					users.push(tenant.users[idx].id);
				}
				tenant.users = users;

				response.status(200).json({
					'organizationManager': tenant
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

		this.$router.put('/organizationManagers/:tenantId', function(request, response, next) {
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
					'name': request.body.organizationManager.name
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'organizationManager': {
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

		this.$router.delete('/organizationManagers/:tenantId', function(request, response, next) {
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

		this.$router.post('/organizationManagerUsers', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var randomRequestData = JSON.parse(JSON.stringify(self.$config.randomServer.options)),
				newPassword = '';

			randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
			randomRequestData.data = JSON.stringify(randomRequestData.data);

			self.$module.$utilities.restCall(self.$config.randomServer.protocol, randomRequestData)
			.then(function(randomData) {
				randomData = JSON.parse(randomData);
				newPassword = randomData.result.random.data[0];

				return new self.$UserModel()
				.save({
					'id': request.body.organizationManagerUser.id,
					'email': request.body.organizationManagerUser.login,
					'password': bcrypt.hashSync(randomData.result.random.data[0]),
					'first_name': request.body.organizationManagerUser.firstName,
					'last_name': request.body.organizationManagerUser.lastName,
					'created_on': request.body.organizationManagerUser.createdOn
				}, {
					'method': 'insert'
				});
			})
			.then(function(userRecord) {
				response.status(200).json({
					'organizationManagerUser': {
						'id': userRecord.get('id')
					}
				});
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.newAccountPath;
				notificationOptions.data = JSON.stringify({
					'username': request.body.organizationManagerUser.login,
					'password': newPassword
				});

				return self.$module.$utilities.restCall(self.$config.notificationServer.protocol, notificationOptions);
			})
			.then(function(notificationResponse) {
				self.$dependencies.logger.debug('Response from Notificaton Server: ', notificationResponse);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
			});
		});

		this.$router.get('/organizationManagerUsers/:userId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserModel({ 'id': request.params.userId })
			.fetch()
			.then(function(userRecord) {
				response.status(200).json({
					'organizationManagerUser': {
						'id': userRecord.get('id'),
						'firstName': userRecord.get('first_name'),
						'middleNames': userRecord.get('middle_names'),
						'lastName': userRecord.get('last_name'),
						'login': userRecord.get('email'),
						'createdOn': userRecord.get('created_on')
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
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
