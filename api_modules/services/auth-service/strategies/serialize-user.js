/*
 * Name			: api_modules/services/auth-service/strategies/serialize-user.js
 * Author		: Vish Desai (vishwakarma_d@hotmail.com)
 * Version		: 0.6.1
 * Copyright	: Copyright (c) 2014 Vish Desai (https://www.linkedin.com/in/vishdesai).
 * License		: The MIT License (http://opensource.org/licenses/MIT).
 * Description	: The Twy'r API Server Authentication Service User Serialization/Deserialization Mechanism
 *
 */

"use strict";

/**
 * Module dependencies.
 */
var promises = require('bluebird'),
	uuid = require('node-uuid');

exports.strategy = (function() {
	var self = this,
		auth = self.$passport,
		cache = self.$dependencies['cacheService'],
		database = self.$dependencies['databaseService'],
		logger = self.$dependencies['logger'];

	// Setup the models...
	var UserSocialLogins = database.Model.extend({
		'tableName': 'user_social_logins',
		'idAttribute': 'id'
	});

	var User = database.Model.extend({
		'tableName': 'users',
		'idAttribute': 'id',

		'social': function() {
			return this.hasMany(UserSocialLogins, 'user_id');
		}
	});
	
	auth.serializeUser(function(user, done) {
		var cacheMulti = promises.promisifyAll(cache.multi());
		cacheMulti.setAsync('twyr!portal!user!' + user.id, JSON.stringify(user));
		cacheMulti.expireAsync('twyr!portal!user!' + user.id, self.$module.$config.session.ttl);
	
		cacheMulti.execAsync()
		.then(function(execStatus) {
			done(null, user.id);
		}).
		catch(function(err) {
			logger.error('Error serializing user: ', user, '\nError: ', JSON.stringify(err));
			done(err);
		});
	});
	
	auth.deserializeUser(function(id, done) {
		// Step 1: Check to see if the user is already in the cache
		cache.getAsync('twyr!portal!user!' + id)
		.then(function(cachedData) {
			// If the user is in the cache already, simply return it
			cachedData = JSON.parse(cachedData);
			if(cachedData && cachedData.last_login && cachedData.social && cachedData.tenants) {
				done(null, cachedData);
				return;
			}

			// Step 2: Fetch User data from database, update last_login time,
			//			and proceed
			var deserializedUser = null;

			User.where({ 'id': id }).fetch()
			.then(function(user) {
				if(!user) {
					throw({ 'message': 'User "' + id + '" not found' });
					return;
				}
		
				deserializedUser = user.toJSON();
				delete deserializedUser.password;
	
				user.set('last_login', (new Date()).toISOString());
				return user.save();
			})
			// Step 3: Fetch User's linked social accounts
			.then(function() {
				return UserSocialLogins.where({ 'user_id': id }).fetchAll();
			})
			.then(function(socials) {
				socials = socials.toJSON();
				deserializedUser.social = {};

				for(var idx in socials) {
					var thisSocial = socials[idx];
					deserializedUser.social[thisSocial.provider] = {
						'id': thisSocial.profile_id,
						'displayName': thisSocial.profile_displayname
					};
				}

				return database.knex.raw('SELECT DISTINCT A.tenant_id AS tenant, B.component_permission_id AS permission FROM groups A INNER JOIN group_component_permissions B ON (A.id = B.group_id) WHERE A.id IN (SELECT group_id FROM users_groups WHERE user_id = ?)', [id]);
			})
			// Step 4: Fetch, and process, User's permissions per tenant
			.then(function(permissions) {
				var usedPermissions = [],
					promiseResolutions = [];

				permissions = permissions.rows;
				deserializedUser.tenants = {};
	
				for(var idx in permissions) {
					var thisTenantId = (permissions[idx]).tenant,
						thisPermissionId = (permissions[idx]).permission;

					if(!deserializedUser.tenants[thisTenantId]) {
						deserializedUser.tenants[thisTenantId] = {};
						(deserializedUser.tenants[thisTenantId]).permissions = [];
						(deserializedUser.tenants[thisTenantId]).menus = [];
						(deserializedUser.tenants[thisTenantId]).widgets = {};
					}

					var thisUserTenant = deserializedUser.tenants[thisTenantId];
					if(thisUserTenant.permissions.indexOf(thisPermissionId) < 0) {
						thisUserTenant.permissions.push(thisPermissionId);
					}
						
					if(usedPermissions.indexOf(thisPermissionId) < 0) {
						usedPermissions.push(thisPermissionId);
						promiseResolutions.push(database.knex.raw('SELECT * FROM fn_get_component_menus(\'' + thisPermissionId + '\', 2);'));
					}
				}
		
				promiseResolutions.push(usedPermissions);
				return promises.all(promiseResolutions);
			})
			// Step 5: Fetch, and store, User's menus per tenant
			.then(function(componentMenus) {
				var usedPermissions = componentMenus.pop(),
					promiseResolutions = [];

				usedPermissions.forEach(function(thisPermissionId, idx) {
					var thisPermissionMenus = componentMenus[idx].rows;

					Object.keys(deserializedUser.tenants).forEach(function(thisTenantId) {
						var thisUserTenant = deserializedUser.tenants[thisTenantId];
						if(thisUserTenant.permissions.indexOf(thisPermissionId) >= 0) {
							thisUserTenant.menus = thisUserTenant.menus.concat(thisPermissionMenus);
						}
					});

					promiseResolutions.push(database.knex.raw('SELECT * FROM fn_get_component_widgets(\'' + thisPermissionId + '\');'));
				});
		
				promiseResolutions.push(usedPermissions);
				return promises.all(promiseResolutions);
			})
			// Step 6: Fetch, and process, User's widgets per tenant
			.then(function(componentWidgets) {
				var usedPermissions = componentWidgets.pop();

				usedPermissions.forEach(function(thisPermissionId, idx) {
					var thisPermissionWidgets = componentWidgets[idx].rows;

					Object.keys(deserializedUser.tenants).forEach(function(thisTenantId) {
						var thisUserTenant = deserializedUser.tenants[thisTenantId];
						if(thisUserTenant.permissions.indexOf(thisPermissionId) < 0)
							return;

						thisUserTenant.widgets = thisUserTenant.widgets.concat(thisPermissionWidgets);
					});
				});
			})
			// Step 7: Reorganize User's Menus and Widgets for display
			.then(function() {
				// Re-organize widgets according to Tenant, display position, and order of display within that position
				Object.keys(deserializedUser.tenants).forEach(function(thisTenantId) {
					var thisUserTenantWidgets = (deserializedUser.tenants[thisTenantId]).widgets,
						reorgedWidgets = {};

					thisUserTenantWidgets.forEach(function(thisWidget) {
						if(!reorgedWidgets[thisWidget.position_name])
							reorgedWidgets[thisWidget.position_name] = [];

						var existingWidget = (reorgedWidgets[thisWidget.position_name]).find(function(item) {
							return item.id == thisWidget.id;
						});

						if(existingWidget)
							return;

						(reorgedWidgets[thisWidget.position_name]).push(thisWidget);
					});

					Object.keys(reorgedWidgets).forEach(function(position) {
						var widgetsInThisPosition = reorgedWidgets[position];
						
						widgetsInThisPosition.sort(function(left, right) {
							var retVal = left.display_order - right.display_order;
							
							delete left.position_name;
							delete left.display_order;

							delete right.position_name;
							delete right.display_order;

							return retVal;
						});
					});

					(deserializedUser.tenants[thisTenantId]).widgets = reorgedWidgets;
				});

				// Re-organize menus according to Tenant, and parent/child menu hierarchy 
				Object.keys(deserializedUser.tenants).forEach(function(thisTenantId) {
					var thisUserTenantMenus = (deserializedUser.tenants[thisTenantId]).menus,
						reorgedMenus = [];

					thisUserTenantMenus.forEach(function(thisMenu) {
						if(!thisMenu.parent_id) {
							var existingMenu = reorgedMenus.find(function(item) {
								if(item.id == thisMenu.id) return true;
							});
	
							if(!existingMenu) {
								reorgedMenus.push({
									'id': thisMenu.id,
									'display_name': thisMenu.display_name,
									'ember_route': thisMenu.ember_route,
									'subRoutes': []
								});
							}
							else {
								existingMenu.display_name = thisMenu.display_name;
								existingMenu.ember_route = thisMenu.ember_route;
							}

							return;
						}
						else {
							var parentMenu = reorgedMenus.find(function(item) {
								if(item.parent_id) return false;
								if(item.id == thisMenu.parent_id) return true;
							});
	
							if(!parentMenu) {
								parentMenu = {
									'id': thisMenu.parent_id,
									'subRoutes': []
								};
	
								reorgedMenus.push(parentMenu);
							}
	
							var existingSubMenu = parentMenu.subRoutes.find(function(item) {
								if(item.id == thisMenu.id) return true;
							});
	
							if(!existingSubMenu) {
								parentMenu.subRoutes.push({
									'id': thisMenu.id,
									'display_name': thisMenu.display_name,
									'ember_route': thisMenu.ember_route
								});
							}
							else {
								existingSubMenu.display_name = thisMenu.display_name;
								existingSubMenu.ember_route = thisMenu.ember_route;
							}
						}
					});

					(deserializedUser.tenants[thisTenantId]).menus = reorgedMenus;
				});
			})
			// Step 8: Store User data in the cache for quick retrieval next time
			.then(function() {
				var cacheMulti = promises.promisifyAll(cache.multi());
				cacheMulti.setAsync('twyr!portal!user!' + deserializedUser.id, JSON.stringify(deserializedUser));
				cacheMulti.expireAsync('twyr!portal!user!' + deserializedUser.id, self.$module.$config.session.ttl);

				return cacheMulti.execAsync();
			})
			// Finally, send it back up...
			.then(function() {
				done(null, deserializedUser);
			})
			.catch(function(err) {
				logger.error('Error deserializing user:\nId: ', id, '\nError: ', err);
				done(err);
			});
		})
		.catch(function(err) {
			logger.error('Error deserializing user:\nId: ', id, '\nError: ', err);
			done(err);
		});
	});
});

