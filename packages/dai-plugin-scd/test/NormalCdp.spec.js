import sharedTests from './Cdp.shared';
import { PETH, WETH } from '../src/Currency';
import { buildTestEthereumCdpService } from './helpers/serviceBuilders';

async function initCdpService() {
  const service = buildTestEthereumCdpService();
  await service.manager().authenticate();
  return service;
}

sharedTests(cdpService => cdpService.openCdp(), initCdpService);

describe('weth and peth', () => {
  let wethToken, pethToken, cdp, cdpService, currentAddress;

  beforeAll(async () => {
    cdpService = await initCdpService();
    const tokenService = cdpService.get('token');
    wethToken = tokenService.getToken(WETH);
    pethToken = tokenService.getToken(PETH);
    currentAddress = cdpService
      .get('token')
      .get('web3')
      .currentAddress();
  });

  beforeEach(async () => {
    cdp = await cdpService.openCdp();
    await wethToken.deposit(0.1);
  });

  afterAll(async () => {
    await wethToken.approve(cdpService._tubContract().address, '0');
    await pethToken.approve(cdpService._tubContract().address, '0');
  });

  test('lock weth in a cdp', async () => {
    const balancePre = await wethToken.balanceOf(currentAddress);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockWeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await wethToken.balanceOf(currentAddress);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });

  test('lock peth in a cdp', async () => {
    await wethToken.approve(cdpService._tubContract().address, '0.1');
    await pethToken.join('0.1');

    const balancePre = await pethToken.balanceOf(currentAddress);
    const cdpInfoPre = await cdp.getInfo();
    await cdp.lockPeth(0.1);
    const cdpInfoPost = await cdp.getInfo();
    const balancePost = await pethToken.balanceOf(currentAddress);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(balancePre.minus(0.1)).toEqual(balancePost);
  });
});
