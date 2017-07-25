'use strict';

const distributions = require('distributions');
const n = require('numeric');

const remote = (opts) => {
  const {
    userResults,
    userResults: [{
      data: { averageBetaVector },
    }],
  } = opts;

  const betaVectorLocal = userResults.map(r => r.data.betaVector);
  const rSquaredLocalOriginal = userResults.map(r => r.data.rSquared);
  const tValueLocalOriginal = userResults.map(r => r.data.tValue);
  const pValueLocalOriginal = userResults.map(r => r.data.pValue);
  const rSquaredLocal = userResults.map(r => r.data.rSquaredLocal);
  const tValueLocal = userResults.map(r => r.data.tValueLocal);
  const pValueLocal = userResults.map(r => r.data.pValueLocal);

  // calculate global parameters
  const sseGlobal = userResults.reduce((sum, userResult) => sum +
                    userResult.data.sseLocal, 0);
  const sstGlobal = userResults.reduce((sum, userResult) => sum +
                    userResult.data.sstLocal, 0);
  const globalYCount = userResults.reduce((sum, userResult) => sum +
                       userResult.data.localCount, 0);

  const varError = (1 / (globalYCount - averageBetaVector.length)) * sseGlobal;
  const seBetaGlobal = [];
  const tValueGlobal = [];

  // calculate tValueGlobal
  let varXGlobalMatrix = n.rep([averageBetaVector.length, averageBetaVector.length], 0);

  for (let i = 0; i < userResults.length; i += 1) {
    varXGlobalMatrix = n.add(varXGlobalMatrix, userResults[i].data.varXLocalMatrix);
  }

  /* eslint-disable no-console */
  console.log('varXGlobalMatrix is', varXGlobalMatrix);
  /* eslint-enable no-console */

  const varBetaGlobal = n.mul(n.inv(varXGlobalMatrix), varError);

  for (let i = 0; i < averageBetaVector.length; i += 1) {
    seBetaGlobal[i] = Math.sqrt(varBetaGlobal[i][i]);
    tValueGlobal[i] = averageBetaVector[i] / seBetaGlobal[i];
  }

  const rSquaredGlobal = 1 - (sseGlobal / sstGlobal);
  const tDist = distributions.Studentt(globalYCount - averageBetaVector.length);
  const tCdf = tValueGlobal.map(r => tDist.cdf(Math.abs(r)));
  const pValueGlobal = n.mul(2, (n.sub(1, tCdf))); // two tail pValue

  /* eslint-disable no-console */
  console.log('The global r squared for averageBetaVector :', rSquaredGlobal);
  console.log('The global t Values for averageBetaVector :', tValueGlobal);
  console.log('The global p Values for averageBetaVector :', pValueGlobal);
  /* eslint-disable no-console */

  const result = {
    complete: true,
    global: {
      betaVector: averageBetaVector,
      degreesOfFreedom: globalYCount - averageBetaVector.length,
      pValue: pValueGlobal,
      rSquared: rSquaredGlobal,
      tValue: tValueGlobal,
    },
  };

  /**
   * Iterate over users' statistics and append to results document.
   *
   * @todo Improve performance by removing redundant iteration.
   */
  betaVectorLocal.forEach((betaVector, i) => {
    result[i] = {
      betaVector,
      degreesOfFreedom: userResults[i].data.localCount - betaVector.length,
      pValue: pValueLocal[i],
      pValueOriginal: pValueLocalOriginal[i],
      rSquared: rSquaredLocal[i],
      rSquaredOriginal: rSquaredLocalOriginal[i],
      tValue: tValueLocal[i],
      tValueOriginal: tValueLocalOriginal[i],
    };
  });

  console.log('Final result!', result);

  return result;
};

remote(process.argv.slice(2));
