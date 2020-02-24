import sharedTests from './Cdp.shared';
import { buildTestEthereumCdpService } from './helpers/serviceBuilders';
import TestAccountProvider from '@makerdao/test-helpers/src/TestAccountProvider';
import { DAI, ETH } from '../src/Currency';

let dsProxyAddress, cdpService, currentAddress, ethToken;

async function initCdpService() {
  const service = buildTestEthereumCdpService();
  await service.manager().authenticate();
  return service;
}

async function buildProxy(cdpService) {
  const proxyService = cdpService
    .get('smartContract')
    .get('transactionManager')
    .get('proxy');

  return (await proxyService.currentProxy()) || (await proxyService.build());
}

beforeAll(async () => {
  cdpService = await initCdpService();
  ethToken = cdpService.get('token').getToken(ETH);
  dsProxyAddress = await buildProxy(cdpService);
  currentAddress = cdpService
    .get('token')
    .get('web3')
    .get('accounts')
    .currentAddress();
});

describe('with existing DSProxy', () => {
  test('open CDP, lock ETH and draw DAI (single tx)', async () => {
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(
      0.1,
      1,
      dsProxyAddress
    );
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(
      0.1
    );
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
    expect(await cdp.getDebtValue()).toEqual(DAI(1));
  });

  test('open CDP, lock ETH and draw DAI (multi tx)', async () => {
    const cdp = await cdpService.openProxyCdp(dsProxyAddress);
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    // ETH balance should now be reduced by (at least) 0.1 (plus gas)
    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(
      0.1
    );
    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(await cdp.getDebtValue()).toEqual(DAI(1));
  });

  sharedTests(
    cdpService => cdpService.openProxyCdp(dsProxyAddress),
    initCdpService
  );
});

describe('without existing DSProxy', () => {
  async function useNewAccount(cdpService) {
    const accountService = cdpService
      .get('token')
      .get('web3')
      .get('accounts');
    const { address, key } = TestAccountProvider.nextAccount();
    await accountService.addAccount(address, { type: 'privateKey', key });
    accountService.useAccount(address);
    currentAddress = address;
  }

  beforeEach(() => useNewAccount(cdpService));

  test('open CDP (single tx)', async () => {
    const cdp = await cdpService.openProxyCdp();
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
  });

  test('open CDP, lock ETH and draw DAI (single tx)', async () => {
    const balancePre = await ethToken.balanceOf(currentAddress);
    const cdp = await cdpService.openProxyCdpLockEthAndDrawDai(0.1, 1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await ethToken.balanceOf(currentAddress);

    expect(balancePre.minus(balancePost).toNumber()).toBeGreaterThanOrEqual(
      0.1
    );
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(cdp.id).toBeGreaterThan(0);
    expect(cdp.dsProxyAddress).toMatch(/^0x[A-Fa-f0-9]{40}$/);
    expect(await cdp.getDebtValue()).toEqual(DAI(1));
  });
});
