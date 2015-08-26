/*
 * Name			: api_modules/components/incoming/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Incoming Data Component
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var base = require('./../component-base').baseComponent,
	prime = require('prime');

var incomingDataComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.post('/data/:machineId', function(request, response, next) {
			self.$dependencies.logger.debug('Incoming Data:\nQuery: ', request.query, '\nBody : ', request.body, '\nParam: ', request.params);

			self.$dependencies.databaseService.knex.raw('SELECT count(id) FROM tenant_machines WHERE id = \'' + request.params.machineId + '\';')
			.then(function(result) {
				if(!result.rows.length) {
					throw ({ 'code': 403, 'message': 'Cannot push data - unknown machine' });
					return;
				}

				if(parseInt(result.rows[0].count) <= 0) {
					throw ({ 'code': 403, 'message': 'Cannot push data - unknown machine' });
					return;
				}

				// Nothing to do here.... simply publish to the MQTT Client
				self.$dependencies.mqttclientService.publish(request.params.machineId, request.body, { 'retain': false });
				response.status(200).json({ 'status': 200 });
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Incoming Data:\nQuery: ', request.query, '\nBody : ', request.body, '\nParam: ', request.params, '\nError: ', err);
				response.status(422).json({ 'err': err });
			});
		});
	},

	'name': 'component/incoming',
	'dependencies': ['logger', 'databaseService', 'mqttclientService']
});

exports.component = incomingDataComponent;

