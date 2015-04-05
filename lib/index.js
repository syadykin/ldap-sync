/*jslint node:true */
'use strict';

var LDAP    = require('LDAP'),
    _       = require('lodash'),
    extend  = require('extend'),
    Events  = require('events'),
    $$      = require('async'),
    winston = require('winston'),
    wmail   = require('winston-mail'),
    plugins = require('./plugins'),

    emitter = emitter || new Events.EventEmitter();

module.exports = function(config, cb) {
  config = extend(true, {}, require('./config.json'), config || {});

  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {
    level: 'error',
    colorize: true
  });

  if (config.log.file)
    winston.add(winston.transports.File, config.log.file);

  if (config.log.mail)
    winston.add(wmail.Mail, config.log.mail);

  if (!_.isArray(config.backends) || config.backends.length === 0)
    return cb(new Error('No backends defined'));

  function run() {
    $$.waterfall([
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
              winston.info('%s: %s', event, user.user);
              emitter.emit(event, _.pick(user, _.identity));
            });
          }
        }));
      }
    ], function(err, ldap) {
      if (err) {
        winston.error(err);
        process.exit(-1);
      } else {
        if (ldap.close(function() {
          process.exit(0);
        }));
      }
    });
  }

  $$.map(config.backends, function(module, cb) {
    if (module.plugin in plugins) {
      winston.info('Loading %s backend', module.plugin);
      plugins[module.plugin](emitter, module.config, winston, cb);
    } else {
      winston.error('No plugin %s defined', module.plugin);
      cb(new Error('No plugin ' + module.plugin + ' defined'));
    }
  }, function(err, backends) {
    backends.forEach(function(c, i) {
      config.backends[i].config = c;
    });
    cb(err, config, run);
  });

};
