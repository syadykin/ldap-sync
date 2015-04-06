#!/usr/bin/env node
/*jslint node:true */
'use strict';

var extend   = require('extend'),
    ldapSync = require('ldap-sync'),
    // ldapSync = require('../lib'),
    config   = {};

extend(true, config, require('/etc/ldap-sync/config.json'));
ldapSync(config, function(err, config, run) { run(); });
