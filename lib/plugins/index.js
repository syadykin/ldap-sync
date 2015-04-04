/*jslint node:true */
'use strict';

var fs    = require('fs'),
    path  = require('path'),
    _     = require('lodash'),

    plugins;

module.exports = plugins || _.object(fs.readdirSync(__dirname)
  .filter(function(item) {
    return fs.statSync(path.join(__dirname, item)).isDirectory();
  })
  .map(function(item) {
    return [item, require('./' + item)];
  }));

