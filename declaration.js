const path = require('path');

module.exports = {
  computationPath: path.resolve(
    __dirname,
    'computation.js'
  ),
  local: [{
    dirs: ['site1'],
  }, {
    dirs: ['site2'],
  }],
  verbose: true,
};
