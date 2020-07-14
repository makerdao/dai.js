import Maker from '@makerdao/dai';
import MigrationPlugin from '../../src';
import { Migrations } from '../../src/constants';
import { createCurrencyRatio } from '@makerdao/currency';
import McdPlugin, {
  ServiceRoles,
  ETH,
  GNT,
  USD
} from '@makerdao/dai-plugin-mcd';
import ScdPlugin from '@makerdao/dai-plugin-scd';
import ethAbi from 'web3-eth-abi';
import { utils } from 'ethers';

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
      [ScdPlugin, { addressOverrides, network }],
      [MigrationPlugin, { addressOverrides, network }]
    ],
    web3: {
      pollingInterval: 50
    },
    ...settings
  });
  await maker.authenticate();
  return maker;
}

export async function placeLimitOrder(migrationService) {
  const saiToken = migrationService.get('token').getToken('SAI');
  const saiAddress = saiToken.address();
  const oasisAddress = migrationService
    .get('smartContract')
    .getContractByName('MAKER_OTC').address;
  const mkrToken = migrationService.get('token').getToken('MKR');
  const mkrAddress = mkrToken.address();
  const value = utils.parseEther('10.0');

  await mkrToken.approveUnlimited(oasisAddress);
  await saiToken.approveUnlimited(oasisAddress);

  return await offer(
    migrationService,
    utils.parseEther('0.5'),
    mkrAddress,
    value,
    saiAddress,
    1
  );
}

async function offer(
  migrationService,
  payAmount,
  payTokenAddress,
  buyAmount,
  buyTokenAddress,
  position
) {
  const oasisContract = migrationService
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

export async function drawSaiAndMigrateToDai(drawAmount, maker) {
  const cdp = await maker.service('cdp').openCdp();
  await cdp.lockEth('20');
  await cdp.drawSai(drawAmount);
  await migrateSaiToDai(10, maker);
}

export async function migrateSaiToDai(amount, maker) {
  const daiMigration = maker
    .service('migration')
    .getMigration(Migrations.SAI_TO_DAI);
  await daiMigration.execute(amount);
}

export async function shutDown(randomize) {
  const maker = await migrationMaker();
  const top = maker.service('smartContract').getContract('SAI_TOP');
  const proxy = await maker.service('proxy').ensureProxy();
  const normalCdp = await openLockAndDrawScdCdp(maker, randomize);

  const bites = [];
  for (let i = 0; i < (randomize ? 5 : 1); i++) {
    console.log('creating', i);
    const proxyCdp = await maker
      .service('cdp')
      .openProxyCdpLockEthAndDrawSai(
        2 + (randomize ? Math.random() : 0),
        103 + (randomize ? Math.random() * 20 : 0),
        proxy
      );

    bites.push(() => proxyCdp.bite());
  }

  await top.cage();
  await normalCdp.bite();
  for (let i = 0; i < bites.length; i++) {
    console.log('biting', i);
    await bites[i]();
  }
  await top.setCooldown(0);
  await new Promise(r => setTimeout(r, 1000));
  await top.flow();
}

async function openLockAndDrawScdCdp(maker, randomize) {
  const cdp = await maker.service('cdp').openCdp();
  await cdp.lockEth(1 + (randomize ? Math.random() : 0));
  await cdp.drawSai(111 + (randomize ? Math.random() * 20 : 0));
  return cdp;
}
