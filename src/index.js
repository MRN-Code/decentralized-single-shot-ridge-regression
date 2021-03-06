'use strict';

const alphanumSort = require('alphanum-sort');
const regression = require('./regression');
const { DEFAULT_LAMBDA, DECLARATION_INPUTS_KEY } = require('./constants.js');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const get = require('lodash/get');
const pkg = require('../package.json');
const n = require('numeric');
const distributions = require('distributions');


/**
 * Get FreeSurfer region of interest picker.
 *
 * @param {string} feature
 * @returns {Function} FreeSurfer data picker
 */
/* eslint-disable arrow-parens,arrow-body-style */
const getFreeSurferDataPicker = feature => freeSurferData => {
  return new FreeSurfer({ string: freeSurferData })[feature];
};
/* eslint-enable arrow-parens,arrow-body-style */

/**
 * Read file.
 *
 * @param {string} file
 * @returns {Promise} Resolves to `file`'s contents
 */
const readFileAsync = file => new Promise((resolve, reject) => {
  fs.readFile(file, (error, data) => {
    if (error) {
      reject(error);
    } else {
      resolve(data.toString());
    }
  });
});

/**
 * Get normalized tags.
 *
 * @param {Object} file
 * @param {Object} file.tags Hash map of tag names to values
 * @returns {Array} Normalized tags
 */
const getNormalizedTags = file => Object.keys(file.tags).sort().reduce(
  (memo, tag) => {
    const value = file.tags[tag];

    if (typeof value === 'boolean') {
      return memo.concat(value === true ? 1 : -1);
    } else if (typeof value === 'number') {
      return memo.concat(value);
    }

    return memo;
  },
  []
);

module.exports = {
  name: pkg.name,
  version: pkg.version,
  local: [{
    type: 'function',
    fn(opts) {
      let features = get(opts, 'remoteResult.pluginState.inputs[0][0]');
      let lambda = get(opts, 'remoteResult.pluginState.inputs[0][1]');
      const files = get(opts, 'userData.files');

      // TODO: This is a hack for simulator. Figure out how to load plugin state
      /* eslint-disable no-underscore-dangle */
      if (!features && opts.userData[DECLARATION_INPUTS_KEY]) {
        features = opts.userData[DECLARATION_INPUTS_KEY][0][0];
        lambda = opts.userData[DECLARATION_INPUTS_KEY][0][1];
      }
      /* eslint-enable no-underscore-dangle */

      if (!Array.isArray(features) || !features.length) {
        return Promise.reject(new Error('Expected RoI features inputs'));
      } else if (features.some(f => FreeSurfer.validFields.indexOf(f) < 0)) {
        return Promise.reject(new Error(
          `Invalid FreeSurfer feature in ${features.toString()}`
        ));
      } else if (!Array.isArray(files) || !files.length) {
        return Promise.reject(new Error('Expected user data to contain files'));
      } else if (typeof lambda !== 'number') {
        return Promise.reject(new Error('Lambda required'));
      }

      const pickFeature = getFreeSurferDataPicker(features[0]);

      return Promise.all(files.map(f => readFileAsync(f.filename)))
        .then(freeSurferDatas => { // eslint-disable-line arrow-parens
          const x = files.map(getNormalizedTags); // covariates
          const y = freeSurferDatas.map(pickFeature); // RoIs


          // calculate regression result and localMeanY
          const biasedX = x.map(covariates => [1].concat(covariates));
          const localCount = y.length;
          const betaVector = regression.oneShot(biasedX, y, lambda);
          const rSquared = regression.rSquared(biasedX, y, betaVector);
          const tValue = regression.tValue(biasedX, y, betaVector);
          /* eslint-disable new-cap */
          const tdist = distributions.Studentt(localCount - betaVector.length);
          /* eslint-disable new-cap */
          const tcdf = tValue.map(r => tdist.cdf(Math.abs(r)));
          const pValue = n.mul(2, n.sub(1, tcdf));
          const localMeanY = n.sum(y) / localCount;

          /* eslint-disable no-console */
          console.log('X is:', biasedX);
          console.log('y is:', y);
          console.log('beta vector is:', betaVector);
          console.log('local r squared for original betaVector:', rSquared);
          console.log('local t Values for original betaVector:', tValue);
          console.log('local p values for original betaVector:', pValue);
          /* eslint-enable no-console */

          return {
            betaVector,
            localCount,
            localMeanY,
            rSquared,
            tValue,
            pValue,
            biasedX,
            y,
          };
        });
    },
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
    type: 'function',
    fn(opts) {
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
    },

  }],
  remote: [{
    type: 'function',
    fn(opts) {
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
    },
    verbose: true,
  }, {
    // get sstNode from each local node and calculate the statistics
    type: 'function',
    fn(opts) {
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
    },
    verbose: true,
  }],
  plugins: ['group-step', 'inputs'],

};
