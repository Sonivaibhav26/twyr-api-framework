/*
 * Name			: framework-router.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Router
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var path = require('path');

var frameworkRouter = (function() {
	// Step 1: Instantiate the Router itself...
	var router = require('express').Router(),
		logger = require('morgan'),
		loggerSrvc = this.$services.logger.getInterface(),
		self = this;

	// Step 2: Setup the logger for the router...
	var loggerStream = {
			'write': function(message, encoding) {
				self.$services.logger.getInterface().silly(message);
			}
		};

	router.use(logger('combined', {
		'stream': loggerStream
	}));
	
	// Step 3: Process the Root ('/') path
	router.all('/*', function(request, response, next) {
		response.status(404).send('URL unknown - please check your request!');
	});

	return router;
});

exports.router = frameworkRouter;
