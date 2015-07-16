/*
 * Name			: api_modules/services/auth-service/strategies/twitter.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service Twitter Integration
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var twitterStrategy = require('passport-twitter').Strategy,
	persistUser = require('./persist-user');

var socialAuthenticate = null,
	socialAuthorize = null;

exports.strategy = (function() {
	var self = this;

	socialAuthenticate = persistUser.socialAuthenticate.bind(self);
	socialAuthorize = persistUser.socialAuthorize.bind(self);

	self.$passport.use('twyr-twitter', new twitterStrategy({
		'consumerKey': self.$config.strategies.twitter.applicationID,
		'consumerSecret': self.$config.strategies.twitter.applicationSecret,
		'callbackURL': self.$config.strategies.twitter.callbackUrl,
		'passReqToCallback': true
	},
	function(request, token, tokenSecret, profile, done) {
		if(!request.user) {
			socialAuthenticate(request, profile, token, done);
		}
		else {
			socialAuthorize(request, profile, token, done);
		}
	}));
});
