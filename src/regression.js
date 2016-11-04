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
    return n.uncmin(w => this.objective(w, xVals, yVals), localInitialMVals, 0.0001).solution;
  },
};
