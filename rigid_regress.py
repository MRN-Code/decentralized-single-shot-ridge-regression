import json;
import argparse
from os import listdir
from os.path import isfile, join
import sys
import numpy as np
import scipy as spy
from  scipy.stats import linregress


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

allFileData = {}
meanData = {}
for f in files:
    
    data=np.load(join(passedDir,f))
    x=data[:,0]
    label=data[:,1]
    result=linregress(x,label)    
#    allFileData[f] = np.load(join(passedDir, f))


computationOutput = json.dumps({'beta0':result[1],'beta1':result[0]}, sort_keys=True, indent=4, separators=(',', ': '))

# preview output data
# sys.stderr.write(computationOutput + "\n")

# send results
sys.stdout.write(computationOutput)

