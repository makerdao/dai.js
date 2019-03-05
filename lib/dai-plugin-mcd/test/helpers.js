import assert from 'assert';
import Maker from '@makerdao/dai';
import McdPlugin, { DGX, REP, MDAI } from '../src';
import { ServiceRoles } from '../src/constants';
import { stringToBytes } from '../src/utils';
import ethAbi from 'web3-eth-abi';
const { createCurrencyRatio, ETH, USD } = Maker;

export async function mcdMaker(settings) {
  const maker = await Maker.create('test', {
    plugins: [
      [
        McdPlugin,
        {
          cdpTypes: [
            { currency: ETH },
            { currency: REP },
            { currency: DGX }

            // TODO not ready for this one yet -- need the ability to
            // deploy contracts from within JS
            // { currency: REP, name: 'REP-ALT' }
          ]
        }
      ]
    ],
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
  const val = ethAbi.encodeParameter('uint', ratio.toEthersBigNumber('wei'));
  await pip.poke(val);

  const spot = scs.getContract('MCD_SPOT');
  await spot.poke(stringToBytes(ilk));

  const data = maker.service(ServiceRoles.SYSTEM_DATA);
  const ilkInfo = await data.pit.ilks(stringToBytes(ilk));
  assert(ratio.toEthersBigNumber('ray').eq(ilkInfo.spot));
}

// if currency is omitted, set the debt ceiling for that ilk;
// otherwise, set the system-wide debt ceiling
export async function setDebtCeiling(maker, amount, ilk) {
  const scs = maker.service('smartContract');
  const momLib = scs.getContract('MCD_MOM_LIB');

  const method = ilk
    ? 'file(address,bytes32,bytes32,uint256)'
    : 'file(address,bytes32,uint256)';

  // this will fail silently if we have the wrong address for MCD_MOM_LIB
  await momLib[method](
    ...[
      scs.getContractAddress('MCD_PIT'),
      ilk && stringToBytes(ilk),
      stringToBytes(ilk ? 'line' : 'Line'),
      ethAbi.encodeParameter('uint', amount.toEthersBigNumber('wei')),
      { dsProxy: scs.getContractAddress('MCD_MOM') }
    ].filter(x => x)
  );

  const data = maker.service(ServiceRoles.SYSTEM_DATA);
  if (ilk) {
    const { line } = await data.pit.ilks(stringToBytes(ilk));
    assert(
      amount.toEthersBigNumber('wei').eq(line),
      "Debt ceiling didn't change. We may have the wrong address for MomLib"
    );
  } else {
    const Line = await data.pit.Line();
    assert(
      amount.toEthersBigNumber('wei').eq(Line),
      "Debt ceiling didn't change. We may have the wrong address for MomLib"
    );
  }
}

export async function setLiquidationPenalty(maker, amount, ilk) {
  const scs = maker.service('smartContract');
  const momLib = scs.getContract('MCD_MOM_LIB');

  const method = 'file(address,bytes32,bytes32,uint256)';

  // this will fail silently if we have the wrong address for MCD_MOM_LIB
  await momLib[method](
    scs.getContractAddress('MCD_CAT'),
    stringToBytes(ilk),
    stringToBytes('chop', false),
    ethAbi.encodeParameter('uint', amount),
    { dsProxy: scs.getContractAddress('MCD_MOM') }
  );
}

//amount is stability fee per second, in format 1.X
export async function setStabilityFee(maker, amount, ilk) {
  const scs = maker.service('smartContract');
  const momLib = scs.getContract('MCD_MOM_LIB');

  const method = 'file(address,bytes32,bytes32,uint256)';

  // this will fail silently if we have the wrong address for MCD_MOM_LIB
  await momLib[method](
    scs.getContractAddress('MCD_JUG'),
    stringToBytes(ilk),
    stringToBytes('tax', false),
    ethAbi.encodeParameter('uint', amount),
    { dsProxy: scs.getContractAddress('MCD_MOM') }
  );
}

//amount is base rate per second, in format 0.X
export async function setBaseRate(maker, amount) {
  const scs = maker.service('smartContract');
  const momLib = scs.getContract('MCD_MOM_LIB');

  const method = 'file(address,bytes32,uint256)';

  // this will fail silently if we have the wrong address for MCD_MOM_LIB
  await momLib[method](
    scs.getContractAddress('MCD_JUG'),
    stringToBytes('repo', false),
    ethAbi.encodeParameter('uint', amount),
    { dsProxy: scs.getContractAddress('MCD_MOM') }
  );
}

export async function mint(maker, amount) {
  // the current account must own the token contract
  const token = maker.getToken(amount.symbol);
  const startBalance = await token.balance();
  await token._contract['mint(uint256)'](amount.toEthersBigNumber('wei'));
  const endBalance = await token.balance();
  expect(endBalance.minus(startBalance)).toEqual(amount);
}

export async function setupCollateral(maker, ilk, options = {}) {
  const proxy = await maker.currentProxy();
  const { currency } = maker
    .service(ServiceRoles.CDP_TYPE)
    .getCdpType(null, ilk);
  if (currency !== ETH) {
    await maker.getToken(currency).approveUnlimited(proxy);
    if (options.mint) await mint(maker, currency(options.mint));
  }
  if (options.price)
    await setPrice(
      maker,
      createCurrencyRatio(USD, currency)(options.price),
      ilk
    );
  if (options.debtCeiling)
    await setDebtCeiling(maker, MDAI(options.debtCeiling), ilk);
}

// set up a price feed for an ilk; if address is not specified, use the
// address of the default price feed for the gem
export async function setupPriceFeed(maker, ilk, GEM, address) {
  const scs = maker.service('smartContract');

  if (!address) {
    const spot = scs.getContract('MCD_SPOT');
    address = (await spot.ilks(stringToBytes(GEM.symbol))).pip;
  }

  const momLib = scs.getContract('MCD_MOM_LIB');
  await momLib['file(address,bytes32,address)'](
    scs.getContractAddress('MCD_SPOT'),
    stringToBytes(ilk),
    address,
    { dsProxy: scs.getContractAddress('MCD_MOM') }
  );
}

export async function setLiquidationRatio(maker, ilk, amount) {
  const scs = maker.service('smartContract');

  const momLib = scs.getContract('MCD_MOM_LIB');
  await momLib['file(address,bytes32,bytes32,uint256)'](
    scs.getContractAddress('MCD_SPOT'),
    stringToBytes(ilk),
    stringToBytes('mat'),
    ethAbi.encodeParameter('uint', amount.toEthersBigNumber('ray')),
    { dsProxy: scs.getContractAddress('MCD_MOM') }
  );
}
