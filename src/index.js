'use strict';

const regression = require('./regression');
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
          var tdist = distributions.Studentt(localCount-1);
          const tcdf = tValue.map(r => tdist.cdf(r));
          const pValue = n.mul(2,n.sub(1,tcdf)); 
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
      const rSquared = opts.previousData.rSquared;
      const tValue = opts.previousData.tValue;
      const pValue = opts.previousData.pValue;
      const betaVector = opts.previousData.betaVector;
      const localCount = y.length;

      //calculate the local r squred and t value for averageBetaVector)
      const rSquaredLocal = regression.rSquared(biasedX, y, averageBetaVector);
      const tValueLocal = regression.tValue(biasedX, y, averageBetaVector);
      var tdist=distributions.Studentt(localCount-1);
      const tcdf = tValueLocal.map(r => tdist.cdf(r));
      const pValueLocal = n.mul(2,n.sub(1,tcdf));

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
      console.log('local r squared for averageBetaVector', rSquaredLocal);
      console.log('local t Values for averageBetaVector', tValueLocal);
      console.log('local p Values for averageBetaVector', pValueLocal);
      /* eslint-enable no-console */
       
      return { 
        sseLocal,
        sstLocal,
        varXLocal,
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
      console.log('globalMeanY is :', globalMeanY);
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

    const userResults = opts.userResults;

    // get passed parameters from local nodes
    const averageBetaVector = userResults[0].data.averageBetaVector;
    const betaVectorLocal = userResults.map(r => r.data.betaVector);
    const rSquaredLocalOriginal = userResults.map(r => r.data.rSquared);
    const tValueLocalOriginal = userResults.map(r => r.data.tValue);
    const pValueLocalOriginal = userResults.map(r => r.data.pValue);
    const rSquaredLocal = userResults.map(r => r.data.rSquaredLocal);
    const tValueLocal = userResults.map(r => r.data.tValueLocal);
    const pValueLocal = userResults.map(r => r.data.pValueLocal);

    //calculate global parameters
    const sseGlobal = userResults.reduce((sum, userResult) => sum + userResult.data.sseLocal, 0);
    const sstGlobal = userResults.reduce((sum, userResult) => sum + userResult.data.sstLocal, 0);
    const globalYCount = userResults.reduce((sum,userResult) => sum + userResult.data.localCount,0);
    const betaCount = userResults[0].data.averageBetaVector.length;
    const varError = (1 /(globalYCount-2)) * sseGlobal;
    const varXGlobal = [];   
    const seBetaGlobal = [];
    const tValueGlobal = [];

   // calculate tValueGlobal 
    for (let i = 0; i < betaCount; i += 1) {
        varXGlobal[i] = userResults.reduce((sum, userResult) => sum + userResult.data.varXLocal[i], 0 );
        seBetaGlobal[i] = Math.sqrt(varError/varXGlobal[i]);
        tValueGlobal[i] = averageBetaVector[i]/seBetaGlobal[i];
       }

  // calculate r squared global    
    const rSquaredGlobal = 1-(sseGlobal/sstGlobal);
    
  // add t to p value transformation //
    var tdist=distributions.Studentt(globalYCount-1);
    const tcdf = tValueGlobal.map(r => tdist.cdf(r));
    const pValueGlobal=n.mul(2,(n.sub(1,tcdf))); // two tail pValue

    console.log('The global r squared for averageBetaVector :', rSquaredGlobal);
    console.log('The global t Values for averageBetaVector :', tValueGlobal);
    console.log('The global p Values for averageBetaVector :', pValueGlobal);

    return {
        betaVectorLocal,
        averageBetaVector,
        rSquaredLocalOriginal,
        tValueLocalOriginal,
        pValueLocalOriginal,
        rSquaredLocal,
        tValueLocal,
        pValueLocal,
        rSquaredGlobal,
        tValueGlobal,
        pValueGlobal,
        complete: true,
      };
    },
    verbose: true,
  }],
  plugins: ['group-step', 'inputs'],

}
