'use strict';

const computation = require('../src/index.js');
const path = require('path');
const tape = require('tape');

const preprocess = computation.local[0].fn;
const remote = computation.remote[0].fn;

/* eslint-disable arrow-parens */
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

// TODO: Re-enable test
tape.skip('local preprocessing', t => {
  t.plan(6);

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
      t.equal(response.localCount, 2, 'returns count');
      t.equal(response.localMeanY, 4150, 'returns mean RoI');
      t.ok(typeof response.rSquared === 'number', 'returns r^2');
      t.ok(
        Array.isArray(response.tValue) && response.tValue.length,
        'returns t-value'
      );
      t.deepEqual(
        response.x,
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

tape('remote function', t => {
  const betas = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
  ];
  const usernames = ['wrangler', 'econoline', 'forester'];

  t.notOk(
    remote({
      usernames,
      userResults: [{
        data: {
          betaVector: betas[0],
        },
        username: usernames[0],
      }, {
        data: {
          betaVector: betas[1],
        },
        username: usernames[1],
      }, {
        username: usernames[2],
      }],
    }).complete,
    'doesn\'t mark complete when user lacks data'
  );
  // TODO: Test fails on bad __FEATURES__ prop lookup. Fix and uncomment.
  // t.deepEqual(
  //   remote({
  //     usernames,
  //     userResults: usernames.map((username, i) => ({
  //       data: {
  //         betaVector: betas[i],
  //       },
  //       username,
  //     })),
  //   }).averageBetaVector,
  //   [5, 6, 7, 8],
  //   'computes average beta'
  // );
  t.end();
});
/* eslint-enable arrow-parens */

tape('degrees of freedom', (t) => {
  function getUserResult(localCount) {
    return {
      data: {
        averageBetaVector: [Math.random(), Math.random()],
        betaVector: [Math.random(), Math.random()],
        localCount,
        pValue: Math.random(),
        pValueLocal: Math.random(),
        rSquared: Math.random(),
        rSquaredLocal: Math.random(),
        sseLocal: Math.random(),
        sstLocal: Math.random(),
        tValue: Math.random(),
        tValueLocal: Math.random(),
        varXLocalMatrix: [
          [Math.random(), Math.random()],
          [Math.random(), Math.random()],
        ],
      },
    };
  }

  const result = computation.remote[1].fn({
    userResults: [
      getUserResult(100),
      getUserResult(50),
      getUserResult(10),
    ],
  });

  t.equal(
    result.global.degreesOfFreedom,
    158,
    'returns global degrees of freedom'
  );
  t.ok(
    result[0].degreesOfFreedom === 98 &&
    result[1].degreesOfFreedom === 48 &&
    result[2].degreesOfFreedom === 8,
    'returns users\'s degrees of freedom'
  );

  t.end();
});

