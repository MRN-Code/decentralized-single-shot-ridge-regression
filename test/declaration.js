'use strict';

const path = require('path');

const mocksPath = path.join(__dirname, 'mocks');

module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  local: [
    {
      files: [
        {
          filename: path.join(mocksPath, 'M1.txt'),
        },
        {
          filename: path.join(mocksPath, 'M2.txt'),
        },
      ],
      metaCovariateMapping: {
        2: 0,
        3: 1,
      },
      metaFile: [
        ['filename', 'is control', 'age'],
        ['M1.txt', '1', '36'],
        ['M2.txt', '0', '55'],
      ],
      name: 'project-1',
    },
    {
      files: [
        {
          filename: path.join(mocksPath, 'M3.txt'),
        },
        {
          filename: path.join(mocksPath, 'M4.txt'),
        },
      ],
      metaCovariateMapping: {
        2: 1,
        3: 0,
      },
      metaFile: [
        ['File', 'Age', 'IsControl'],
        ['M3.txt', '27', true],
        ['M4.txt', '48', false],
      ],
      name: 'project-2',
    },
  ],
  verbose: true,
};
