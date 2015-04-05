module.exports = function(emitter, config, logger, cb) {
  emitter.on('user.update', console.log.bind(console, 'update'));
  emitter.on('user.delete', console.log.bind(console, 'delete'));
  cb(null, {});
};
