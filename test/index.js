'use strict';

const computation = require('../src/index.js');
const path = require('path');
const tape = require('tape');

const preprocess = computation.local[0].fn;

tape('local preprocessing: errors', t => {
  t.plan(5);

  preprocess({
    remoteResult: {},
    userData: {},
  })
    .catch(() => t.pass('throws without features'));

  preprocess({
    remoteResult: {
      pluginState: {
        inputs: [[[]]],
      },
    },
    userData: {},
  })
    .catch(() => t.pass('throws with zero features'));

  preprocess({
    remoteResult: {
      pluginState: {
        inputs: [[['BadFeature']]],
      },
    },
    userData: {},
  })
    .catch(() => t.pass('throws with bad FreeSurfer feature'));

  preprocess({
    remoteResult: {
      pluginState: {
        inputs: [[['Left-Hippocampus']]],
      },
    },
    userData: {},
  })
    .catch(() => t.pass('throws with no files'));

  preprocess({
    remoteResult: {
      pluginState: {
        inputs: [[['Left-Hippocampus']]],
      },
    },
    userData: {
      files: [],
    },
  })
    .catch(() => t.pass('throws with zero files'));
});

tape('local preprocessing', t => {
  t.plan(2);

  preprocess({
    remoteResult: {
      pluginState: {
        inputs: [[['Left-Hippocampus']]],
      },
    },
    userData: {
      files: [{
        filename: path.join(__dirname, 'mocks', 'M1.txt'),
        tags: {
          isControl: true,
          age: 29,
        },
      }, {
        filename: path.join(__dirname, 'mocks', 'M2.txt'),
        tags: {
          isControl: false,
          age: 30,
        },
      }],
    },
  })
    .then(response => {
      t.deepEqual(
        response.X,
        [
          [29, 1],
          [30, -1],
        ],
        'returns normalized covariates'
      );
      t.deepEqual(
        response.y,
        [4100, 4200],
        'returns picked regions of interest'
      );
    })
    .catch(t.end);
});

