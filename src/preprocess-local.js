'use strict';

const { DECLARATION_INPUTS_KEY } = require('./constants.js');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const get = require('lodash/get');
const regression = require('./regression');
const distributions = require('distributions');
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

const preprocess = (opts) => {
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
};

preprocess(process.argv.slice(2));
