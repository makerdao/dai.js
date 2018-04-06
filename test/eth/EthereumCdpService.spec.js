import EthereumCdpService from '../../src/eth/EthereumCdpService';

let createdCdpId;
let createdCdpService;

function openCdp(){
  createdCdpService = EthereumCdpService.buildTestService();
  return createdCdpService.manager().authenticate()
    .then(() => createdCdpService.openCdp())
    .then(cdpId => {
      createdCdpId = cdpId;
      return cdpId;
    });
}

// eslint-disable-next-line
function lockPeth(amount){
  return openCdp().then(cdpId => {
    return createdCdpService.lockEth(cdpId, amount).then(() => {
      return cdpId;
    });
  });
}

test('should open a CDP and return cdp ID', done => {
  openCdp().then(cdpId => {
      expect(cdpId).toBeGreaterThan(0);
      expect(typeof cdpId).toBe('number');
      done();
    });
}, 10000);

test('should check if a cdp for a specific id exists', done => {
  openCdp().then(cdpId => createdCdpService.getCdpInfo(cdpId))
    .then((result) => {
        expect(result).toBeTruthy();
        expect(result.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
        done();
      });
}, 10000);

test('should open and then shut a CDP', done => {
  openCdp().then(cdpId => {
    createdCdpService.shutCdp(cdpId)
    .catch((err) => { 
      done.fail(new Error('shutting CDP had an error: ', err));
    })
    .then((result) => {  
      expect(result).toBeFalsy();   
      expect(typeof result).toBe('undefined');
      done();
    });
  });
}, 12000);

test('should convert .1 eth to peth', done => {
  const service = EthereumCdpService.buildTestService();
  service.manager().authenticate()
    .then(() => {
      service.convertEthToPeth('.1')
      .then((result) => {  
        expect(result).toBeTruthy();    
        done();
      });
    });
}, 20000);

test('should lock .1 peth into a cdp', done => {
  let lockedAmount = 0;

  openCdp().then(cdpId => {
    createdCdpService.getCdpInfo(cdpId)
    .then(result => lockedAmount = result.ink.toString())
    .then(() => createdCdpService.lockEth(cdpId, '.1'))
    .then(result => { 
      expect(result).toBeFalsy();    
      expect(typeof result).toBe('undefined');
      createdCdpService.getCdpInfo(createdCdpId)
        .then(result => {
          expect(lockedAmount).toBe('0');
          lockedAmount = result.ink.toString();
          expect(lockedAmount).toBe('100000000000000000');
          done();
        });
      });
    });
}, 25000);