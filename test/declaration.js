'use strict';

const path = require('path');

const features = ['Left-Hippocampus'];
const mocksPath = path.join(__dirname, 'mocks');

module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  local: [
    {
      __FEATURES__: features,
      files: [
        {
          filename: path.join(mocksPath, 'M1.txt'),
          tags: {
            isControl: true,
            age: 36,
          },
        },
        {
          filename: path.join(mocksPath, 'M2.txt'),
          tags: {
            isControl: false,
            age: 35,
          },
        },
        {
          filename: path.join(mocksPath, 'M3.txt'),
          tags: {
            isControl: true,
            age: 50,
          },
        },
        {
          filename: path.join(mocksPath, 'M4.txt'),
          tags: {
            isControl: false,
            age: 18,
          },
        },

      ],
      name: 'project-1',
    },
    {
      __FEATURES__: features,
      files: [
        {
          filename: path.join(mocksPath, 'M1.txt'),
          tags: {
            isControl: true,
            age: 27,
          },
        },
        {
          filename: path.join(mocksPath, 'M2.txt'),
          tags: {
            isControl: false,
            age: 56,
          },
        },
        {
          filename: path.join(mocksPath, 'M3.txt'),
          tags: {
            isControl: true,
            age: 38,
          },
        },
        {
          filename: path.join(mocksPath, 'M4.txt'),
          tags: {
            isControl: false,
            age: 49,
          },
        },

      ],
      name: 'project-2',
    },
  ],
  verbose: true,
};
