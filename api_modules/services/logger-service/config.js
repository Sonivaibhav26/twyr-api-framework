/*
 * Name			: api_modules/services/logger-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Logger Service Config
 *
 */

"use strict";

exports.development = ({
	'Console': {
		'level': 'debug',
		'colorize': true,
		'timestamp': true,
		'prettyPrint': true
	},

	'File': {
		'level': 'debug',
		'timestamp': true,
		'filename': 'logs/api-server.log',
		'maxsize': 10485760,
		'maxfiles': 5,
		'json': false
	}
});

exports.test = ({
	'Console': {
		'level': 'debug',
		'colorize': true,
		'timestamp': true,
		'prettyPrint': true
	},

	'File': {
		'level': 'debug',
		'timestamp': true,
		'filename': 'logs/api-server.log',
		'maxsize': 10485760,
		'maxfiles': 5,
		'json': false
	}
});

exports.stage = ({
	'Console': {
		'level': 'warn',
		'colorize': true,
		'timestamp': true,
		'prettyPrint': true
	},

	'File': {
		'level': 'debug',
		'timestamp': true,
		'filename': 'logs/api-server.log',
		'maxsize': 10485760,
		'maxfiles': 5,
		'json': false
	}
});

exports.production = ({
	'Console': {
		'level': 'warn',
		'colorize': true,
		'timestamp': true,
		'prettyPrint': true
	},

	'File': {
		'level': 'debug',
		'timestamp': true,
		'filename': 'logs/api-server.log',
		'maxsize': 10485760,
		'maxfiles': 5,
		'json': false
	}
});
