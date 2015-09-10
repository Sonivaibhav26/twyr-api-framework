/// <reference path="./../../../typings/node/node.d.ts"/>
/*
 * Name			: api_modules/components/profiles/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Profile Manager Component
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
	inflection = require('inflection'),
	path = require('path'),
	uuid = require('node-uuid'),
	validator = require('validatorjs');

var profilesComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'start': function(dependencies, callback) {
		var self = this;

		profilesComponent.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var database = self.$dependencies.databaseService;

			Object.defineProperty(self, '$UserModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'users',
					'idAttribute': 'id'
				})
			});

			Object.defineProperty(self, '$UserSocialLoginModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'user_social_logins',
					'idAttribute': 'id'
				})
			});

			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.post('/changePassword', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserModel({ 'id': request.user.id }).fetch()
			.then(function(userRecord) {
				if(request.body.newPassword1 != request.body.newPassword2) {
					throw({ 'code': 403, 'message': 'The new passwords do not match' });
					return;
				}

				if(!bcrypt.compareSync(request.body.currentPassword, userRecord.get('password'))) {
					throw({ 'code': 403, 'message': 'Incorrect current password' });

					return;
				}

				userRecord.set('password', bcrypt.hashSync(request.body.newPassword1));
				return userRecord.save();
			})
			.then(function() {
				response.status(200).json({
					'status': true,
					'responseText': 'Change Password Successful! Please check your email for details'
				});
			})
			.catch(function(err) {
				response.status(err.code || err.number || 500).json({
					'status': false,
					'responseText': err.message || err.detail || 'Change Password Failure!'
				});

				throw err;
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.resetPasswordPath;
				notificationOptions.data = JSON.stringify({
					'username': request.user.email,
					'password': request.body.newPassword1
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

		this.$router.post('/unlink/:socialNetwork', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			self.$dependencies.cacheService.getAsync('twyr!portal!user!' + request.user.id)
			.then(function(cachedData) {
				cachedData = JSON.parse(cachedData);
				delete cachedData.social[request.params.socialNetwork];

				var cacheMulti = promises.promisifyAll(self.$dependencies.cacheService.multi());
				cacheMulti.setAsync('twyr!portal!user!' + request.user.id, JSON.stringify(cachedData));
				cacheMulti.expireAsync('twyr!portal!user!' + request.user.id, self.$module.$config.session.ttl);

				return cacheMulti.execAsync();
			})
			.then(function() {
				return self.$UserSocialLoginModel
					.where({ 'user_id': request.user.id, 'provider': request.params.socialNetwork })
					.destroy();
			})
			.then(function() {
				response.status(200).send({
					'status': true,
					'responseText': 'Your ' + request.params.socialNetwork + ' account has been de-linked'
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(err.number || err.code || 500).send({
					'status': false,
					'responseText': err.message || 'Error unlinking your account'
				});
			});
		});

		this.$router.get('/:profileId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserModel({ 'id': request.params.profileId }).fetch()
			.then(function(userRecord) {
				if(!userRecord) {
					throw({
						'number': 404,
						'message': 'Unknown User Id. Please check your request and try again'
					});

					return;
				}

				userRecord = userRecord.toJSON();
				delete userRecord.password;

				var responseData = {};
				Object.keys(userRecord).forEach(function(key) {
					responseData[inflection.camelize(key, true)] = userRecord[key];
				});

				response.status(200).json({'profile': responseData});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(err.code || err.number || 500).json({
					'status': false,
					'responseText': err.message || err.detail || 'Cannot retrieve profile information'
				});
			});
		});

		this.$router.put('/:profileId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			new self.$UserModel({ 'id': request.user.id })
			.fetch()
			.then(function(userRecord) {
				if(!userRecord) {
					throw({
						'number': 404,
						'message': 'Unknown User Id. Please check your request and try again'
					});

					return;
				}

				var updatedData = request.body.profile;
				Object.keys(updatedData).forEach(function(key) {
					self.$dependencies.logger.debug('userRecord.set(' + inflection.underscore(key) + ', ' + ((updatedData[key] !== undefined) ? updatedData[key] : null) + ')');
					userRecord.set(inflection.underscore(key), ((updatedData[key] !== undefined) ? updatedData[key] : null));
				});

				return userRecord.save();
			})
			.then(function(savedRecord) {
				response.status(200).json({ 'profiles': { 'id': savedRecord.get('id') } });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot update profile information']
					}
				});
			});
		});

		this.$router.delete('/:profileId', function(request, response, next) {
			self.$dependencies.logger.silly('Servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
			response.type('application/javascript');

			self.$dependencies.eventService.emit('logout', request.user.id);
			self.$dependencies.cacheService.delAsync('twyr!portal!user!' + request.user.id)
			.then(function() {
				request.logout();
				return new self.$UserModel({ 'id': request.params.profileId }).destroy();
			})
			.then(function() {
				response.status(200).json({});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);

				response.status(422).json({
					'errors': {
						'id': [err.message || err.detail || 'Cannot delete profile information']
					}
				});
			});
		});
	},

	'name': 'profiles',
	'dependencies': ['logger', 'authService', 'cacheService', 'databaseService', 'eventService']
});

exports.component = profilesComponent;
