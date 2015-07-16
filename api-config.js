/*
 * Name			: api-config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server application-level configuration parameters
 *
 */

"use strict";

exports.development = ({
	'loadFactor': 0.25,
	'restart': false,

	'repl': {
		'prompt': ''
	},

	'corsAllowedDomains': [
		'http://local-portal.twyrframework.com:8080'
	],

	'utilities': {
		'path': './api_modules/utilities'
	},

	'services': {
		'path': './api_modules/services'
	},

	'components': {
		'path': './api_modules/components'
	},

	'protocol': 'http',
	'port': 9001,

	'favicon': './public/favicon.ico',
	'poweredBy': 'Twyr API Server',
	
	'browser': {
		'cacheTime': 86400
	},

	'cookieParser': {
		'path': '/',
		'domain': '.twyrframework.com',
		'secure': false,
		'httpOnly': false
	},

	'session': {
		'key': 'twyr-portal',
		'secret': 'Th1s!sTheTwyrP0rta1Framew0rk',
		'ttl': 86400,
		'store': {
			'media': 'redis',
			'prefix': 'twyr!portal!session!'
		}
	},
	
	'ssl': {
		'key': './ssl/portal.key',
		'cert': './ssl/portal.crt',
		'rejectUnauthorized': false
	},

	'maxRequestSize': 1e6,
	'requestTimeout': 25,
	'connectionTimeout': 30,

	'router': './framework-router',
	'publicDir': './public',
	'componentMountPath': '/',

	'templateDir': './public',
	'templateEngine': 'ejs',

	'title': 'Twyr API Server Framework: Data for a node.js Enterprise Application'
});

exports.test = ({
	'loadFactor': 0.5,
	'restart': false,

	'repl': {
		'controlPort': 1137,
		'controlHost': '127.0.0.1',
		'parameters': {
			'prompt': 'Twy\'r API Server >',
			'terminal': true,
			'useGlobal': false,

			'input': null,
			'output': null
		}
	},

	'corsAllowedDomains': [
		'http://twyr-portal-test.twyrframework.com'
	],

	'utilities': {
		'path': './api_modules/utilities'
	},

	'services': {
		'path': './api_modules/services'
	},

	'components': {
		'path': './api_modules/components'
	},

	'protocol': 'http',
	'port': 9001,

	'favicon': './public/favicon.ico',
	'poweredBy': 'Twyr Portal',
	
	'browser': {
		'cacheTime': 86400
	},
	
	'cookieParser': {
		'path': '/',
		'domain': '.twyrframework.com',
		'secure': true,
		'httpOnly': false
	},

	'session': {
		'key': 'twyr-portal',
		'secret': 'Th1s!sTheTwyrP0rta1Framew0rk',
		'ttl': 86400,
		'store': {
			'media': 'redis',
			'prefix': 'twyr!portal!session!'
		}
	},
	
	'ssl': {
		'key': './ssl/portal.key',
		'cert': './ssl/portal.crt',
		'rejectUnauthorized': false
	},

	'maxRequestSize': 1e6,
	'requestTimeout': 25,
	'connectionTimeout': 30,

	'router': './framework-router',
	'publicDir': './public',
	'componentMountPath': '/',

	'templateDir': './public/templates',
	'templateEngine': 'ejs',

	'title': 'Twyr API Server Framework: Scaffolding for a node.js Enterprise Application'
});

exports.stage = ({
	'loadFactor': 0.75,
	'restart': true,

	'repl': {
		'controlPort': 1137,
		'controlHost': '127.0.0.1',
		'parameters': {
			'prompt': 'Twy\'r API Server >',
			'terminal': true,
			'useGlobal': false,

			'input': null,
			'output': null
		}
	},

	'corsAllowedDomains': [
		'https://twyr-portal-stage.twyrframework.com'
	],

	'utilities': {
		'path': './api_modules/utilities'
	},

	'services': {
		'path': './api_modules/services'
	},

	'components': {
		'path': './api_modules/components'
	},

	'protocol': 'http',
	'port': 80,

	'favicon': './public/favicon.ico',
	'poweredBy': 'Twyr Portal',
	
	'browser': {
		'cacheTime': 86400
	},
	
	'cookieParser': {
		'path': '/',
		'domain': '.twyrframework.com',
		'secure': true,
		'httpOnly': false
	},

	'session': {
		'key': 'twyr-portal',
		'secret': 'Th1s!sTheTwyrP0rta1Framew0rk',
		'ttl': 86400,
		'store': {
			'media': 'redis',
			'prefix': 'twyr!portal!session!'
		}
	},
	
	'ssl': {
		'key': './ssl/portal.key',
		'cert': './ssl/portal.crt',
		'rejectUnauthorized': false
	},

	'maxRequestSize': 1e6,
	'requestTimeout': 25,
	'connectionTimeout': 30,

	'router': './framework-router',
	'publicDir': './public',
	'componentMountPath': '/',

	'templateDir': './public/templates',
	'templateEngine': 'ejs',

	'title': 'Twyr API Server Framework: Scaffolding for a node.js Enterprise Application'
});

exports.production = ({
	'loadFactor': 1.0,
	'restart': true,

	'repl': {
		'controlPort': 1137,
		'controlHost': '0.0.0.0',
		'parameters': {
			'prompt': 'Twy\'r API Server >',
			'terminal': true,
			'useGlobal': false,

			'input': null,
			'output': null
		}
	},

	'corsAllowedDomains': [
		'https://twyr-portal.twyrframework.com'
	],

	'utilities': {
		'path': './api_modules/utilities'
	},

	'services': {
		'path': './api_modules/services'
	},

	'components': {
		'path': './api_modules/components'
	},

	'protocol': 'http',
	'port': 80,

	'favicon': './public/favicon.ico',
	'poweredBy': 'Twyr Portal',
	
	'browser': {
		'cacheTime': 86400
	},
	
	'cookieParser': {
		'path': '/',
		'domain': '.twyrframework.com',
		'secure': true,
		'httpOnly': false
	},

	'session': {
		'key': 'twyr-portal',
		'secret': 'Th1s!sTheTwyrP0rta1Framew0rk',
		'ttl': 86400,
		'store': {
			'media': 'redis',
			'prefix': 'twyr!portal!session!'
		}
	},
	
	'ssl': {
		'key': './ssl/portal.key',
		'cert': './ssl/portal.crt',
		'rejectUnauthorized': false
	},

	'maxRequestSize': 1e6,
	'requestTimeout': 25,
	'connectionTimeout': 30,

	'router': './framework-router',
	'publicDir': './public',
	'componentMountPath': '/',

	'templateDir': './public/templates',
	'templateEngine': 'ejs',

	'title': 'Twyr API Server Framework: Scaffolding for a node.js Enterprise Application'
});

