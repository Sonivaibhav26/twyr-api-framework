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
	path = require('path'),
	uuid = require('node-uuid'),
	validator = require('validatorjs');

var profilesComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
		this._loadConfig(path.join(__dirname, 'config.js'));
	},

	'_addRoutes': function() {
		var self = this;

		// Setup the models, if it hasn't been init-ed yet
		if(!this.User) {
			this.User = self.$dependencies.databaseService.Model.extend({
				'tableName': 'users',
				'idAttribute': 'id'
			});
		}

		if(!this.UserSocialLogins) {
			this.UserSocialLogins = self.$dependencies.databaseService.Model.extend({
				'tableName': 'user_social_logins',
				'idAttribute': 'id'
			});
		}

		this.$router.post('/dologin', function(request, response, next) {
			self.$dependencies.logger.silly('Login Component /dologin invocation with request data: ', request.body.username);
			response.type('application/javascript');

			(self.$dependencies.authService.authenticate('twyr-local', function(err, user, info) {
				if(err) {
					self.$dependencies.logger.error('Login Component /dologin error: ', err, '\nRequest: ', request.body.username);
					response.status(403).json({
						'status': request.isAuthenticated(),
						'responseText': err.message
					});

					return;
				}
				
				if(!user) {
					self.$dependencies.logger.error('\nLogin Component /dologin: User not found!\nRequest: ', request.body.username);
					response.status(404).json({
						'status': request.isAuthenticated(),
						'responseText': 'Invalid credentials! Please try again!'
					});
					return;
				}
				
				request.login(user, function(err) {
					if(err) {
						self.$dependencies.logger.error('\nLogin Component /dologin: request.login error: ', err, '\nRequest: ', request.body.username);
						response.status(500).json({
							'status': request.isAuthenticated(),
							'responseText': 'Internal Error! Please contact us to resolve this issue!!'
						});

						return;
					}

					// Tell the rest of the portal that a new login has happened
					self.$dependencies.logger.debug('Logged in: ', request.user.first_name + ' ' + request.user.last_name);
					self.$dependencies.eventService.emit('login', user.id);

					// Acknowledge the request back to the requester
					response.status(200).json({
						'status': request.isAuthenticated(),
						'responseText': 'Login Successful! Redirecting...'
					});
				});
			}))(request, response, next);
		});

		this.$router.get('/facebook', this._socialLoginRequest.bind(this, 'twyr-facebook'));
		this.$router.get('/github', this._socialLoginRequest.bind(this, 'twyr-github'));
		this.$router.get('/google', this._socialLoginRequest.bind(this, 'twyr-google'));
		this.$router.get('/linkedin', this._socialLoginRequest.bind(this, 'twyr-linkedin'));
		this.$router.get('/twitter', this._socialLoginRequest.bind(this, 'twyr-twitter'));

		this.$router.get('/facebookcallback', this._socialLoginResponse.bind(this, 'twyr-facebook'));
		this.$router.get('/githubcallback', this._socialLoginResponse.bind(this, 'twyr-github'));
		this.$router.get('/googlecallback', this._socialLoginResponse.bind(this, 'twyr-google'));
		this.$router.get('/linkedincallback', this._socialLoginResponse.bind(this, 'twyr-linkedin'));
		this.$router.get('/twittercallback', this._socialLoginResponse.bind(this, 'twyr-twitter'));

		this.$router.get('/dologout', function(request, response, next) {
			var userName = request.user.first_name + ' ' + request.user.last_name;

			self.$dependencies.logger.debug('Logging out: ' + userName);
			self.$dependencies.eventService.emit('logout', request.user.id);

			response.type('application/javascript');
			self.$dependencies.cacheService.delAsync('twyr!portal!user!' + request.user.id)
			.then(function() {
				request.logout();
				response.status(200).send({ 'status': !request.isAuthenticated() });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error logging out: ' + userName + '\nError: ', err);
				response.status(err.code || err.number || 500).send(err);
			});
		});

		this.$router.post('/resetPassword', function(request, response, next) {
			var dbUserRecord = null,
				newPassword = null;

			new self.User({ 'email': request.body.username }).fetch()
			.then(function(userRecord) {
				if(!userRecord) {
					throw ({
						'number': 404,
						'message': 'User "' + request.body.username + '" not found!'
					});
				}

				dbUserRecord = userRecord;

				var randomRequestData = JSON.parse(JSON.stringify(self.$config.randomServer.options));
				randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
				randomRequestData.data = JSON.stringify(randomRequestData.data);

				return self.$module.$utilities.restCall(self.$config.randomServer.protocol, randomRequestData);
			})
			.then(function(randomData) {
				randomData = JSON.parse(randomData);

				newPassword = randomData.result.random.data[0];
				dbUserRecord.set('password', bcrypt.hashSync(newPassword));

				return dbUserRecord.save();
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.resetPasswordPath;
				notificationOptions.data = JSON.stringify({
					'username': request.body.username,
					'password': newPassword
				});

				return self.$module.$utilities.restCall(self.$config.notificationServer.protocol, notificationOptions);
			})
			.then(function(notificationResponse) {
				self.$dependencies.logger.debug('Response from Notificaton Server: ', notificationResponse);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error resetting password for user: ', request.body.username, '\nError: ', err);
			})
			.finally(function() {
				response.status(200).send({
					'status': true,
					'responseText': 'Reset Password Successful! Please check your email for details'
				});
			});
		});

		this.$router.post('/registerAccount', function(request, response, next) {
			response.type('application/javascript');

			var newPassword = '';
			new self.User({ 'email': request.body.username }).fetch()
			.then(function(userRecord) {
				if(userRecord) {
					throw({
						'number': 403,
						'message': 'Username already exists! Please try with a different email id'
					});
				}

				var validationData = {
						'username': (request.body.username && (request.body.username.trim() == '')) ? '' : request.body.username,
						'firstname': (request.body.firstname && (request.body.firstname.trim() == '')) ? '' : request.body.firstname,
						'lastname': (request.body.lastname && (request.body.lastname.trim() == '')) ? '' : request.body.lastname
					},
					validationRules = {
						'username': 'required|email',
						'firstname': 'required',
						'lastname': 'required'
					};

				var validationResult = validator.make(validationData, validationRules);
				if(validationResult.fails()) {
					throw validationResult.errors.all();
					return;
				}

				return emailExists.checkAsync(validationData.username);
			})
			.then(function(emailExists) {
				if(!emailExists) {
					throw { 'code': 403, 'message': 'Invalid Email Id (' + ((request.body.username && (request.body.username.trim() == '')) ? '' : request.body.username) + ')' };
					return;
				}

				var randomRequestData = JSON.parse(JSON.stringify(self.$config.randomServer.options));
				randomRequestData.data.id = uuid.v4().toString().replace(/-/g, '');
				randomRequestData.data = JSON.stringify(randomRequestData.data);

				return self.$module.$utilities.restCall(self.$config.randomServer.protocol, randomRequestData);
			})
			.then(function(randomPassword) {
				randomPassword = (randomPassword ? JSON.parse(randomPassword) : null);
				newPassword = (randomPassword ? randomPassword.result.random.data[0] : null);

				return new self.User({
					'salutation': (request.body.salutation && (request.body.salutation.trim() == '')) ? null : request.body.salutation,
					'first_name': (request.body.firstname && (request.body.firstname.trim() == '')) ? null : request.body.firstname,
					'middle_names': (request.body.middlenames && (request.body.middlenames.trim() == '')) ? null : request.body.middlenames,
					'last_name': (request.body.lastname && (request.body.lastname.trim() == '')) ? null : request.body.lastname,
					'suffix': (request.body.suffix && (request.body.suffix.trim() == '')) ? null : request.body.suffix,
					'email': (request.body.username && (request.body.username.trim() == '')) ? null : request.body.username,
					'password': bcrypt.hashSync(newPassword)
				}).save();
			})
			.then(function() {
				response.status(200).json({
					'status': true,
					'responseText': 'Account registration successful! Please check your email for details'
				});
			})
			.catch(function(err) {
				response.status(err.number || err.code || 403).json({
					'status': false,
					'responseText': err.message
				});

				throw err;
			})
			.then(function() {
				var notificationOptions = JSON.parse(JSON.stringify(self.$config.notificationServer.options));
				notificationOptions.path = self.$config.notificationServer.newAccountPath;
				notificationOptions.data = JSON.stringify({
					'username': request.body.username,
					'password': newPassword
				});

				return self.$module.$utilities.restCall(self.$config.notificationServer.protocol, notificationOptions);
			})
			.then(function(notificationResponse) {
				self.$dependencies.logger.debug('Response from Notificaton Server: ', notificationResponse);
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error registering account for user: ', request.body.username, '\nError: ', err);
			});
		});

		this.$router.post('/unlink/:socialNetwork', function(request, response, next) {
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
				return self.UserSocialLogins
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
				self.$dependencies.logger.error('Error unlinking: ', request.params.socialNetwork, ' account for user: ', request.user.id,'\nError: ', err);

				response.status(err.number || err.code || 403).send({
					'status': false,
					'responseText': err.message
				});
			});
		});

		this.$router.get('/:profileId', function(request, response, next) {
			new self.User({ 'id': request.params.profileId }).fetch()
			.then(function(userRecord) {
				if(!userRecord) {
					throw({
						'number': 404,
						'message': 'Unknown User Id. Please check your request and try again'
					});
					return;
				}

				userRecord = userRecord.toJSON();
				var responseData = {
					'id': userRecord.id,
					'salutation': userRecord.salutation,
					'firstname': userRecord.first_name,
					'middlenames': userRecord.middle_names,
					'lastname': userRecord.last_name,
					'suffix': userRecord.suffix,
					'username': userRecord.email,
					'password1': '',
					'password2': '',
					'createdon': userRecord.created_on
				};

				response.status(200).json({ 'profiles': responseData });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error retrieving profile data for user: ', request.params.profileId, '\nError: ', err);

				response.status(422).send({
					'errors': {
						'firstname': [err.message || err.detail]
					}
				});
			});
		});

		this.$router.put('/:profileId', function(request, response, next) {
			new self.User({ 'id': request.params.profileId }).fetch()
			.then(function(userRecord) {
				if(!userRecord) {
					throw({
						'number': 404,
						'message': 'Unknown User Id. Please check your request and try again'
					});
					return;
				}

				var updatedData = request.body.profile;
				userRecord.set('salutation', !updatedData.salutation ? null : updatedData.salutation.trim());
				userRecord.set('first_name', !updatedData.firstname ? null : updatedData.firstname.trim());
				userRecord.set('middle_names', !updatedData.middlenames ? null : updatedData.middlenames.trim());
				userRecord.set('last_name', !updatedData.lastname ? null : updatedData.lastname.trim());
				userRecord.set('suffix', !updatedData.suffix ? null : updatedData.suffix.trim());

				if(!!updatedData.password1 && (updatedData.password1 == updatedData.password2)) {
					userRecord.set('password', bcrypt.hashSync(updatedData.password1));
				}

				return userRecord.save();
			})
			.then(function() {
				response.status(200).json({ 'profiles': { 'id': request.params.profileId } });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error updating profile data for user: ', request.params.profileId, '\nError: ', err);

				response.status(422).send({
					'errors': {
						'firstname': [err.message || err.detail]
					}
				});
			});
		});
	},

	'_socialLoginRequest': function(strategy, request, response, next) {
		var self = this,
			whichAuth = '';

		if(!request.user)
			whichAuth = 'authenticate';
		else
			whichAuth = 'authorize';

		(this.$dependencies.authService[whichAuth](strategy, { 'state': request.query.currentLocation }, function(err, user, info) {
			if(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.url + '":\nStrategy: ', strategy,'\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.redirect('/error');
			}
			else {
				self.$dependencies.logger.debug('Servicing request "' + request.url + '":\nStrategy: ', strategy,'\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
				response.redirect(request.query.currentLocation);
			}
		}))(request, response, next);
	},

	'_socialLoginResponse': function(strategy, request, response, next) {
		var self = this,
			whichAuth = '';

		if(!request.user)
			whichAuth = 'authenticate';
		else
			whichAuth = 'authorize';


		(self.$dependencies.authService[whichAuth](strategy, function(err, user, info) {
			if(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.url + '":\nStrategy: ', strategy,'\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.redirect('/error');
				return;
			}

			request.login(user, function(error) {
				if(error) {
					self.$dependencies.logger.error('Error servicing request "' + request.url + '":\nStrategy: ', strategy,'\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', error);
					response.redirect('/error');
				}
				else {
					self.$dependencies.logger.debug('Servicing request "' + request.url + '":\nStrategy: ', strategy,'\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params);
					self.$dependencies.eventService.emit('login', user.id);

					response.redirect(request.query.state);
				}
			});
		}))(request, response, next);
	},

	'name': 'profiles',
	'dependencies': ['logger', 'authService', 'cacheService', 'databaseService', 'eventService'],

	'User': null,
	'UserSocialLogins': null
});

exports.component = profilesComponent;
