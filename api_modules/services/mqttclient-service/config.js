/*
 * Name			: api_modules/services/mqttclient-service/config.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server MQTT Client Service Config
 *
 */

"use strict";

exports.development = ({
	'port': 1883,
	'host': '127.0.0.1'
});

exports.test = ({
	'port': 1883,
	'host': '127.0.0.1'
});

exports.stage = ({
	'port': 1883,
	'host': '127.0.0.1'
});

exports.production = ({
	'port': 1883,
	'host': '127.0.0.1'
});
