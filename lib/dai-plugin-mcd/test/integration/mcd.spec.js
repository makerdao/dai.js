import { mcdMaker } from '../helpers';
import { ServiceRoles } from '../../src/constants';
import { ETH, MDAI } from '../../src';
//import debug from 'debug';

const { CDP_MANAGER, CDP_TYPE } = ServiceRoles;
//const log = debug('mcd:testing:integration');

let maker;

beforeAll(async () => {
  if (!process.env.PRIVATE_KEY && process.env.NETWORK !== 'test') {
    throw new Error('Please set a private key to run integration tests.');
  }
  const settings =
    process.env.NETWORK === 'test' //the test settings could probably be deleted?
      ? {
          web3: {
            confirmedBlockCount: '0',
            pollingInterval: 50
          }
        }
      : {
          privateKey: process.env.PRIVATE_KEY,
          web3: {
            transactionSettings: {
              gasPrice: 15000000000
            }
          }
        };

  maker = await mcdMaker({
    preset: process.env.NETWORK,
    network: 'kovan',
    settings
  });

  await maker.authenticate();

  /* const txMgr = maker.service('transactionManager');
  txMgr.onNewTransaction(txo => {
    const {
      metadata: { contract, method } = { contract: '???', method: '???' }
    } = txo;
    const label = `tx ${uniqueId(txo)}: ${contract}.${method}`;
    log(`${label}: new`);

    txo.onPending(() => log(`${label}: pending`));
    txo.onMined(() => log(`${label}: mined`));
    txo.onFinalized(() => log(`${label}: confirmed`));
  });*/
});

test('can create Maker instance', () => {
  expect(maker).toBeDefined();
});

const scenarios = [['ETH-A', ETH]];

describe.each(scenarios)('%s', (ilk, GEM) => {
  let cdpType, service;

  beforeAll(async () => {
    service = maker.service(CDP_TYPE);
    cdpType = service.getCdpType(GEM, ilk);
  });

  test('get debt ceiling', async () => {
    const ceiling = await cdpType.getDebtCeiling();
    expect(ceiling).toEqual(MDAI(300000));
  });

  test(
    'open',
    async () => {
      await maker.authenticate();
      const cdp = await maker.service(CDP_MANAGER).open(ilk);
      expect(cdp.id).toBeGreaterThan(0);
      //await expectValues(cdp, { collateral: 0, debt: 0 });
    },
    15000
  );
});
