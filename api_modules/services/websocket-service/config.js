/*
 * Name			: api_modules/services/websocket-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Websocket Service Config
 *
 */

"use strict";

exports.development = ({
	'transformer': 'websockets',
	'pathname': '/websockets'
});

exports.test = ({
	'transformer': 'websockets',
	'pathname': '/websockets'
});

exports.stage = ({
	'transformer': 'websockets',
	'pathname': '/websockets'
});

exports.production = ({
	'transformer': 'websockets',
	'pathname': '/websockets'
});

