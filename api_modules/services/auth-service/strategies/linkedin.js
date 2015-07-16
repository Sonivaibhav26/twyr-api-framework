/*
 * Name			: api_modules/services/auth-service/strategies/linkedin.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service LinkedIn Integration
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var linkedinStrategy = require('passport-linkedin-oauth2').Strategy,
	persistUser = require('./persist-user');

var socialAuthenticate = null,
	socialAuthorize = null;

exports.strategy = (function() {
	var self = this;

	socialAuthenticate = persistUser.socialAuthenticate.bind(self);
	socialAuthorize = persistUser.socialAuthorize.bind(self);

	self.$passport.use('twyr-linkedin', new linkedinStrategy({
		'clientID': self.$config.strategies.linkedin.applicationID,
		'clientSecret': self.$config.strategies.linkedin.applicationSecret,
		'callbackURL': self.$config.strategies.linkedin.callbackUrl,
		'scope': ['r_basicprofile', 'r_emailaddress'],
		'state': true,
		'passReqToCallback': true
	},
	function(request, accessToken, refreshToken, profile, done) {
		if(!request.user) {
			socialAuthenticate(request, profile, refreshToken, done);
		}
		else {
			socialAuthorize(request, profile, refreshToken, done);
		}
	}));
});
