'use strict';

const regression=require('./regression');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const pkg = require('../package.json');

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
      let features = ((((opts.remoteResult || {}).pluginState || {}).inputs || [])[0] || [])[0];
      const files = (opts.userData || {}).files;

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
        .then(freeSurferDatas => ({
          X: files.map(getNormalizedTags), // covariates
          y: freeSurferDatas.map(pickFeature), // RoIs
        }));
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
// oneshotridgeregression begin 
    type: 'function',
//    cmd: 'python',
//    args: ['./ridge_regress.py'],
//    verbose: true,
   // get dimension of the data
    fn(opts) {

   //   const beta=regression.oneShot(opts.previousData.X,opts.previousData.y)
   //    console.log('beta vector is:',beta);
   //   return beta 
    const previousData=opts.previousData;
   // add bias for X 
    for (var i=0; i<opts.previousData.X.length; i++){ 
     previousData.X[i].splice(0,0,1);
    }
    
    let beta_vector=regression.oneShot(previousData.X,previousData.y);
    console.log('X is:',previousData.X);
    console.log('y is:',previousData.y);
    console.log('beta vector is:',beta_vector);
    const beta_vector_json={'beta_vector':beta_vector};
    return beta_vector_json;
  }
 }],
  remote: {
    type: 'function',
    fn(opts) {
      const userResults = opts.userResults;

      // Not all user results contain betas. Return early.
      if (userResults.some(userResult => !((userResult || {}).data || {}).beta_vector)) {
        return {};
      }

      const averageBetaVector = userResults[0].data.beta_vector.reduce(
        (memo, col, index) => memo.concat(userResults.reduce(
          (sum, userResult) => sum + userResult.data.beta_vector[index],
          0
        ) / userResults.length),
        []
      );

      /* eslint-disable no-console */
      console.log('Average beta vector:', averageBetaVector);
      /* eslint-enable no-console */

      return {
        averageBetaVector,
        complete: true,
      };
    },
    verbose: true,
  },
  plugins: ['group-step', 'inputs'],
};
