/*
usage:
node getFunctionSignatures.js [path-with-ABI-files]
node getFunctionSignatures.js [path-with-ABI-files] --match 0x23b872dd
*/

const fs = require('fs');
const wea = require('web3-eth-abi');
const path = require('path');
const { cyan, green } = require('chalk');

const argv = require('minimist')(process.argv, { string: ['match', 'm'] });
const dir = argv._[argv._.length - 1];
const match = argv.match || argv.m;
if (match) console.log(`Searching for ${match}...`);

for (const filename of fs.readdirSync(dir)) {
  if (!match) console.log(cyan(filename));
  const abi = JSON.parse(fs.readFileSync(path.join(dir, filename)));
  for (const fn of abi.filter(x => x.type === 'function')) {
    const sig = wea.encodeFunctionSignature(fn);
    const name = `${fn.name}(${fn.inputs.map(i => i.type).join(',')})`;
    if (!match) {
      console.log(' ', sig, name);
    } else if (match === sig) {
      console.log(cyan(filename));
      console.log(' ', green(sig), name);
    }
  }
}
