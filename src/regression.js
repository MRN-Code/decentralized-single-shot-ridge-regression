'se strict';
const n = require('numeric');

module.exports = {
  defaultLambda: 0.0,

  objective(w, xVals, yVals, lambda) {
    const localLambda = lambda || this.defaultLambda;
    return n.sum(n.pow(n.sub(yVals, n.dot(xVals, w)), 2)) +
      (localLambda * n.dot(w, w) * 0.5);
  },
  
  oneShot(xVals, yVals, initialMVals) {
    const localInitialMVals = initialMVals || n.random(n.dim(xVals[0]));
    console.log('xVals are:',xVals);
    console.log('yVals are:',yVals);
    console.log('localInitialMVals are:',localInitialMVals);
    return n.uncmin(w => this.objective(w, xVals, yVals), localInitialMVals).solution;
  },
}
