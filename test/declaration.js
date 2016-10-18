'use strict';

const path = require('path');

module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  local: [{
    dirs: [path.join(__dirname, 'site1')],
  }, {
    dirs: [path.join(__dirname, 'site2')],
  }],
  verbose: true,
};
