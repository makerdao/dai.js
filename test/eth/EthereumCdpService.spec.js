import EthereumCdpService from '../../src/eth/EthereumCdpService';
import tokens from '../../contracts/tokens';

let createdCdpService, cdp;

beforeEach(() => {
  return createdCdpService = EthereumCdpService.buildTestService();
});

function openCdp(){
  return createdCdpService.manager().authenticate()
    .then(() => createdCdpService.openCdp())
    .then(newCdp => {
      cdp = newCdp;
      return cdp.getCdpId();
    });
}

function lockEth(amount){
  return openCdp()
    .then((id) => createdCdpService.lockEth(id, amount))
    .then(() => cdp.getInfo());
}


test('should open a CDP and get cdp ID', done => {
  openCdp()
  .then(id => {
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
    done();
  });
}, 5000);

test('should check if a cdp for a specific id exists', done => {
  openCdp()
  .then(cdpId => createdCdpService.getCdpInfo(cdpId))
    .then(result => {
        expect(result).toBeTruthy();
        expect(result.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
        done();
      });
}, 5000);

test('should open and then shut a CDP', done => {
  openCdp()
  .then(id => {
    createdCdpService.getCdpInfo(id)
    .then(firstInfoCall => {
      createdCdpService.shutCdp(id)
      .catch((err) => { 
        done.fail(new Error('shutting CDP had an error: ', err));
      })
      .then(() => {
        createdCdpService.getCdpInfo(id)
        .then(secondInfoCall => {
          expect(firstInfoCall).not.toBe(secondInfoCall);
          expect(secondInfoCall.lad).toBe('0x0000000000000000000000000000000000000000');
          done();
        });
      });
    });
  });
}, 5000);

test('should open and then shut a CDP with peth locked in it', done => {
  let firstInfoCall;

  openCdp()
  .then(id => {
    createdCdpService.getCdpInfo(id)
    .then(info => firstInfoCall = info)
    .then(() => cdp.lockEth('0.1'))
    .then(() => {
      createdCdpService.shutCdp(id)
      .catch((err) => { 
        done.fail(new Error('shutting CDP had an error: ', err));
      })
      .then(() => {  
        createdCdpService.getCdpInfo(id)
        .then(secondInfoCall => {
          expect(firstInfoCall).not.toBe(secondInfoCall);
          expect(secondInfoCall.lad).toBe('0x0000000000000000000000000000000000000000');
          done();
        });
      });
    });
  });
}, 5000);

test('should be able to lock eth in a cdp', done => {
  let firstInfoCall;
  let cdpId;

  createdCdpService.manager().authenticate().then(() => {
    cdp.getCdpId().then(id => {
      cdpId = id;
      createdCdpService.getCdpInfo(id)
      .then(result => firstInfoCall = result)
      .then(() => createdCdpService.lockEth(id, '0.1'))
      .then(() => {
        createdCdpService.getCdpInfo(cdpId)
        .then(secondInfoCall => {
          expect(firstInfoCall.ink.toString()).toEqual('0');
          expect(secondInfoCall.ink.toString()).toEqual('100000000000000000');
          done();
        });
      });
    });
  });
}, 5000);

test('should be able to free peth from a cdp', done => {
  let newCdp;
  let firstBalance;
  let cdpId;

  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.openCdp()
    .then(cdp => {
      newCdp = cdp;
      newCdp.getCdpId().then(id => cdpId = id)
      .then(() => createdCdpService.lockEth(cdpId, '0.1'))
        .then(() => {
        newCdp.getInfo().then(info => firstBalance = parseFloat(info.ink))
        .then(() => {
          createdCdpService.freePeth(cdpId, '0.1')
                .then(() => {
            newCdp.getInfo().then(info => {
              expect(parseFloat(info.ink)).toBeCloseTo(firstBalance - 100000000000000000);
              done();
            });
          });
        });
      });
    });
  });
}, 5000);

test('should be able to draw dai', done => {
  let cdpId, firstDaiBalance, defaultAccount, dai;
  
  createdCdpService.manager().authenticate().then(() => {
    lockEth('0.1')
    .then(() => cdp.getCdpId())
    .then(id => {
      dai = createdCdpService.get('token').getToken(tokens.DAI);
      defaultAccount = createdCdpService.get('token').get('web3').defaultAccount();
      cdpId = id;
      dai.balanceOf(defaultAccount)
      .then(balance => {
        firstDaiBalance = parseFloat(balance);
        createdCdpService.drawDai(cdpId, '1')
        .then(() => dai.balanceOf(defaultAccount))
        .then(secondDaiBalance => {
          expect(parseFloat(secondDaiBalance)).toBeCloseTo(firstDaiBalance + 1);
          done();
        });
      });
    });
  });
}, 5000);

test('should be able to wipe dai', done => {
  let cdpId, firstDaiBalance, defaultAccount, dai;
  
  createdCdpService.manager().authenticate().then(() => {
    lockEth('0.1')
    .then(() => cdp.getCdpId())
    .then(id => {
      dai = createdCdpService.get('token').getToken(tokens.DAI);
      defaultAccount = createdCdpService.get('token').get('web3').defaultAccount();
      cdpId = id;
      cdp.drawDai('1')
      .then(() => dai.balanceOf(defaultAccount))
      .then(balance => {
        firstDaiBalance = parseFloat(balance);
        createdCdpService.wipeDai(cdpId, '1')
        .then(() => dai.balanceOf(defaultAccount))
        .then(secondDaiBalance => {
          expect(parseFloat(secondDaiBalance)).toBeCloseTo(parseFloat(firstDaiBalance) - 1);
          done();
        });
      });
    });
  });
});

// These need better tests
test('should return the abstracted collateral price', done => {
  createdCdpService.manager().authenticate().then(() => {
    createdCdpService.abstractedCollateralPrice().then(value => {
      expect(typeof value).toBe('number');
      done();
    });
  });
});