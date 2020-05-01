// usage:
// > node_modules/.bin/babel-node packages/test-helpers/scripts/generateDai.js <address> <daiAmount>

import { isAddress } from 'web3-utils';
import { DAI, ETH } from '@makerdao/dai-plugin-mcd/src/index';
import { mcdMaker } from '@makerdao/dai-plugin-mcd/test/helpers';

async function main() {
  const maker = await mcdMaker();
  const address = process.argv[process.argv.length - 2];
  const amount = process.argv[process.argv.length - 1];
  if (!isAddress(address)) {
    console.log('Pass a valid address as the last argument.');
    return;
  }

  maker.service('accounts').useAccountWithAddress(address);
  console.log(`Generating ${amount} DAI for ${address}`);
  const cdpMgr = maker.service('mcd:cdpManager');

  await cdpMgr.openLockAndDraw('ETH-A', ETH(1), DAI(amount));

  const dai = cdpMgr.get('token').getToken(DAI);
  const balance = await dai.balanceOf(address)
  console.log(`Balance of ${address}: ${balance}`)

}

(async fn => {
  try {
    await fn();
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})(main);
