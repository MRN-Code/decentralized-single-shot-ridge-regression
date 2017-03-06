'use strict';

const { DEFAULT_LAMBDA } = require('../src/constants.js');
const path = require('path');

module.exports = {
  /**
   * This property is used to pass computation input values from the
   * declaration into the computation.
   *
   * @todo Don't require `covariates` computation input
   *
   * {@link https://github.com/MRN-Code/coinstac/issues/161}
   */
  __ACTIVE_COMPUTATION_INPUTS__: [[
    ['TotalGrayVol'], // FreeSurfer region of interest
    DEFAULT_LAMBDA, // Lambda
    [{
      name: 'Is Control',
      type: 'boolean',
    }, {
      name: 'Age',
      type: 'number',
    }],
  ]],
  computationPath: path.resolve(__dirname, '../src/index.js'),
  local: [{
    metaFilePath: path.join(__dirname, 'mocks/metadata-1.csv'),
    metaCovariateMapping: {
      1: 0,
      2: 1,
    },
  }, {
    metaFilePath: path.join(__dirname, 'mocks/metadata-2.csv'),
    metaCovariateMapping: {
      1: 0,
      2: 1,
    },
  }],
  verbose: true,
};
