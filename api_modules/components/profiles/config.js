/*
 * Name			: api_modules/components/login/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Login Component Config
 *
 */

"use strict";

exports.development = ({
	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	}
});

exports.test = ({
	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	}
});

exports.stage = ({
	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	}
});

exports.production = ({
	'notificationServer': {
		'protocol': 'http',

		'options': {
			'method': 'POST',
			'host': 'localhost',
			'port': 3000
		},

		'resetPasswordPath': '/mailer/resetPassword',
		'newAccountPath': '/mailer/newAccount'
	}
});

