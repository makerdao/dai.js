import Cdp from '../../src/eth/Cdp';
import tokens from '../../contracts/tokens';
import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';

let createdCdpService;

beforeEach(() => {
  return (createdCdpService = buildTestEthereumCdpService());
});

test('should open a new CDP and return its ID', done => {
  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      const newCdp = new Cdp(createdCdpService);
      newCdp.getCdpId().then(id => {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);
        done();
      });
    });
});

test(
  'should create a cdp object with an authenticated service and a cdp id',
  done => {
    createdCdpService
      .manager()
      .authenticate()
      .then(() => {
        createdCdpService
          .openCdp()
          .then(cdp => {
            expect(cdp).toBeDefined();
            expect(cdp._cdpService).toBeDefined();
            expect(cdp._smartContractService).toBeDefined();
            return cdp.getCdpId();
          })
          .then(id => {
            expect(id).toBeGreaterThan(0);
            done();
          });
      });
  },
  5000
);

test(
  "should be able to get a CDP's info",
  done => {
    createdCdpService
      .manager()
      .authenticate()
      .then(() => {
        createdCdpService.openCdp().then(cdp => {
          cdp.getInfo().then(info => {
            expect(info).toBeDefined();
            expect(typeof info).toBe('object');
            done();
          });
        });
      });
  },
  5000
);

test(
  'should be able to close a CDP',
  done => {
    let cdpId;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => createdCdpService.openCdp())
      .then(cdp => {
        cdp
          .getCdpId()
          .then(id => (cdpId = id))
          .then(() => cdp.shut())
          .then(() => createdCdpService.getCdpInfo(cdpId))
          .then(info => {
            expect(info.lad).toBe('0x0000000000000000000000000000000000000000');
            done();
          });
      });
  },
  5000
);

test(
  'should be able to lock eth',
  done => {
    let newCdp;
    let firstBalance;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => createdCdpService.openCdp())
      .then(cdp => {
        newCdp = cdp;
        newCdp
          .getInfo()
          .then(info => (firstBalance = parseFloat(info.ink)))
          .then(() => newCdp.lockEth('0.1'))
          .then(() => {
            newCdp.getInfo().then(info => {
              expect(parseFloat(info.ink)).toBeCloseTo(
                firstBalance + 100000000000000000
              );
              done();
            });
          });
      });
  },
  5000
);

test('should be able to free peth', done => {
  let cdp;
  let firstInfoCall;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => createdCdpService.openCdp())
    .then(newCdp => {
      cdp = newCdp;
      cdp
        .lockEth('0.1')
        .then(() => cdp.getInfo())
        .then(info => (firstInfoCall = info))
        .then(() => cdp.freePeth('0.1'))
        .then(() => cdp.getInfo())
        .then(secondInfoCall => {
          expect(parseFloat(secondInfoCall.ink)).toBeCloseTo(
            parseFloat(firstInfoCall.ink) - 100000000000000000
          );
          done();
        });
    });
});

test(
  'should be able to draw DAI',
  done => {
    let newCdp, firstInkBalance, firstDaiBalance, defaultAccount;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => createdCdpService.openCdp())
      .then(cdp => {
        defaultAccount = createdCdpService
          .get('token')
          .get('web3')
          .defaultAccount();
        newCdp = cdp;
        return Promise.all([
          newCdp.getInfo(),
          createdCdpService
            .get('token')
            .getToken(tokens.DAI)
            .balanceOf(defaultAccount)
        ]);
      })
      .then(info => {
        firstInkBalance = parseFloat(info[0].ink);
        firstDaiBalance = parseFloat(info[1].toString());
        return newCdp.lockEth('0.1');
      })
      .then(() => newCdp.getInfo())
      .then(info => {
        expect(parseFloat(info.ink)).toBeCloseTo(
          firstInkBalance + 100000000000000000
        );
        return newCdp.drawDai('1');
      })
      .then(() =>
        Promise.all([
          newCdp.getInfo(),
          createdCdpService
            .get('token')
            .getToken(tokens.DAI)
            .balanceOf(defaultAccount)
        ])
      )
      .then(result => {
        expect(parseFloat(result[1].toString())).toBeCloseTo(
          firstDaiBalance + 1.0
        );
        done();
      })
      .catch(reason => {
        done.fail();
        throw reason;
      });
  },
  5000
);

test('should be able to wipe dai', done => {
  let cdp, dai, firstDaiBalance, defaultAccount;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      createdCdpService.openCdp().then(newCdp => {
        cdp = newCdp;
        cdp
          .lockEth('0.1')
          .then(() => cdp.drawDai('1'))
          .then(() => {
            dai = createdCdpService.get('token').getToken(tokens.DAI);
            defaultAccount = createdCdpService
              .get('token')
              .get('web3')
              .defaultAccount();
            dai.balanceOf(defaultAccount).then(balance => {
              firstDaiBalance = parseFloat(balance);
              cdp
                .wipeDai('1')
                .then(() => dai.balanceOf(defaultAccount))
                .then(secondDaiBalance => {
                  expect(parseFloat(secondDaiBalance)).toBeCloseTo(
                    firstDaiBalance - 1
                  );
                  done();
                });
            });
          });
      });
    });
});

test('should be able to transfer ownership of a cdp', done => {
  const newAddress = '0x046Ce6b8eCb159645d3A605051EE37BA93B6efCc';
  let cdp, firstOwner;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      createdCdpService
        .openCdp()
        .then(newCdp => (cdp = newCdp))
        .then(() => cdp.getInfo())
        .then(info => (firstOwner = info.lad))
        .then(() => cdp.give(newAddress))
        .then(() => cdp.getInfo())
        .then(info => {
          expect(info.lad).not.toEqual(firstOwner);
          expect(info.lad).toEqual(newAddress);
          done();
        });
    });
});
