/*jslint node:true */
'use strict';

var LDAP    = require('LDAP'),
    _       = require('lodash'),
    extend  = require('extend'),
    Events  = require('events'),
    $$      = require('async'),
    plugins = require('./plugins'),

    emitter = emitter || new Events.EventEmitter();

module.exports = function(config) {
  config = extend(true, require('./config.json'), config || {});

  $$.waterfall([
    function loadBackends(cb) {
      if (!_.isArray(config.backends) || config.backends.length === 0)
        return cb(new Error('No backends defined'));

      $$.each(config.backends, function(module, cb) {
        if (module.plugin in plugins) {
          plugins[module.plugin](emitter, module.config, cb);
        } else {
          cb(new Error('No plugin ' + module.plugin + ' defined'));
        }
      }, cb);
    },
    function initLdap(cb) {
      cb(null, new LDAP(config.connection));
    },
    function openLdap(ldap, cb) {
      ldap.open(function(err) {
        cb(err, ldap);
      });
    },
    function bindLdap(ldap, cb) {
      ldap.simplebind(config.bind, function(err) {
        cb(err, ldap);
      });
    },
    function syncLdap(ldap/*, cb*/) {
      ldap.sync(extend({}, config.sync, {
        syncentry: function(data) {
          data.forEach(function(rec) {
            var user = {
                  user: rec.dn.split(',').shift().split('=').pop()
                },
                event = 'user.delete';

            switch(rec._syncState) {
              case 1:
              case 2:
                event = 'user.update';
                extend(user, {
                  firstName: rec.givenName && rec.givenName[0],
                  lastName: rec.sn && rec.sn[0],
                  mail: rec.mail && rec.mail[0],
                  password: rec.userPassword && rec.userPassword[0],
                  photo: rec.jpegPhoto && rec.jpegPhoto[0]
                });
                break;
            }

            emitter.emit(event, _.pick(user, _.identity));
          });
        }
      }));
    }
  ], function(err, ldap) {
    if (err) {
      console.log(err.message);
      process.exit(-1);
    } else {
      if (ldap.close(function() {
        process.exit(0);
      }));
    }
  });

};
