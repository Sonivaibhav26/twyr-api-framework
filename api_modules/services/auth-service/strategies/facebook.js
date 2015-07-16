/*
 * Name			: api_modules/services/auth-service/strategies/facebook.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service Facebook Integration
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var facebookStrategy = require('passport-facebook').Strategy,
	persistUser = require('./persist-user');

var socialAuthenticate = null,
	socialAuthorize = null;

exports.strategy = (function() {
	var self = this;

	socialAuthenticate = persistUser.socialAuthenticate.bind(self);
	socialAuthorize = persistUser.socialAuthorize.bind(self);

	self.$passport.use('twyr-facebook', new facebookStrategy({
		'clientID': self.$config.strategies.facebook.applicationID,
		'clientSecret': self.$config.strategies.facebook.applicationSecret,
		'callbackURL': self.$config.strategies.facebook.callbackUrl,
		'passReqToCallback': true
	},
	function(request, token, refreshToken, profile, done) {
		if(!request.user) {
			socialAuthenticate(request, profile, token, done);
		}
		else {
			socialAuthorize(request, profile, token, done);
		}
	}));
});
