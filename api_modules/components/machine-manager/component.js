/// <reference path="./../../../typings/node/node.d.ts"/>
/*
 * Name			: api_modules/components/machine-manager/component.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Machine Manager Component
 *
 */

"use strict";

/**
 * Module dependencies, required for ALL Twy'r modules
 */
var base = require('./../component-base').baseComponent,
	prime = require('prime'),
	promises = require('bluebird');

/**
 * Module dependencies, required for this module
 */
var machineManagerComponent = prime({
	'inherits': base,

	'constructor': function() {
		base.call(this);
	},

	'start': function(dependencies, callback) {
		var self = this;

		machineManagerComponent.parent.start.call(self, dependencies, function(err, status) {
			if(err) {
				callback(err);
				return;
			}

			var database = self.$dependencies.databaseService;

			Object.defineProperty(self, '$TenantModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenants',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'tenant_id');
					}
				})
			});

			Object.defineProperty(self, '$MachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'machines',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'machine_id');
					}
				})
			});

			Object.defineProperty(self, '$PLCModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'plcs',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'plc_id');
					}
				})
			});

			Object.defineProperty(self, '$ProtocolModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'protocols',
					'idAttribute': 'id',

					'tenantMachines': function() {
						return this.hasMany(self.$TenantMachineModel, 'protocol_id');
					}
				})
			});

			Object.defineProperty(self, '$TenantMachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'tenant_machines',
					'idAttribute': 'id',

					'tenant': function() {
						return this.belongsTo(self.$TenantModel, 'tenant_id');
					},

					'userTenantMachines': function() {
						return this.hasMany(self.$UserTenantMachineModel, 'tenant_machine_id');
					},

					'machine': function() {
						return this.belongsTo(self.$MachineModel, 'machine_id');
					},

					'plc': function() {
						return this.belongsTo(self.$PLCModel, 'plc_id');
					},

					'protocol': function() {
						return this.belongsTo(self.$ProtocolModel, 'protocol_id');
					}
				})
			});

			Object.defineProperty(self, '$UserTenantMachineModel', {
				'__proto__': null,
				'value': database.Model.extend({
					'tableName': 'user_tenant_machines',
					'idAttribute': 'id',

					'tenantMachine': function() {
						return this.belongsTo(self.$TenantMachineModel, 'tenant_machine_id');
					}
				})
			});

			self.$dependencies.eventService.on('websocket-start', function() {
				self.$dependencies.eventService.on('websocket-connect', self._addSparkEventHandlers.bind(self));
			});

			self.$dependencies.pubsubService.subscribeConnection.on('pmessage', self._receivedMachineData.bind(self));
			callback(null, status);
		});
	},

	'_addRoutes': function() {
		var self = this;

		this.$router.get('/machineManagerUserTenantMachines', function(request, response, next) {
			response.type('application/json');

			if(!request.user) {
				response.status(200).send('');
				return;
			}

			new self.$UserTenantMachineModel()
			.query('where', 'user_id', '=', request.user.id)
			.fetchAll({ 'withRelated': ['tenantMachine.tenant', 'tenantMachine.machine', 'tenantMachine.plc', 'tenantMachine.protocol'] })
			.then(function(userTenantMachines) {
				userTenantMachines = self._camelize(userTenantMachines.toJSON());

				var userTenantMachinesResponse = [],
					tagDataResponse = [],
					computedTagDataResponse = [];

				for(var idx in userTenantMachines) {
					var thisUserTenantMachine = userTenantMachines[idx],
						thisUserTenantMachineData = {
							'id': thisUserTenantMachine.id,
							'name': thisUserTenantMachine.tenantMachine.name,
							'tenantName': thisUserTenantMachine.tenantMachine.tenant.name,

							'emberComponent': thisUserTenantMachine.tenantMachine.emberComponent,
							'emberTemplate': 'components/' + (thisUserTenantMachine.emberTemplate || thisUserTenantMachine.tenantMachine.emberTemplate || 'machine-manager-realtime-data-default-display'),

							'machineManufacturer': thisUserTenantMachine.tenantMachine.machine.manufacturer,
							'machineCategory':  thisUserTenantMachine.tenantMachine.machine.category,
							'machineModel':  thisUserTenantMachine.tenantMachine.machine.model,

							'plcManufacturer': thisUserTenantMachine.tenantMachine.plc.manufacturer,
							'plcCategory': thisUserTenantMachine.tenantMachine.plc.category,
							'plcModel': thisUserTenantMachine.tenantMachine.plc.model,

							'protocolName': thisUserTenantMachine.tenantMachine.protocol.name,
							'protocolVersion': thisUserTenantMachine.tenantMachine.protocol.version,

							'tags': [],
							'computed': [],

							'createdOn': thisUserTenantMachine.createdOn
						};

					for(var tagIdx in thisUserTenantMachine.tenantMachine.tagData) {
						var thisTag = thisUserTenantMachine.tenantMachine.tagData[tagIdx];

						thisUserTenantMachineData.tags.push(thisUserTenantMachine.id + '-' + tagIdx);
						tagDataResponse.push({
							'id': thisUserTenantMachine.id + '-' + tagIdx,
							'name': thisTag.name,
							'displayName': thisTag.displayName,
							'value': 0,
							'alert': false,

							'machine': thisUserTenantMachine.id
						})
					}

					for(var compIdx in thisUserTenantMachine.tenantMachine.tagComputed) {
						var thisComputed = thisUserTenantMachine.tenantMachine.tagComputed[compIdx];

						thisUserTenantMachineData.computed.push(thisUserTenantMachine.id + '-' + compIdx);
						computedTagDataResponse.push({
							'id': thisUserTenantMachine.id + '-' + compIdx,
							'name': thisComputed.name,
							'displayName': thisComputed.displayName,
							'value': thisComputed.value,

							'machine': thisUserTenantMachine.id
						})
					}

					userTenantMachinesResponse.push(thisUserTenantMachineData);
				}

				response.status(200).json({
					'machineManagerUserTenantMachines': userTenantMachinesResponse,
					'machineManagerMachineTags': tagDataResponse,
					'machineManagerMachineTagComputed': computedTagDataResponse
				});
			})
			.catch(function(err) {
				self.$dependencies.logger.error('Error servicing request "' + request.path + '":\nQuery: ', request.query, '\nBody: ', request.body, '\nParams: ', request.params, '\nError: ', err);
				response.status(422).json({
					'errors': {
						'id': [err.detail || err.message]
					}
				});
			});
		});
	},

	'_addSparkEventHandlers': function(spark) {
		spark.on('data', this._processSparkData.bind(this, spark));
	},

	'_processSparkData': function(spark, data) {
		var cacheService = this.$dependencies.cacheService,
			cacheMulti = promises.promisifyAll(cacheService.multi());

		var logger = this.$dependencies.logger,
			pubsub = this.$dependencies.pubsubService,
			websockets = this.$dependencies.websocketService;

		switch(data.command) {
		case 'subscribe':
			spark.join(data.machineId + '*');
			if(websockets.room(data.machineId + '*').clients().length == 1) {
				pubsub.subscribeConnection.psubscribe(data.machineId + '*');

				cacheMulti.getAsync(data.machineId + '!Latest!Data');
				cacheMulti.getAsync(data.machineId + '!Aggregate!Data!Minute!Latest!Data');
				cacheMulti.getAsync(data.machineId + '!Aggregate!Data!Hour!Latest!Data');
				cacheMulti.getAsync(data.machineId + '!Aggregate!Data!Day!Latest!Data');
				cacheMulti.getAsync(data.machineId + '!Aggregate!Data!Month!Latest!Data');

				cacheMulti.execAsync()
				.then(function(latestData) {
					for(var idx in latestData) {
						if(!latestData[idx]) continue;
						spark.write(JSON.parse(latestData[idx]));
					}
				})
				.catch(function(err) {
					logger.error('Error streaming latest machine data:\nMachine: ', data.machineId, '\nError: ', JSON.stringify(err));
				});
			}
			break;

		case 'unsubscribe':
			if(websockets.room(data.machineId + '*').clients().length == 1) {
				pubsub.subscribeConnection.punsubscribe(data.machineId + '*');
			}

			spark.leave(data.machineId + '*');
			break;
		}
	},

	'_receivedMachineData': function(pattern, channel, machineData) {
		var streamData = {};
		streamData.machineId = channel;
		streamData.data = {};

		// Non-aggregate, real-time data...
		if(channel.indexOf('!Aggregate!Data') < 0) {
			machineData = JSON.parse(machineData);
			for(var idx = 0; idx < machineData.length; idx++) {
				var thisData = machineData[idx];
				
				thisData.name = thisData.header;
				delete thisData.header;
	
				thisData.alert = !!parseInt(thisData.alert);
				streamData.data[thisData.name] = thisData;
			}
		}
		// Aggregate statistical data
		else {
			streamData.data = JSON.parse(machineData);
		}

		// Send the data out...
		this.$dependencies.logger.debug('Streaming Data to machine ', channel, ': ', JSON.stringify(streamData));
		this.$dependencies.websocketService.room(channel).write(streamData);

		// Store for future connections...
		this.$dependencies.cacheService.set(channel + '!Latest!Data', JSON.stringify(streamData));
	},

	'name': 'machine-manager',
	'dependencies': ['logger', 'cacheService', 'databaseService', 'eventService', 'pubsubService', 'websocketService']
});

exports.component = machineManagerComponent;
