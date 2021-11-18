import assert from 'assert';
import { createCurrencyRatio } from '@makerdao/currency';
import Maker from '@makerdao/dai';
import { McdPlugin, ETH, USD, GNT } from '../src';
import { stringToBytes } from '../src/utils';
import { ServiceRoles } from '../src/constants';
import ethAbi from 'web3-eth-abi';
import BigNumber from 'bignumber.js';
import { RAY } from '../src/constants';

export async function mcdMaker({
  preset = 'test',
  network = 'testnet',
  prefetch = true,
  addressOverrides = undefined,
  cdpTypes = undefined,
  multicall = true,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [[McdPlugin, { cdpTypes, addressOverrides, network, prefetch }]],
    web3: {
      pollingInterval: 100
    },
    multicall,
    ...settings
  });
  return maker;
}

export async function setPrice(maker, ratio, ilk) {
  const ilkBytes = stringToBytes(ilk);
  const scs = maker.service('smartContract');
  const { symbol } = ratio.denominator;
  const pip = scs.getContract('PIP_' + symbol);

  // using uint here instead of bytes32 so it gets left-padded
  const val = (ethAbi as any).encodeParameter('uint', ratio.toFixed('wei'));
  await pip.poke(val);
  await scs.getContract('MCD_SPOT').poke(ilkBytes);

  //check that setPrice worked
  const data = maker.service(ServiceRoles.SYSTEM_DATA);
  const { spot } = await data.vat.ilks(ilkBytes);
  const spotBN = new BigNumber(spot.toString()).dividedBy(RAY);
  const par = await data.spot.par();
  const parBN = new BigNumber(par.toString()).dividedBy(RAY);
  const { mat } = await data.spot.ilks(ilkBytes);
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

type Options = {
  mint?: number;
  price?: number;
};

export async function setupCollateral(maker, ilk, options: Options = {}) {
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
