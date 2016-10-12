'use strict';

module.exports = { // eslint-disable-line
  name: 'process-dir',
  version: '0.0.1',
  cwd: __dirname,
  local: {
    type: 'cmd',
    cmd: 'python2.7',
    args: ['./rigid_regress.py'],
    verbose: true,
  },
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
      let beta0=beta.map(r=>r.beta0);
      let beta1=beta.map(r=>r.beta1);
      
      var sum_beta0 = 0;
      var sum_beta1 = 0;

      for( var i = 0; i < beta.length; i++ ){
         sum_beta0 += beta0[i];
         sum_beta1 += beta1[i]; //don't forget to add the base
      }

      var avg_beta0 = sum_beta0/beta.length;
      var avg_beta1 = sum_beta1/beta.length;

      console.log('done! the average beta0 is',avg_beta0,"average beta1 is",avg_beta1);
      return data;
    },
  },
  plugins:['group-step'],
};
