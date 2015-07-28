/*
 * Name			: api_modules/components/login/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Login Component
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
	path = require('path'),
	uuid = require('node-uuid');

var loginComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.post('/dologin', function(request, response, next) {
			self.$dependencies.logger.silly('Login Component /dologin invocation with request data: ', request.body.username);

			(self.$dependencies.authService.authenticate('twyr-local', function(err, user, info) {
				if(err) {
					self.$dependencies.logger.error('Login Component /dologin error: ', err, '\nRequest: ', request.body.username);
					response.status(200).send({
						'status': request.isAuthenticated(),
						'responseText': err.message
					});

					return;
				}
				
				if(!user) {
					self.$dependencies.logger.error('\nLogin Component /dologin: User not found!\nRequest: ', request.body.username);
					response.status(200).send({
						'status': request.isAuthenticated(),
						'responseText': 'Invalid credentials! Please try again!'
					});
					return;
				}
				
				request.login(user, function(err) {
					if(err) {
						self.$dependencies.logger.error('\nLogin Component /dologin: request.login error: ', err, '\nRequest: ', request.body.username);
						response.status(200).send({
							'status': request.isAuthenticated(),
							'responseText': 'Internal Error! Please contact us to resolve this issue!!'
						});

						return;
					}

					// Tell the rest of the portal that a new login has happened
					self.$dependencies.logger.debug('Logged in: ', request.user.first_name + ' ' + request.user.last_name);
					self.$dependencies.eventService.emit('login', user.id);

					// Acknowledge the request back to the requester
					response.type('application/javascript');
					response.status(200).send({
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
			self.$dependencies.logger.debug('Logging out: ', request.user.first_name + ' ' + request.user.last_name);
			self.$dependencies.eventService.emit('logout', request.user.id);

			request.logout();
			response.status(200).send({ 'status': !request.isAuthenticated() });
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

	'name': 'login',
	'dependencies': ['logger', 'authService', 'cacheService', 'databaseService', 'eventService']
});

exports.component = loginComponent;
