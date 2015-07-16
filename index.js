/// <reference path="./typings/node/node.d.ts"/>
/*
 * Name			: index.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: Entry point into the Twy'r API Server Application
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var promises = require('bluebird'),
	cluster = promises.promisifyAll(require('cluster')),
	domain = require('domain'),
	repl = require('repl'),
	numCPUs = require('os').cpus().length,
	TwyrLoader = require('./loader').loader,
	TwyrAPIServer = require('./api-server').twyrAPIServer;

// Get what we need - environment, and the configuration specific to that environment
var env = (process.env.NODE_ENV || 'development').toLowerCase(),
	config = require('./api-config.js')[env];

var telnetServer = null;

// Setup the Cluster
var timeoutMonitor = {};

// Instantiate the application, and start the execution
if (cluster.isMaster) {
	cluster
		.on('fork', function(worker) {
			console.log('\nForked Twyr API Server #' + worker.id + '\n');
			timeoutMonitor[worker.id] = setTimeout(function() {
				worker.kill();
			}, 2000);
		})
		.on('online', function(worker, address) {
			console.log('\nTwyr API Server #' + worker.id + ': Now online!\n');
			clearTimeout(timeoutMonitor[worker.id]);
		})
		.on('listening', function(worker, address) {
			clearTimeout(timeoutMonitor[worker.id]);
			console.log('\n');

			var networkInterfaces = require('os').networkInterfaces();
			for(var intIdx in networkInterfaces) {
				var thisNetworkInterface = networkInterfaces[intIdx];
				for(var addIdx in thisNetworkInterface) {
					var thisAddress = thisNetworkInterface[addIdx];
					console.log('Twyr API Server #' + worker.id + ': Now listening at ' + thisAddress.address + ':' + address.port + ' (' + thisAddress.family + ' on ' + intIdx + ')' );
				}
			}
		
			console.log('\n');
		})
		.on('disconnect', function(worker) {
			console.log('\nTwyr API Server #' + worker.id + ': Disconnected\n');
			clearTimeout(timeoutMonitor[worker.id]);
		})
		.on('exit', function(worker, code, signal) {
			console.log('\nTwyr API Server #' + worker.id + ': Exited with code: ' + code + ' on signal: ' + signal + '\n');
			clearTimeout(timeoutMonitor[worker.id]);
		})
		.on('death', function(worker) {
			console.error('\nTwyr API Server #' + worker.pid + ': Death! Restarting...\n');
			clearTimeout(timeoutMonitor[worker.id]);
			if (cluster.isMaster && config['restart']) cluster.fork();
		});

	// Fork workers.
	for (var i = 0; i < (numCPUs * config['loadFactor']); i++) {
		cluster.fork();
	}

	// In development mode (i.e., start as "npm start"), wait for input from command line
	// In other environments, start a telnet server and listen for the exit command
	if(env == 'development') {
		var replConsole = repl.start(config.repl);
		replConsole.on('exit', function() {
			console.log('Twyr API Server Master: Stopping now...');
	
			for(var id in cluster.workers) {
				(cluster.workers[id]).send('terminate');
			}
	
			cluster.disconnectAsync()
			.then(function() {
				console.log('Twyr API Server Master: Disconnected workers. Exiting now...');
			})
			.catch(function(err) {
				console.error('Twyr API Server Master Error: ' + JSON.stringify(err));
				process.exit(1);
			});
		});
	}
	else {
		telnetServer = require('net').createServer(function(socket) {
			config.repl.parameters.input = socket;
			config.repl.parameters.output = socket;

			var replConsole = repl.start(config.repl.parameters);
			replConsole.context.socket = socket;

			replConsole.on('exit', function() {
				console.log('Twyr API Server Master: Stopping now...');
		
				for(var id in cluster.workers) {
					(cluster.workers[id]).send('terminate');
				}
		
				cluster.disconnectAsync()
				.then(function() {
					console.log('Twyr API Server Master: Disconnected workers. Exiting now...');

					socket.end();
					telnetServer.close();
				})
				.timeout(60000)
				.catch(function(err) {
					console.error('Twyr API Server Master Error: ' + JSON.stringify(err));
					process.exit(1);
				});
			});
		});

		telnetServer.listen(config.repl.controlPort, config.repl.controlHost);
	}
}
else {
	// Worker processes have a Twyr API Server Server running in their own
	// domain so that the rest of the process is not infected on error
	var serverDomain = domain.create(),
		apiServer = promises.promisifyAll(new TwyrAPIServer());

	serverDomain.on('error', function(error) {
		console.log('Twyr API #' + cluster.worker.id + ': Domain Error:\n', error.stack);

		apiServer.stopAsync()
		.then(function(status) {
			console.log('Twyr API #' + cluster.worker.id + ': Stop Status:\n' + JSON.stringify(status, null, '\t'));
			if(!status) throw status;

			return apiServer.unloadAsync();
		})
		.timeout(60000)
		.then(function(status) {
			console.log('Twyr API #' + cluster.worker.id + ': Unload Status:\n' + JSON.stringify(status, null, '\t'));
			if(!status) throw status;
		})
		.timeout(60000)
		.catch(function(err) {
			console.error('Twyr API #' + cluster.worker.id + ': Shutdown Error:\n' + JSON.stringify(err));
		})
		.finally(function() {
	        cluster.worker.disconnect();
		});
	});

	serverDomain.run(function() {
		// Create a loader for this application
		var appLoader = promises.promisifyAll(new TwyrLoader(__dirname, apiServer), {
			'filter': function(name, func) {
				return true;
			}
		});
	
		// Call load / initialize / start...
		apiServer.loadAsync(null, appLoader)
		.timeout(1000)
		.then(function(status) {
			console.log('Twyr API #' + cluster.worker.id + ': Load status:\n' + JSON.stringify(status, null, '\t'));
			if(!status) throw { 'number': 500, 'message': 'Twyr API #' + cluster.worker.id + ': Load Error' };
	
			return apiServer.startAsync(null);
		})
		.timeout(60000)
		.then(function(status) {
			console.log('Twyr API #' + cluster.worker.id + ': Start Status:\n' + JSON.stringify(status, null, '\t'));
			if(!status) throw { 'number': 500, 'message': 'Twyr API #' + cluster.worker.id + ': Start Error' };
		})
		.timeout(60000)
		.catch(function(err) {
			console.error('Twyr API #' + cluster.worker.id + ': Startup Error:\n' + JSON.stringify(err));
	        cluster.worker.disconnect();
		});
	
		process.on('message', function(msg) {
			if(msg != 'terminate') return;
	
			apiServer.stopAsync()
			.then(function(status) {
				console.log('Twyr API #' + cluster.worker.id + ': Stop Status:\n' + JSON.stringify(status, null, '\t'));
				if(!status) throw status;
	
				return apiServer.unloadAsync();
			})
			.timeout(60000)
			.then(function(status) {
				console.log('Twyr API #' + cluster.worker.id + ': Unload Status:\n' + JSON.stringify(status, null, '\t'));
				if(!status) throw status;
			})
			.timeout(60000)
			.catch(function(err) {
				console.error('Twyr API #' + cluster.worker.id + ': Shutdown Error:\n' + JSON.stringify(err));
			});
		});
	});
}

// Handle any uncaught exceptions...
process.on('uncaughtException', function(err) {
	console.error('Twyr API Server Process Error: ', err);
	process.exit(1);
});
