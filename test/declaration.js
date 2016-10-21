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
          tags: {
            isControl: 1,
            age: 36,
          },
        },
        {
          filename: path.join(mocksPath, 'M2.txt'),
          tags: {
            isControl: 0,
            age: 35,
          },
        },
      ],
      name: 'project-1',
    },
    {
      files: [
        {
          filename: path.join(mocksPath, 'M3.txt'),
          tags: {
            isControl: true,
            age: 27,
          },
        },
        {
          filename: path.join(mocksPath, 'M4.txt'),
          tags: {
            isControl: false,
            age: 56,
          },
        },
      ],
      name: 'project-2',
    },
  ],
  verbose: true,
};
