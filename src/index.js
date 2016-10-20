'use strict';

const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const pkg = require('../package.json');

/**
 * Get FreeSurfer region of interest picker.
 *
 * @param {string} feature
 * @returns {Function} FreeSurfer data picker
 */
const getFreeSurferDataPicker = feature => freeSurferData => {
  return new FreeSurfer({ string: freeSurferData })[feature];
};

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
      const features = ((((opts.remoteResult || {}).pluginState || {}).inputs || [])[0] || [])[0];
      const files = (opts.userData || {}).files;

      if (
        !Array.isArray(features) ||
        !features.length ||
        features.some(f => FreeSurfer.validFields.indexOf(f) < 0) ||
        !Array.isArray(files) ||
        !files.length
      ) {
        return Promise.reject(new Error('Bad local input'));
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
    type: 'cmd',
    cmd: 'python',
    args: ['./ridge_regress.py'],
    verbose: true,
  }],
  remote: {
    type: 'function',
    fn(opts) {
      const data = opts.previousData || {};
      opts.userResults.forEach(rslt => (data[rslt.username] = rslt.data));
      if (data && Object.keys(data).length === opts.usernames.length) {
        data.complete = true;
      }
      console.error(data); // eslint-disable-line
      let beta=opts.userResults.map(r=>r.data);
//      let intercept=beta.map(r=>r.intercept);
      let beta_vector=beta.map(r=>r.beta_vector);
      console.log(beta_vector)
      
//      var sum_intercept = 0;
      var sum_beta_vector = new Array(beta_vector[0].length).fill(0);

      for( var i = 0; i < beta.length; i++ ){
//         sum_intercept += intercept[i];
         for( var j=0; j < beta_vector[0].length; j++){
       
             sum_beta_vector[j] += beta_vector[i][j]; //don't forget to add the base
         }
      }
      console.log(sum_beta_vector)  
//      var avg_intercetp = sum_beta0/beta.length;

     var avg_beta_vector = new Array(beta_vector[0].length).fill(0);
     for( var i=0; i<beta_vector[0].length; i++){
        
         avg_beta_vector[i] = sum_beta_vector[i]/beta.length;
      }

      console.log('done! the average beta_vector is',avg_beta_vector);
      return data;
    },
  },
  plugins:['group-step', 'inputs'],
};
