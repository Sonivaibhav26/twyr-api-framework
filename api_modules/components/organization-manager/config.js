/*
 * Name			: api_modules/components/organization-manager/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Organization Manager Component Config
 *
 */

"use strict";

exports.development = ({
	'randomServer': {
		'protocol': 'https',
		'options': {
			'method': 'POST',
			'host': 'api.random.org',
			'port': 443,
			'path': '/json-rpc/1/invoke',
			'data': {
				'jsonrpc': '2.0',
				'method': 'generateStrings',
				'params': {
					'apiKey': 'e20ac8ec-9748-4736-a61c-d234ac6ac619',
					'n': 1,
					'length': 10,
					'characters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
					'replacement': false
				},
				'id': ''
			}
		}
	},

	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	},

	'components': {
		'path': './sub-components'
	}
});

exports.test = ({
	'randomServer': {
		'protocol': 'https',
		'options': {
			'method': 'POST',
			'host': 'api.random.org',
			'port': 443,
			'path': '/json-rpc/1/invoke',
			'data': {
				'jsonrpc': '2.0',
				'method': 'generateStrings',
				'params': {
					'apiKey': 'e20ac8ec-9748-4736-a61c-d234ac6ac619',
					'n': 1,
					'length': 10,
					'characters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
					'replacement': false
				},
				'id': ''
			}
		}
	},

	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	},

	'components': {
		'path': './sub-components'
	}
});

exports.stage = ({
	'randomServer': {
		'protocol': 'https',
		'options': {
			'method': 'POST',
			'host': 'api.random.org',
			'port': 443,
			'path': '/json-rpc/1/invoke',
			'data': {
				'jsonrpc': '2.0',
				'method': 'generateStrings',
				'params': {
					'apiKey': 'e20ac8ec-9748-4736-a61c-d234ac6ac619',
					'n': 1,
					'length': 10,
					'characters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
					'replacement': false
				},
				'id': ''
			}
		}
	},

	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	},

	'components': {
		'path': './sub-components'
	}
});

exports.production = ({
	'randomServer': {
		'protocol': 'https',
		'options': {
			'method': 'POST',
			'host': 'api.random.org',
			'port': 443,
			'path': '/json-rpc/1/invoke',
			'data': {
				'jsonrpc': '2.0',
				'method': 'generateStrings',
				'params': {
					'apiKey': 'e20ac8ec-9748-4736-a61c-d234ac6ac619',
					'n': 1,
					'length': 10,
					'characters': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
					'replacement': false
				},
				'id': ''
			}
		}
	},

	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	},

	'components': {
		'path': './sub-components'
	}
});

