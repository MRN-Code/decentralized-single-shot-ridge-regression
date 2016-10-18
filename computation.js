'use strict';

module.exports = { // eslint-disable-line
  name: 'process-dir',
  version: '0.0.1',
  cwd: __dirname,
  local: {
    type: 'cmd',
    cmd: 'python',
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
  plugins:['group-step'],
};
