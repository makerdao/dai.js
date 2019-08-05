import assert from 'assert';
import { createCurrencyRatio } from '@makerdao/currency';
import Maker from '@makerdao/dai';
import McdPlugin, { ETH, USD, GNT } from '../src';
import { ServiceRoles } from '../src/constants';
import { stringToBytes } from '../src/utils';
import ethAbi from 'web3-eth-abi';
import BigNumber from 'bignumber.js';
import { RAY } from '../src/constants';
import { callGanache } from 'test-helpers';

export async function mcdMaker({
  preset = 'test',
  network = 'testnet',
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [[McdPlugin, { addressOverrides, network }]],
    log: false,
    ...settings
  });
  await maker.authenticate();
  return maker;
}

export async function setPrice(maker, ratio, ilk) {
  const scs = maker.service('smartContract');
  const { symbol } = ratio.denominator;
  const pip = scs.getContract('PIP_' + symbol);

  // using uint here instead of bytes32 so it gets left-padded
  const val = ethAbi.encodeParameter('uint', ratio.toFixed('wei'));
  await pip.poke(val);
  await scs.getContract('MCD_SPOT').poke(stringToBytes(ilk));

  //check that setPrice worked
  const data = maker.service(ServiceRoles.SYSTEM_DATA);
  const { spot } = await data.vat.ilks(stringToBytes(ilk));
  const spotBN = new BigNumber(spot.toString()).dividedBy(RAY);
  const par = await data.spot.par();
  const parBN = new BigNumber(par.toString()).dividedBy(RAY);
  const { mat } = await data.spot.ilks(stringToBytes(ilk));
  const matBN = new BigNumber(mat.toString()).dividedBy(RAY);
  assert(
    ratio.toNumber() ===
      spotBN
        .times(parBN)
        .times(matBN)
        .toNumber(),
    'setPrice did not work'
  );
}

export async function mint(maker, amount) {
  // the current account must own the token contract
  const token = maker.getToken(amount.symbol);
  const startBalance = await token.balance();
  await token._contract['mint(uint256)'](amount.toFixed('wei'));
  const endBalance = await token.balance();
  expect(endBalance.minus(startBalance)).toEqual(amount);
}

export async function setupCollateral(maker, ilk, options = {}) {
  const proxy = await maker.currentProxy();
  const cdpType = maker.service(ServiceRoles.CDP_TYPE).getCdpType(null, ilk);
  const { currency } = cdpType;

  // The following currencies don't support `approveUnlimited`
  const skipApproval = [ETH, GNT];

  if (!skipApproval.includes(currency)) {
    await maker.getToken(currency).approveUnlimited(proxy);
  }
  if (options.mint) await mint(maker, currency(options.mint));
  if (options.price)
    await setPrice(
      maker,
      createCurrencyRatio(USD, currency)(options.price),
      ilk
    );
}

export async function takeSnapshot(maker) {
  let snapshotData = {};
  const res = await callGanache('evm_snapshot');
  const { result } = await res.json();
  snapshotData.snapshotId = parseInt(result, 16);

  if (maker) {
    const nonceService = maker.service('nonce');
    const currentAddress = maker.service('web3').currentAddress();
    snapshotData.transactionCount = nonceService._counts[currentAddress];
  }

  return snapshotData;
}

export async function restoreSnapshot(snapshotData, maker) {
  const res = await callGanache('evm_revert', [snapshotData.snapshotId]);

  if (maker && snapshotData.transactionCount) {
    const currentAddress = maker.service('web3').currentAddress();
    maker.service('nonce')._counts[currentAddress] =
      snapshotData.transactionCount;
  }

  return (await res.json()).result;
}
