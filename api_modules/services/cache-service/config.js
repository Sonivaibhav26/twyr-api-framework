/*
 * Name			: api_modules/services/cache-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Cache Service Config
 *
 */

"use strict";

exports.development = ({
	'port': 6379,
	'host': '127.0.0.1',
	
	'options': {
		'retry_max_delay': 500,
		'max_attempts': 5,
		'parser': 'hiredis'
	}
});

exports.test = ({
	'port': 6379,
	'host': '127.0.0.1',
	
	'options': {
		'retry_max_delay': 500,
		'max_attempts': 5,
		'parser': 'hiredis'
	}
});

exports.stage = ({
	'port': 6379,
	'host': '127.0.0.1',
	
	'options': {
		'retry_max_delay': 500,
		'max_attempts': 5,
		'parser': 'hiredis'
	}
});

exports.production = ({
	'port': 6379,
	'host': '127.0.0.1',
	
	'options': {
		'retry_max_delay': 500,
		'max_attempts': 5,
		'parser': 'hiredis'
	}
});
