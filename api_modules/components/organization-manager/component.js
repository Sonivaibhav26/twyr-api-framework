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
	uuid = require('node-uuid'),
	validator = require('validatorjs');

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

		this.$router.get('/organization-structure-tree', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
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
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json(err);
			});
		});

		this.$router.post('/organization-managers', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			self._checkPermissionAsync(request, requiredPermission, request.body.data.relationships.parent.data.id)
			.then(function(isAllowed) {
				if(!isAllowed) {
					throw({ 'code': 403, 'message': 'Unauthorized access!' });
					return;
				}

				var newOrganization = new self.$TenantModel({
					'id': request.body.data.id,
					'name': request.body.data.attributes.name,
					'parent_id': request.body.data.relationships.parent.data.id,
					'tenant_type': request.body.data.attributes['tenant-type'],
					'created_on': request.body.data.attributes['created-on']
				});

				return newOrganization.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager'
					}
				});

				return null;
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

		this.$router.get('/organization-managers/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var fullAccess = false;
			self._checkPermissionAsync(request, requiredPermission, request.params.tenantId)
			.then(function(isAllowed) {
				fullAccess = isAllowed;

				return new self.$TenantModel({
					'id': request.params.tenantId
				})
				.fetch({
					'withRelated': ['suborganizations']
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

				var responseData = {
					'data': {
						'id': tenant.id,
						'type': 'organization-managers',
						'attributes': {
							'name': tenant.name,
							'parent': (parentPermission ? tenant.parentId : null),
							'tenant-type': tenant.tenantType,
							'created-on': tenant.createdOn
						},

						'relationships': {
							'suborganizations': {
								'data': []
							}
						}
					}
				};

				if(fullAccess) {
					for(var idx in tenant.suborganizations) {
						responseData.data.relationships.suborganizations.data.push({
							'id': tenant.suborganizations[idx].id,
							'type': 'organization-managers'
						});
					}
				}

				response.status(200).json(responseData);
				return null;
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

		this.$router.patch('/organization-managers/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
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
					'name': request.body.data.attributes.name
				}, {
					'method': 'update',
					'patch': true
				});
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-managers'
					}
				});

				return null;
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

		this.$router.delete('/organization-managers/:tenantId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
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
				response.status(204).json({});
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(403).json({
					'errors': [{
						'source': { 'pointer': 'data/attributes/id' },
						'detail': err.detail || err.message
					}]
				});
			});
		});

		this.$router.post('/organization-manager-users', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			var newPassword = '';
			new self.$UserModel({ 'email': request.body.username }).fetch()
			.then(function(userRecord) {
				if(userRecord) {
					throw({
						'number': 500403,
						'message': 'Username already exists! Please try with a different email id'
					});
				}

				var validationData = {
						'username': (request.body.data.attributes.login && (request.body.data.attributes.login.trim() == '')) ? '' : request.body.data.attributes.login,
						'firstname': (request.body.data.attributes['first-name'] && (request.body.data.attributes['first-name'].trim() == '')) ? '' : request.body.data.attributes['first-name'],
						'lastname': (request.body.data.attributes['last-name'] && (request.body.data.attributes['last-name'].trim() == '')) ? '' : request.body.data.attributes['last-name']
					},
					validationRules = {
						'username': 'required|email',
						'firstname': 'required',
						'lastname': 'required'
					};

				var validationResult = new validator(validationData, validationRules);
				if(validationResult.fails()) {
					throw validationResult.errors.all();
					return;
				}

				return emailExists.checkAsync(validationData.username);
			})
			.then(function(emailExists) {
				if(!emailExists) {
					throw { 'code': 500403, 'message': 'Invalid Email Id (' + ((request.body.data.attributes.login && (request.body.data.attributes.login.trim() == '')) ? '' : request.body.data.attributes.login) + ')' };
					return;
				}

				var randomRequestData = JSON.parse(JSON.stringify(self.$config.randomServer.options));
				randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
				randomRequestData.data = JSON.stringify(randomRequestData.data);

				return self.$module.$utilities.restCall(self.$config.randomServer.protocol, randomRequestData);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error fetching Random Password ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				if(err.code == 500403) throw err;
			})
			.then(function(randomPassword) {
				randomPassword = (randomPassword ? JSON.parse(randomPassword) : null);
				newPassword = (randomPassword ? randomPassword.result.random.data[0] : self._generateRandomPassword());

				return new self.$UserModel({
					'id': request.body.data.id,
					'email': request.body.data.attributes.login,
					'password': bcrypt.hashSync(newPassword),
					'first_name': request.body.data.attributes['first-name'],
					'middle_names': request.body.data.attributes['middle-names'],
					'last_name': request.body.data.attributes['last-name'],
					'created_on': request.body.data.attributes['created-on']
				})
				.save(null, { 'method': 'insert' });
			})
			.then(function(savedRecord) {
				response.status(200).json({
					'data': {
						'id': savedRecord.get('id'),
						'type': 'organization-manager-user'
					}
				});

				return null;
			})
			.catch(function(err) {
				response.status(422).json({
					'errors': [{
						'source': { 'pointer': 'data/attributes/id' },
						'detail': err.detail || err.message
					}]
				});

				throw err;
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.newAccountPath;
				notificationOptions.data = JSON.stringify({
					'username': request.body.data.attributes.login,
					'password': newPassword
				});

				return self.$module.$utilities.restCall(self.$config.notificationServer.protocol, notificationOptions);
			})
			.then(function(notificationResponse) {
				self.$dependencies.logger.debug('Response from Notificaton Server: ', notificationResponse);
				return null;
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
			});
		});

		this.$router.get('/organization-manager-users/:userId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request ' + request.method + ' "' + request.originalUrl + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/json');

			new self.$UserModel({ 'id': request.params.userId })
			.fetch()
			.then(function(user) {
				user = self._camelize(user.toJSON());

				var responseData = {
					'data': {
						'id': user.id,
						'type': 'organization-manager-users',

						'attributes': {
							'login': user.email,
							'first-name': user.firstName,
							'middle-names': user.middleNames,
							'last-name': user.lastName,
							'created-on': user.createdOn
						}
					}
				};

				response.status(200).json(responseData);
				return null;
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

	'_generateRandomPassword': function() {
		return 'xxxxxxxx'.replace(/[x]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	},

	'name': 'organization-manager',
	'dependencies': ['logger', 'databaseService']
});

exports.component = organizationManagerComponent;
