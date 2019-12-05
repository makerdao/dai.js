// usage:
// > node_modules/.bin/babel-node scripts/fundTestAccount.js <address>

import Maker from '../packages/dai/src';
import McdPlugin from '../packages/dai-plugin-mcd/src';
import { isAddress } from 'web3-utils';
import map from 'lodash/map';
import uniq from 'lodash/uniq';
import { MDAI, ETH } from '../packages/dai-plugin-mcd/src/index';
import { mcdMaker, setupCollateral } from '../packages/dai-plugin-mcd/test/helpers';

async function main() {
  const maker = await mcdMaker();
  const address = process.argv[process.argv.length - 2];
  const amount = process.argv[process.argv.length - 1];
  if (!isAddress(address)) {
    console.log('Pass a valid address as the last argument.');
    return;
  }

  maker.service('accounts').useAccountWithAddress(address);
  const savingsService = maker.service('mcd:savings');
  const dai = maker.getToken(MDAI);
  const proxyAddress = await maker.service('proxy').ensureProxy();
  process.stdout.write(`Proxy address ${proxyAddress} `);
  await dai.approveUnlimited(proxyAddress);

  console.log(`Generating DAI for ${address}`);
  const cdpMgr = maker.service('mcd:cdpManager');
  await setupCollateral(maker, 'ETH-A', { price: 150, debtCeiling: 50 });
  await cdpMgr.openLockAndDraw('ETH-A', ETH(1), MDAI(amount));

  await maker.service('allowance').removeAllowance('MDAI', proxyAddress);

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
