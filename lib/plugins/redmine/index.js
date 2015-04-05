/*jslint node:true */
'use strict';

var extend  = require('extend'),
    _       = require('lodash'),
    $$      = require('async'),
    restler = require('restler'),

    format  = require('util').format;

function update(config, event, logger, data) {
  if (!data.mail) {
    data.mail = [data.user, config.domain].join('@');
  }

  // first we must check user for existance
  $$.waterfall([
    function getUsers(cb) {
      var user,
          offset = 0,
          doMore = false;

      $$.doWhilst(function(cb) {
        var url = format('%s/users.json?name=%s&offset=%d',
                                        config.url, data.user, offset);
        restler
          .get(url, {headers: {'X-Redmine-API-Key': config.key}})
          .on('success', function(response) {
            user = response.users.filter(function(user) {
                     return user.login === data.user;
                   }).shift();
            offset += response.limit;
            doMore = !user && response.total < response.offset + response.limit;
            cb();
          })
          .on('fail', cb)
          .on('error', cb);
      },
      function() { return doMore; },
      function(err) { cb(err, user); });
    },
    function(user, cb) {
      cb(null, user && user.id, {user: _.pick({
        login: data.user,
        firstname: data.firstName,
        lastname: data.lastName,
        mail: data.mail,
        status: event === 'update' ? 1 : 3,
        auth_source_id: config.auth_source_id
      }, _.identity)});
    },
    function(id, user, cb) {
      var url = id ? format('%s/users/%d.json', config.url, id)
                     : format('%s/users.json', config.url),
          method = id ? 'put' : 'post';

      delete user.id;

      restler[method + 'Json'](url, user, {
          headers: {'X-Redmine-API-Key': config.key}
        })
        .on('success', cb)
        .on('fail', cb)
        .on('error', cb);
    }
  ], function(err) {
    if (err)
      logger.error('redmine: ' + JSON.stringify(err));
  });
}

module.exports = function(emitter, config, logger, cb) {
  config = extend(true, {}, require('./config.json'), config);

  emitter.on('user.update', update.bind(this, config, logger, 'update'));
  emitter.on('user.delete', update.bind(this, config, logger, 'delete'));

  cb(null, config);
};
