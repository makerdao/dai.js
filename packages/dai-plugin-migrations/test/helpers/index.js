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
