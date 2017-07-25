'use strict';

const get = require('lodash/get');
const n = require('numeric');

const preprocess = (opts) => {
  const userResults = opts.userResults;

  // Not all user results contain betas. Return early.
  if (userResults.some(userResult => !get(userResult, 'data.betaVector'))) {
    return {};
  }

  // calculate averageBetaVector
  const averageBetaVector = [];
  const betaCount = userResults[0].data.betaVector.length;
  const userCount = userResults.length;

  for (let i = 0; i < betaCount; i += 1) {
    averageBetaVector.push(userResults.reduce(
      (sum, userResult) => sum + userResult.data.betaVector[i], 0
    ) / userCount);
  }

  // calculate globalMeanY (rewrite it using more concise way)

  const globalMeanY =
  n.sum(
    userResults.map(result => result.data.localMeanY * result.data.localCount)
  ) /
  n.sum(
    userResults.map(result => result.data.localCount)
  );

  /* eslint-disable no-console */
  console.log('Average beta vector:', averageBetaVector);
  console.log('globalMeanY is :', globalMeanY);
  /* eslint-enable no-console */

  // Extract X and y variable name list from userData

  /* eslint-disable no-underscore-dangle */
  const yLabel = opts.userResults[0].userData.__FEATURES__;
  /* eslint-enable no-underscore-dangle */
  const xLabel = Object.keys(opts.userResults[0].userData.files[0].tags);

  /* eslint-disable no-console */
  console.log('xLabel is', xLabel);
  console.log('yLabel is', yLabel);
  /* eslint-enable no-console */

  return {
    averageBetaVector,
    globalMeanY,
    xLabel,
    yLabel,
  };
};

preprocess(process.argv.slice(2));
