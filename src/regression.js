'use strict';

const n = require('numeric');

function objective(w, xVals, yVals, lambda) {
  return n.sum(n.pow(n.sub(yVals, n.dot(xVals, w)), 2)) +
    (lambda * n.dot(w, w) * 0.5);
}

/**
 * Get a single-shot solution.
 *
 * {@link http://www.numericjs.com/documentation.html}
 *
 * @param {Array} xVals
 * @param {Array} yVals
 * @param {number} lambda
 * @param {Array} [initialMVals]
 * @returns {Array}
 */
function oneShot(xVals, yVals, lambda, initialMVals) {
  const localInitialMVals = initialMVals || n.random(n.dim(xVals[0]));
  /* eslint-disable no-console */
  console.log('xVals are:', xVals);
  console.log('yVals are:', yVals);
  console.log('localInitialMVals are:', localInitialMVals);
  /* eslint-disable no-console */
  return n.uncmin(w => objective(w, xVals, yVals, lambda), localInitialMVals, 0.001).solution;
}

function rSquared(xVals, yVals, betaVector) {
  const SSresidual = n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2));
  const meanyVals = n.sum(yVals) / yVals.length;
  const SStotal = n.sum(n.pow(n.sub(yVals, n.rep(n.dim(yVals), meanyVals)), 2));
  return 1 - (SSresidual / SStotal);
}

function tValue(xVals, yVals, betaVector) {
  const varError = (1 / (n.dim(yVals) - n.dim(betaVector))) *
    (n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2)));
  const varBeta = n.mul(n.inv(n.dot(n.transpose(xVals), xVals)), varError);
  // initialize seBeta list
  const seBeta = [];
  for (let i = 0; i < betaVector.length; i += 1) {
    seBeta.push(Math.sqrt(varBeta[i][i]));
  }
  // calcualte the T value from seBeta
  const mytValue = [];
  for (let i = 0; i < betaVector.length; i += 1) {
    mytValue.push(betaVector[i] / seBeta[i]);
  }
  return mytValue;
}

module.exports = {
  objective,
  oneShot,
  rSquared,
  tValue,
};
