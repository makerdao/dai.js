import Maker from '@makerdao/dai';
import MigrationPlugin from '../../src';
import { createCurrencyRatio } from '@makerdao/currency';
import McdPlugin, {
  ServiceRoles,
  ETH,
  GNT,
  USD
} from '@makerdao/dai-plugin-mcd';
import ethAbi from 'web3-eth-abi';

export function stringToBytes(str) {
  return '0x' + Buffer.from(str).toString('hex');
}

export function bytesToString(hex) {
  return Buffer.from(hex.replace(/^0x/, ''), 'hex')
    .toString()
    .replace(/\x00/g, ''); // eslint-disable-line no-control-regex
}

export async function setPrice(maker, ratio, ilk) {
  const scs = maker.service('smartContract');
  const { symbol } = ratio.denominator;
  const pip = scs.getContract('PIP_' + symbol);

  // using uint here instead of bytes32 so it gets left-padded
  const val = ethAbi.encodeParameter('uint', ratio.toFixed('wei'));
  await pip.poke(val);
  await scs.getContract('MCD_SPOT').poke(stringToBytes(ilk));
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
  if (options.price)
    await setPrice(
      maker,
      createCurrencyRatio(USD, currency)(options.price),
      ilk
    );
}

export async function migrationMaker({
  preset = 'test',
  network = 'testnet',
  addressOverrides,
  ...settings
} = {}) {
  const maker = await Maker.create(preset, {
    plugins: [
      [McdPlugin, { network }],
      [MigrationPlugin, { addressOverrides, network }]
    ],
    log: false,
    web3: {
      pollingInterval: 50
    },
    ...settings
  });
  await maker.authenticate();
  return maker;
}

export async function placeLimitOrder(otcService) {
  // We need to update this function to sell MKR
  const wethToken = otcService.get('token').getToken(WETH);
  const wethAddress = wethToken.address();
  const daiToken = otcService.get('token').getToken(DAI);
  const daiAddress = daiToken.address();
  const oasisAddress = otcService
    .get('smartContract')
    .getContractByName('MAKER_OTC').address;
  const mkrAddress = otcService.get('token').getToken('MKR');
  const sellToken = sellDai ? daiAddress : wethAddress;
  const buyToken = sellDai ? wethAddress : daiAddress;
  const value = sellDai ? utils.parseEther('2.0') : utils.parseEther('10.0');
  const position = sellDai ? 0 : 1;

  await wethToken.approveUnlimited(oasisAddress);
  await wethToken.deposit('1');
  await daiToken.approveUnlimited(oasisAddress);
  
  return await offer(
    otcService,
    utils.parseEther('0.5'),
    sellToken,
    value,
    buyToken,
    position
  );
}

async function offer(
  otcService,
  payAmount,
  payTokenAddress,
  buyAmount,
  buyTokenAddress,
  position
) {
  const oasisContract = otcService
    .get('smartContract')
    .getContractByName('MAKER_OTC');

  const tx = await oasisContract.offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    position
  );
  return await tx.mine();
}
