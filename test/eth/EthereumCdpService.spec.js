import EthereumCdpService from '../../src/eth/EthereumCdpService';
import contracts from '../../contracts/contracts';

test('should open a CDP and return cdp ID', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.openCdp()
      .then(cdpId => {
        expect(cdpId).toBeGreaterThan(0);
        expect(typeof cdpId).toBe('number');
        done();
      });
    });
});
