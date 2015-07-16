/*
 * Name			: portal_modules/services/auth-service/strategies/google.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r Portal Authentication Service Google+ Integration
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var googleStrategy = require('passport-google-oauth').OAuth2Strategy,
	persistUser = require('./persist-user');

var socialAuthenticate = null,
	socialAuthorize = null;

exports.strategy = (function() {
	var self = this;

	socialAuthenticate = persistUser.socialAuthenticate.bind(self);
	socialAuthorize = persistUser.socialAuthorize.bind(self);

	self.$passport.use('twyr-google', new googleStrategy({
		'clientID': self.$config.strategies.google.applicationID,
		'clientSecret': self.$config.strategies.google.applicationSecret,
		'callbackURL': self.$config.strategies.google.callbackUrl,
		'scope': ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
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
