'use strict';

const regression = require('./regression');
const distributions = require('distributions');
const n = require('numeric');


const local = (opts) => {
  // use deconstructing to assign variables
  const {
    previousData: {
      betaVector,
      biasedX,
      pValue,
      rSquared,
      tValue,
      y,
     },
    remoteResult: {
       data: {
         averageBetaVector,
         globalMeanY,
          },
        },
  } = opts;


  const localCount = y.length;
  const rSquaredLocal = regression.rSquared(biasedX, y, averageBetaVector);
  const tValueLocal = regression.tValue(biasedX, y, averageBetaVector);
  /* eslint-disable new-cap */
  const tDist = distributions.Studentt(localCount - averageBetaVector.length);
  /* eslint-disable new-cap */
  const tCdf = tValueLocal.map(r => tDist.cdf(Math.abs((r))));
  const pValueLocal = n.mul(2, n.sub(1, tCdf));
  const sseLocal = n.sum(n.pow(n.sub(y, n.dot(biasedX, averageBetaVector)), 2));
  const sstLocal = n.sum(n.pow(n.sub(y, n.rep(n.dim(y), globalMeanY)), 2));
  const varXLocalMatrix = n.dot(n.transpose(biasedX), biasedX);

  /* eslint-disable no-console */
  console.log('local r squared for averageBetaVector', rSquaredLocal);
  console.log('local t Values for averageBetaVector', tValueLocal);
  console.log('local p Values for averageBetaVector', pValueLocal);
  /* eslint-enable no-console */

  return {
    betaVector,
    sseLocal,
    sstLocal,
    varXLocalMatrix,
    averageBetaVector,
    localCount,
    rSquared,
    tValue,
    pValue,
    rSquaredLocal,
    tValueLocal,
    pValueLocal,
  };
};

local(process.argv.slice(2));
