import assert from 'assert';
import { createCurrencyRatio } from '@makerdao/currency';
import Maker from '@makerdao/dai';
import McdPlugin, { ETH, USD } from '../src';
import { ServiceRoles } from '../src/constants';
import { stringToBytes } from '../src/utils';
import ethAbi from 'web3-eth-abi';
import BigNumber from 'bignumber.js';
import { RAY } from '../src/constants';

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

async function execPlan(maker, data) {
  const scs = maker.service('smartContract');
  const pause = scs.getContract('MCD_PAUSE');
  const planAddress = scs.getContractAddress('MCD_PAUSE_PROXY');
  const currentAddress = maker.service('web3').currentAddress();
  console.log(currentAddress);
  const era = Math.ceil(new Date().getTime() / 1000);
  const web3 = maker.service('web3')._web3;
  const planId = web3.utils.keccak256(
    web3.eth.abi.encodeParameters(
      ['address', 'bytes', 'uint'],
      [planAddress, data, era]
    )
  );
  await pause.plot(currentAddress, planAddress, data, era);
  const plan = await pause.plans(planId);
  console.log('plan is plotted as expected:', plan);
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    await pause.exec(planAddress, data, era);
  } catch (err) {
    console.error(err);
  }
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

// if currency is omitted, set the debt ceiling for that ilk;
// otherwise, set the system-wide debt ceiling
export async function setDebtCeiling(maker, amount, ilk) {
  const scs = maker.service('smartContract');

  const method = ilk
    ? 'file(address,bytes32,bytes32,uint256)'
    : 'file(address,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    ...[
      scs.getContractAddress('MCD_VAT'),
      ilk && stringToBytes(ilk),
      stringToBytes(ilk ? 'line' : 'Line'),
      ethAbi.encodeParameter('uint', amount.toFixed('rad'))
    ].filter(x => x)
  );

  await execPlan(maker, data);

  // is destructuring over a getter safe?
  const { vat } = maker.service(ServiceRoles.SYSTEM_DATA);

  if (ilk) {
    const { line } = await vat.ilks(stringToBytes(ilk));
    assert(
      amount.toFixed('rad') === line.toString(),
      "Debt ceiling didn't change."
    );
  } else {
    const Line = await vat.Line();
    assert(
      amount.toFixed('rad') === Line.toString(),
      "Debt ceiling didn't change."
    );
  }
}

export async function setLiquidationPenalty(maker, amount, ilk) {
  const scs = maker.service('smartContract');

  const method = 'file(address,bytes32,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_CAT'),
    stringToBytes(ilk),
    stringToBytes('chop', false),
    ethAbi.encodeParameter('uint', amount)
  );
  await execPlan(maker, data);
}

//amount is stability fee per second, in format 1.X
export async function setStabilityFee(maker, amount, ilk) {
  const scs = maker.service('smartContract');

  const method = 'file(address,bytes32,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_JUG'),
    stringToBytes(ilk),
    stringToBytes('duty', false),
    ethAbi.encodeParameter('uint', amount)
  );

  await execPlan(maker, data);
}

//amount is base rate per second, in format 0.X
export async function setBaseRate(maker, amount) {
  const scs = maker.service('smartContract');

  const method = 'file(address,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_JUG'),
    stringToBytes('base', false),
    ethAbi.encodeParameter('uint', amount)
  );

  await execPlan(maker, data);
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
  if (currency !== ETH) {
    // FIXME not safe to assume other tokens support approveUnlimited
    await maker.getToken(currency).approveUnlimited(proxy);
    if (options.mint) await mint(maker, currency(options.mint));
  }
  if (options.price)
    await setPrice(
      maker,
      createCurrencyRatio(USD, currency)(options.price),
      ilk
    );
}

// set up a price feed for an ilk; if address is not specified, use the
// address of the default price feed for the gem
export async function setupPriceFeed(maker, ilk, GEM, address) {
  const scs = maker.service('smartContract');

  if (!address) {
    const spot = scs.getContract('MCD_SPOT');
    address = (await spot.ilks(stringToBytes(GEM.symbol))).pip;
  }

  const method = 'file(address,bytes32,address)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_SPOT'),
    stringToBytes(ilk),
    address
  );

  await execPlan(maker, data);
}

export async function setLiquidationRatio(maker, ilk, amount) {
  const scs = maker.service('smartContract');

  const method = 'file(address,bytes32,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_SPOT'),
    stringToBytes(ilk),
    stringToBytes('mat'),
    ethAbi.encodeParameter('uint', amount.toFixed('ray'))
  );

  await execPlan(maker, data);
}

export async function setPar(maker, amount) {
  const scs = maker.service('smartContract');

  const method = 'file(address,bytes32,uint256)';

  const plan = scs.getContract('MCD_PAUSE_PROXY');
  const { data } = plan.interface.functions[method](
    scs.getContractAddress('MCD_SPOT'),
    stringToBytes('par'),
    ethAbi.encodeParameter('uint', BigNumber(amount).multipliedBy(RAY))
  );

  await execPlan(maker, data);
}
