'use strict';

const n = require('numeric');

module.exports = {
  defaultLambda: 1,

  objective(w, xVals, yVals, lambda) {
    const localLambda = lambda || this.defaultLambda;
    return n.sum(n.pow(n.sub(yVals, n.dot(xVals, w)), 2)) +
      (localLambda * n.dot(w, w) * 0.5);
  },

  oneShot(xVals, yVals, initialMVals) {
    const localInitialMVals = initialMVals || n.random(n.dim(xVals[0]));
    /* eslint-disable no-console */
    console.log('xVals are:', xVals);
    console.log('yVals are:', yVals);
    console.log('localInitialMVals are:', localInitialMVals);
    /* eslint-enable no-console */
    return n.uncmin(w => this.objective(w, xVals, yVals), localInitialMVals, 0.001).solution;
  },

  rSquared(xVals, yVals, betaVector) {
    const SSresidual = n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2));
    const meanyVals = n.sum(yVals) / yVals.length;
    const SStotal = n.sum(n.pow(n.sub(yVals, n.rep(n.dim(yVals), meanyVals)), 2));
    return 1 - (SSresidual / SStotal);
  },

  tValue(xVals, yVals, betaVector) {
    const varError =
      (1 / (n.dim(yVals) - 2)) *
      (n.sum(n.pow(n.sub(yVals, n.dot(xVals, betaVector)), 2)));
    const varBeta = n.mul(n.inv(n.dot(n.transpose(xVals), xVals)), varError);
   // initialize seBeta list
    const seBeta = [];
    for (let i = 0; i < betaVector.length; i += 1) {
      seBeta.push(Math.sqrt(varBeta[i][i]));
    }
   // calcualte the T value from seBeta
    const tValue = [];
    for (let i = 0; i < betaVector.length; i += 1) {
      tValue.push(betaVector[i] / seBeta[i]);
    }
    return tValue;
  },

};
