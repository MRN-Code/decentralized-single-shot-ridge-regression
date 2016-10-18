import json;
import argparse
from os import listdir
from os.path import isfile, join
import sys
import numpy as np
import sklearn
import sklearn.linear_model

parser = argparse.ArgumentParser(description='help read in my data from my local machine!')
parser.add_argument('--run', type=str,  help='grab coinstac args')
args = parser.parse_args()
args.run = json.loads(args.run)

username = args.run['username']

# inspect what args were passed
# runInputs = json.dumps(args.run, sort_keys=True, indent=4, separators=(',', ': '))
# sys.stderr.write(runInputs + "\n")

if 'remoteResult' in args.run and \
    'data' in args.run['remoteResult'] and \
    username in args.run['remoteResult']['data']:
    sys.exit(0); # no-op!  we already contributed our data

passedDir = args.run['userData']['dirs'][0]
sys.stderr.write("reading files from dir: " + passedDir)

files = [f for f in listdir(passedDir) if isfile(join(passedDir, f))]

### calculate the beta from each site ###

# allFileData = {}

for f in files:
    
    data=np.load(join(passedDir,f))
    x=data[:,:-1]
    label=data[:,-1]
#    result=linregress(x,label)    
#    allFileData[f] = np.load(join(passedDir, f))
    clf=sklearn.linear_model.Ridge(alpha=1.0,fit_intercept=True,normalize=False,copy_X=True,max_iter=None,tol=0.001,solver='auto',random_state=None)
     
    result=clf.fit(x,label)
    beta_vector=np.insert(result.coef_,0,result.intercept_)

computationOutput = json.dumps({'beta_vector': beta_vector.tolist()}, sort_keys=True, indent=4, separators=(',', ': '))

# preview output data
# sys.stderr.write(computationOutput + "\n")

# send results
sys.stdout.write(computationOutput)

