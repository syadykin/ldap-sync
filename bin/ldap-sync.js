#!/usr/bin/env node
/*jslint node:true */
'use strict';

var extend   = require('extend'),
    // ldapSync = require('ldap-sync'),
    ldapSync = require('../lib'),
    config   = {};

try {
  extend(true, config, require('/etc/ldap-sync.json'));
} catch(e) {}

try {
  extend(true, config, require('../ldap-sync.json'));
} catch(e) {}

ldapSync(config, function(err, config, run) { run(); });
