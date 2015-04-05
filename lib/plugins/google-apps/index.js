/*jslint node:true */
'use strict';

var extend       = require('extend'),
    $$           = require('async'),
    google       = require('googleapis'),
    base64       = require('base64-url'),
    directory    = google.admin('directory_v1');

function update(config, event, logger, data) {
  var user = [data.user, config.domain].join('@');

  $$.waterfall([
    function(cb) {
      directory.users.get({userKey: user}, function(err, u) {

        if (event === 'update') {
          var pw = data.password.match(/^{([^}]+)}(.*)$/),
              resource = {
                name: {
                  familyName: data.lastName,
                  givenName: data.firstName
                },
                password: pw[2],
                hashFunction: pw[1].toLowerCase(),
                changePasswordAtNextLogin: false,
                primaryEmail: user
              };

          if (err && err.code === 404) {
            // insert isn't working yet for unknown reason,
            // 503 returned on every request, TODO
            directory.users.insert({resource: resource},
              function(err) { cb(err); });
          } else if (!err) {
            directory.users.patch({resource: resource, userKey: user},
              function(err) { cb(err); });
          } else if (err) {
            cb(err);
          }
        } else if (event === 'delete') {
          if (!err) {
            directory.users.delete({
              codeId: u.id,
              userKey: user
            }, cb);
          } else if (err && err.code !== 404) {
            cb(err);
          }
        }
      });
    },
    function(cb) {
      switch(event) {
        case 'update':
          logger.info('google-apps %s: account details for %s has been updated',
            config.domain, user);
          break;
        case 'delete':
          logger.info('google-apps %s: account %s has been deleted',
            config.domain, user);
      }
      cb();
    },
    function(cb) {
      if (event === 'delete') return cb(null, false);
      if (!data.photo) return cb(null, false);

      directory.users.photos.update({
        userKey: user,
        resource: {
          photoData: base64.escape(data.photo.toString('base64'))
        }
      }, function(err) { cb(err, true); });
    },
    function(res, cb) {
      if (res)
        logger.info('google-apps %s: photo for %s has been updated',
          config.domain, user);
      cb();
    }
  ], function(err) {
    if (err) logger.error('google-apps %s: %d %s when %s %s',
      config.domain, err.code, err.message, event, user);
  });
}

module.exports = function(emitter, config, logger, cb) {
  config = extend(true, {}, require('./config.json'), config);

  var jwtClient = new google.auth.JWT(
    config.serviceEmail,
    config.keyFile,
    null, [
      'https://www.googleapis.com/auth/admin.directory.user',
      'https://www.googleapis.com/auth/admin.directory.user.security'
    ],
    config.accountEmail);

  google.options({ auth: jwtClient });
  jwtClient.authorize(function(err) {
    if (err) {
      logger.error('google-apps %s: %s', config.domain, err.message);
      return cb(err);
    }

    emitter.on('user.update', update.bind(this, config, 'update', logger));
    emitter.on('user.delete', update.bind(this, config, 'delete', logger));

    cb(null, config);
  });
};
