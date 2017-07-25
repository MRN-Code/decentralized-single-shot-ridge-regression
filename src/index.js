'use strict';

const alphanumSort = require('alphanum-sort');
const FreeSurfer = require('freesurfer-parser');
const pkg = require('../package.json');
const { DEFAULT_LAMBDA } = require('./constants.js');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  local: [{
    type: 'docker',
    url: 'coinstac/docker-single-shot',
    cmd: 'node',
    args: 'src/preprocess-local.js',
    inputs: [{
      defaultValue: ['Right-Cerebellum-Cortex'],
      help: 'Select Freesurfer region(s) of interest',
      label: 'Freesurfer ROI',
      type: 'select',
      values: alphanumSort(
        FreeSurfer.validFields.filter(field => field !== 'header'),
        { insensitive: true }
      ),
    }, {
      defaultValue: DEFAULT_LAMBDA,
      label: 'Lambda',
      max: 1,
      min: 0,
      step: 0.05,
      type: 'number',
    }, {
      label: 'Covariates',
      type: 'covariates',
    }],
  }, {
    // step two: receive the globalMeanY and averageBetaVector,
    //  then calculate sseLocal, sstLocal and varXLocal
    type: 'docker',
    url: 'coinstac/docker-single-shot',
    cmd: 'node',
    args: 'src/local.js',
  }],
  remote: [{
    type: 'docker',
    url: 'coinstac/docker-single-shot',
    cmd: 'node',
    args: 'src/preprocess-remote.js',
    verbose: true,
  }, {
    // get sstNode from each local node and calculate the statistics
    type: 'docker',
    url: 'coinstac/docker-single-shot',
    cmd: 'node',
    args: 'src/remote.js',
    verbose: true,
  }],
  plugins: ['group-step', 'inputs'],
};
