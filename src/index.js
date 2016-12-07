'use strict';

const regression = require('./regression');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const get = require('lodash/get');
const pkg = require('../package.json');
const n = require('numeric');

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
      const files = get(opts, 'userData.files');

      // TODO: This is a hack for simulator. Figure out how to load plugin state
      /* eslint-disable no-underscore-dangle */
      if (!features && opts.userData.__FEATURES__) {
        features = opts.userData.__FEATURES__;
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
      }

      const pickFeature = getFreeSurferDataPicker(features[0]);

      return Promise.all(files.map(f => readFileAsync(f.filename)))
        .then(freeSurferDatas => { // eslint-disable-line arrow-parens
          const x = files.map(getNormalizedTags); // covariates
          const y = freeSurferDatas.map(pickFeature); // RoIs

          // calculate regression result and localMeanY
          const biasedX = x.map(covariates => [1].concat(covariates));
          const localCount = y.length;
          const betaVector = regression.oneShot(biasedX, y);
          const rSquared = regression.rSquared(biasedX, y, betaVector);
          const tValue = regression.tValue(biasedX, y, betaVector);
          const localMeanY = n.sum(y) / localCount;

          /* eslint-disable no-console */
          console.log('X is:', biasedX);
          console.log('y is:', y);
          console.log('beta vector is:', betaVector);
          console.log('local r square of fitting is:', rSquared);
          console.log('local tValues of betaVector are:', tValue);
          /* eslint-enable no-console */

          return {
            betaVector,
            localCount,
            localMeanY,
            rSquared,
            tValue,
          };
        });
    },
    inputs: [{
      help: 'Select Freesurfer region(s) of interest',
      label: 'Freesurfer ROI',
      type: 'select',
      values: FreeSurfer.validFields,
    }, {
      label: 'Covariates',
      type: 'covariates',
    }],
  }, {
    // step two: receive the globalMeanY and averageBetaVector, then calculate sseLocal, sstLocal and varXLocal
    type: 'function',
    fn(opts) {
      const globalMeanY = opts.remoteResult.data.globalMeanY;
      const averageBetaVector = opts.remoteResult.data.averageBetaVector;
      const biasedX = opts.previousData.biasedX;
      const y = opts.previousData.y;
      const localCount = y.length;

      // calculate sseLocal and sstLocal
      const sseLocal=n.sum(n.pow(n.sub(y, n.dot(biasedX, averageBetaVector)), 2));
      const sstLocal=n.sum(n.pow(n.sub(y, n.rep(n.dim(y), globalMeanY)), 2));

      // calculate varXLocal
      
      const varXLocalMatrix=n.dot(n.transpose(biasedX),biasedX);
      const varXLocal=[];
      for (let i=0; i<averageBetaVector.length; i += 1) {
         varXLocal.push(varXLocalMatrix[i][i]);
      }
    
      /* eslint-disable no-console */
      console.log('globalMeanY:', globalMeanY);
      console.log('opts is:', opts);
      /* eslint-enable no-console */
       
      return { 
        sseLocal;
        sstLocal;
        varXLocal;
        averageBetaVector;
        localCount;
        };
    },

  }],
  remote: [{
    type: 'function',
    fn(opts) {
      const userResults = opts.userResults;

      // Not all user results contain betas. Return early.
      if (userResults.some(userResult => !((userResult || {}).data || {}).betaVector)) {
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
      
      // calculate globalMeanY
      const siteCount=userResults.length;  
      var totalY=0;
      var globalYCount=0;
       
      for (let i=0; i < siteCount; i += 1) {
         totalY += userResults[i].data.localMeanY*userResults[i].data.localCount;
         globalYCount += userResults[i].data.localCount;
      } 

      const globalMeanY = totalY/globalYCount;
   
      /* eslint-disable no-console */
      console.log('Average beta vector:', averageBetaVector);
      console.log('globalMeanY is :', userResults[0]);
      /* eslint-enable no-console */

      return {
        averageBetaVector,
        globalMeanY,
//        complete: true,
      };
    },
    verbose: true,
  }, {
    // get sstNode from each local node and calculate the statistics
    type: 'function',
    fn(opts) {
    // console.log('opts.userResults:',opts.userResults[0]);
    // calcuate globalRSquared
    const userResults = opts.userResults;
    const sseGlobal = userResults.reduce((sum, userResult) => sum + userResult.data.sseLocal, 0);
    
      
      const sstNode1 = opts.userResults[0].data.sstNode;
      


      return {
        averageBetaVector;
        rSquared;
        tValue;,
        complete: true,
      };
    },
    verbose: true,
  }],
  plugins: ['group-step', 'inputs'],
};
