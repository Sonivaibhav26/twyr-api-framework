/*
 * Name			: api_modules/services/auth-service/strategies/local.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service Local Authentication
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var bcrypt = require('bcrypt-nodejs'),
	localStrategy = require('passport-local').Strategy;

exports.strategy = (function() {
	var self = this,
		auth = self.$passport,
		database = self.$dependencies['databaseService'],
		logger = self.$dependencies['logger'];

	var User = database.Model.extend({
		'tableName': 'users',
		'idAttribute': 'id'
	});

	auth.use('twyr-local', new localStrategy({
		'passReqToCallback': true
	},
	function(request, username, password, done) {
		new User({ 'email': username })
		.fetch()
		.then(function(userRecord) {
			if(!userRecord) {
				throw({'message': 'Invalid Credentials - please try again'});
				return;
			}

			var credentialMatch = bcrypt.compareSync(password, userRecord.get('password'));
			if(credentialMatch) {
				return userRecord;
			}
			else {
				throw({'message': 'Invalid Credentials - please try again'});
				return null;
			}
		})
		.then(function(userRecord) {
			done(null, userRecord.toJSON());

			var lastLogin = (new Date()).toISOString();
			userRecord.set('last_login', lastLogin);
			userRecord.save();

			return null;
		})
		.catch(function(err) {
			logger.error('Error logging in user: ', JSON.stringify(err));
			done(err);
		});
	}));
});

