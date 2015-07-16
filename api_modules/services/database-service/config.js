/*
 * Name			: api_modules/services/database-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Database Service Config
 *
 */

"use strict";

exports.development = ({
	'client': 'pg',
	'debug': true,
	
	'connection': {
		'host': '127.0.0.1',
		'port': '5432',
		'user': 'postgres',
		'password': 'drenai1975',
		'database': 'twyr'
	},

	'pool': {
		'min': 2,
		'max': 4
	}
});

exports.test = ({
	'client': 'pg',
	'debug': true,
	
	'connection': {
		'host': '127.0.0.1',
		'port': '5432',
		'user': 'postgres',
		'password': 'twyr',
		'database': 'twyr'
	},

	'pool': {
		'min': 2,
		'max': 4
	}
});

exports.stage = ({
	'client': 'pg',
	
	'connection': {
		'host': '127.0.0.1',
		'port': '5432',
		'user': 'postgres',
		'password': 'twyr',
		'database': 'twyr'
	},

	'pool': {
		'min': 2,
		'max': 4
	}
});

exports.production = ({
	'client': 'pg',
	
	'connection': {
		'host': '127.0.0.1',
		'port': '5432',
		'user': 'postgres',
		'password': 'twyr',
		'database': 'twyr'
	},

	'pool': {
		'min': 2,
		'max': 4
	}
});

