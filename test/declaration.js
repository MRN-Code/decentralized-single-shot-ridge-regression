'use strict';

const { DEFAULT_LAMBDA, DECLARATION_INPUTS_KEY } = require('../src/constants.js');
const random = require('lodash/random');
const path = require('path');

const inputs = [[['Left-Hippocampus'], DEFAULT_LAMBDA]];
const mocksPath = path.join(__dirname, 'mocks');

module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  local: [
    ['M1.txt', 'M2.txt', 'M3.txt', 'M4.txt'],
    ['M5.txt', 'M6.txt', 'M7.txt', 'M8.txt'],
  ].map(files => ({
    [DECLARATION_INPUTS_KEY]: inputs,
    files: files.map(file => ({
      filename: path.join(mocksPath, file),
      tags: {
        age: random(18, 65),
        isControl: Math.random() > 0.5,
      },
    })),
  })),
  verbose: true,
};
