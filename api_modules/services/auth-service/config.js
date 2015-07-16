/*
 * Name			: api_modules/services/auth-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service Config
 *
 */

"use strict";

exports.development = ({
	'strategies': {
		'path': './strategies',

		'local': {
			'enabled': true
		},

		'facebook': {
			'enabled': true,

			'applicationID': '811496485528798',
			'applicationSecret': '1b3d9519cced29065a6c32992dbb9d54',
			'callbackUrl': 'http://local-api.twyrframework.com:9001/login/facebookcallback'
		},

		'github': {
			'enabled': true,
			
			'applicationID': '6e3dfd02d13569c5f243',
			'applicationSecret': '11d682289982bb34ec4c148f28723b6eae23681f',
			'callbackUrl': 'http://local-api.twyrframework.com:9001/login/githubcallback'
		},

		'google': {
			'enabled': true,
			
			'applicationID': '1098350344723-j1a8i5hd7gefhs2aaepb69h2mthoji2b.apps.googleusercontent.com',
			'applicationSecret': 'mD0kZ2HmmYdnlTHfUq4MCiA6',
			'callbackUrl': 'http://local-api.twyrframework.com:9001/login/googlecallback'
		},

		'twitter': {
			'enabled': true,
			
			'applicationID': 'TrkrLjzKGjVA5PYhE7w',
			'applicationSecret': 'PB1Ak9a994OUW9nPEUj2HTnzauAS1YbwS4hAQulm0g',
			'callbackUrl': 'http://local-api.twyrframework.com:9001/login/twittercallback'
		},

		'linkedin': {
			'enabled': true,
			
			'applicationID': '75bndt2vex4oy3',
			'applicationSecret': 'FC2KnYMN9HB9lxDF',
			'callbackUrl': 'http://local-api.twyrframework.com:9001/login/linkedincallback'
		}
	}
});

exports.test = ({
	'strategies': {
		'path': './strategies',

		'local': {
			'enabled': true
		},

		'facebook': {
			'enabled': true,

			'applicationID': '811496485528798',
			'applicationSecret': '1b3d9519cced29065a6c32992dbb9d54',
			'callbackUrl': 'http://twyr-api-test.twyrframework.com/login/facebookcallback'
		},

		'github': {
			'enabled': true,
			
			'applicationID': '6e3dfd02d13569c5f243',
			'applicationSecret': '11d682289982bb34ec4c148f28723b6eae23681f',
			'callbackUrl': 'http://twyr-api-test.twyrframework.com/login/githubcallback'
		},

		'google': {
			'enabled': true,
			
			'applicationID': '1098350344723-j1a8i5hd7gefhs2aaepb69h2mthoji2b.apps.googleusercontent.com',
			'applicationSecret': 'mD0kZ2HmmYdnlTHfUq4MCiA6',
			'callbackUrl': 'http://twyr-api-test.twyrframework.com/login/googlecallback'
		},

		'twitter': {
			'enabled': true,
			
			'applicationID': 'TrkrLjzKGjVA5PYhE7w',
			'applicationSecret': 'PB1Ak9a994OUW9nPEUj2HTnzauAS1YbwS4hAQulm0g',
			'callbackUrl': 'http://twyr-api-test.twyrframework.com/login/twittercallback'
		},

		'linkedin': {
			'enabled': true,
			
			'applicationID': '75bndt2vex4oy3',
			'applicationSecret': 'FC2KnYMN9HB9lxDF',
			'callbackUrl': 'http://twyr-api-test.twyrframework.com/login/linkedincallback'
		}
	}
});

exports.stage = ({
	'strategies': {
		'path': './strategies',

		'local': {
			'enabled': true
		},

		'facebook': {
			'enabled': true,

			'applicationID': '811496485528798',
			'applicationSecret': '1b3d9519cced29065a6c32992dbb9d54',
			'callbackUrl': 'https://twyr-api-stage.twyrframework.com/login/facebookcallback'
		},

		'github': {
			'enabled': true,
			
			'applicationID': '6e3dfd02d13569c5f243',
			'applicationSecret': '11d682289982bb34ec4c148f28723b6eae23681f',
			'callbackUrl': 'https://twyr-api-stage.twyrframework.com/login/githubcallback'
		},

		'google': {
			'enabled': true,
			
			'applicationID': '1098350344723-j1a8i5hd7gefhs2aaepb69h2mthoji2b.apps.googleusercontent.com',
			'applicationSecret': 'mD0kZ2HmmYdnlTHfUq4MCiA6',
			'callbackUrl': 'https://twyr-api-stage.twyrframework.com/login/googlecallback'
		},

		'twitter': {
			'enabled': true,
			
			'applicationID': 'TrkrLjzKGjVA5PYhE7w',
			'applicationSecret': 'PB1Ak9a994OUW9nPEUj2HTnzauAS1YbwS4hAQulm0g',
			'callbackUrl': 'https://twyr-api-stage.twyrframework.com/login/twittercallback'
		},

		'linkedin': {
			'enabled': true,
			
			'applicationID': '75bndt2vex4oy3',
			'applicationSecret': 'FC2KnYMN9HB9lxDF',
			'callbackUrl': 'https://twyr-api-stage.twyrframework.com/login/linkedincallback'
		}
	}
});

exports.production = ({
	'strategies': {
		'path': './strategies',

		'local': {
			'enabled': true
		},

		'facebook': {
			'enabled': true,

			'applicationID': '811496485528798',
			'applicationSecret': '1b3d9519cced29065a6c32992dbb9d54',
			'callbackUrl': 'https://twyr-api.twyrframework.com/login/facebookcallback'
		},

		'github': {
			'enabled': true,
			
			'applicationID': '6e3dfd02d13569c5f243',
			'applicationSecret': '11d682289982bb34ec4c148f28723b6eae23681f',
			'callbackUrl': 'https://twyr-api.twyrframework.com/login/githubcallback'
		},

		'google': {
			'enabled': true,
			
			'applicationID': '1098350344723-j1a8i5hd7gefhs2aaepb69h2mthoji2b.apps.googleusercontent.com',
			'applicationSecret': 'mD0kZ2HmmYdnlTHfUq4MCiA6',
			'callbackUrl': 'https://twyr-api.twyrframework.com/login/googlecallback'
		},

		'twitter': {
			'enabled': true,
			
			'applicationID': 'TrkrLjzKGjVA5PYhE7w',
			'applicationSecret': 'PB1Ak9a994OUW9nPEUj2HTnzauAS1YbwS4hAQulm0g',
			'callbackUrl': 'https://twyr-api.twyrframework.com/login/twittercallback'
		},

		'linkedin': {
			'enabled': true,
			
			'applicationID': '75bndt2vex4oy3',
			'applicationSecret': 'FC2KnYMN9HB9lxDF',
			'callbackUrl': 'https://twyr-api.twyrframework.com/login/linkedincallback'
		}
	}
});

