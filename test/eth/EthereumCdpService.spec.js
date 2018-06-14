import { buildTestEthereumCdpService } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

let createdCdpService, cdp;

beforeEach(() => {
  return (createdCdpService = buildTestEthereumCdpService());
});

function openCdp() {
  return createdCdpService
    .manager()
    .authenticate()
    .then(() => createdCdpService.openCdp())
    .then(newCdp => {
      cdp = newCdp;
      return cdp.getCdpId();
    });
}

function lockEth(amount) {
  return openCdp()
    .then(id => createdCdpService.lockEth(id, amount))
    .then(() => cdp.getInfo());
}

test(
  'should open a CDP and get cdp ID',
  done => {
    openCdp().then(id => {
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
      done();
    });
  },
  5000
);

test(
  'should check if a cdp for a specific id exists',
  done => {
    openCdp()
      .then(cdpId => createdCdpService.getCdpInfo(cdpId))
      .then(result => {
        expect(result).toBeTruthy();
        expect(result.lad).toMatch(/^0x[A-Fa-f0-9]{40}$/);
        done();
      });
  },
  5000
);

test(
  'should open and then shut a CDP',
  done => {
    openCdp().then(id => {
      createdCdpService.getCdpInfo(id).then(firstInfoCall => {
        createdCdpService
          .shutCdp(id)
          .catch(err => {
            done.fail(new Error('shutting CDP had an error: ', err));
          })
          .then(() => {
            createdCdpService.getCdpInfo(id).then(secondInfoCall => {
              expect(firstInfoCall).not.toBe(secondInfoCall);
              expect(secondInfoCall.lad).toBe(
                '0x0000000000000000000000000000000000000000'
              );
              done();
            });
          });
      });
    });
  },
  5000
);

test(
  'should open and then shut a CDP with peth locked in it',
  done => {
    let firstInfoCall;
    let cdpId;
    openCdp()
      .then(id => {
        cdpId = id;
        createdCdpService.getCdpInfo(id);
      })
      .then(info => (firstInfoCall = info))
      .then(() => cdp.lockEth('0.1'))
      .then(() => createdCdpService.shutCdp(cdpId))
      .then(() => createdCdpService.getCdpInfo(cdpId))
      .then(secondInfoCall => {
        expect(firstInfoCall).not.toBe(secondInfoCall);
        expect(secondInfoCall.lad).toBe(
          '0x0000000000000000000000000000000000000000'
        );
        const tokenService = createdCdpService.get('token');
        const wethToken = tokenService.getToken(tokens.WETH);
        const pethToken = tokenService.getToken(tokens.PETH);
        const mkrToken = tokenService.getToken(tokens.MKR);
        return Promise.all([
          wethToken.approve(createdCdpService._tubContract().getAddress(), '0'),
          pethToken.approve(createdCdpService._tubContract().getAddress(), '0'),
          mkrToken.approve(createdCdpService._tubContract().getAddress(), '0')
        ]);
      })
      .then(() => {
        done();
      })
      .catch(err => {
        done.fail(new Error('shutting CDP had an error: ', err));
      });
  },
  5000
);

test(
  'should be able to lock eth in a cdp',
  done => {
    let firstInfoCall;
    let cdpId;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => {
        cdp.getCdpId().then(id => {
          cdpId = id;
          createdCdpService
            .getCdpInfo(id)
            .then(result => (firstInfoCall = result))
            .then(() => createdCdpService.lockEth(id, '0.1'))
            .then(() => createdCdpService.getCdpInfo(cdpId))
            .then(secondInfoCall => {
              expect(firstInfoCall.ink.toString()).toEqual('0');
              expect(secondInfoCall.ink.toString()).toEqual(
                '100000000000000000'
              );
              const tokenService = createdCdpService.get('token');
              const wethToken = tokenService.getToken(tokens.WETH);
              const pethToken = tokenService.getToken(tokens.PETH);
              return Promise.all([
                wethToken.approve(
                  createdCdpService._tubContract().getAddress(),
                  '0'
                ),
                pethToken.approve(
                  createdCdpService._tubContract().getAddress(),
                  '0'
                )
              ]);
            })
            .then(() => {
              done();
            });
        });
      });
  },
  5000
);

test(
  'should be able to lock weth in a cdp',
  async () => {
    const id = await openCdp();
    const tokenService = createdCdpService.get('token');
    const wethToken = tokenService.getToken(tokens.WETH);
    const pethToken = tokenService.getToken(tokens.PETH);
    const defaultAccount = createdCdpService
      .get('token')
      .get('web3')
      .defaultAccount();

    await wethToken.deposit('0.1');
    const balancePre = await wethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await createdCdpService.getCdpInfo(id);
    await createdCdpService.lockWeth(id, '0.1');
    const cdpInfoPost = await createdCdpService.getCdpInfo(id);
    const balancePost = await wethToken.balanceOf(defaultAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(parseFloat(balancePost)).toBeCloseTo(balancePre - 0.1, 5);

    await wethToken.approve(createdCdpService._tubContract().getAddress(), '0');
    await pethToken.approve(createdCdpService._tubContract().getAddress(), '0');
  },
  5000
);

test(
  'should be able to lock peth in a cdp',
  async () => {
    const id = await openCdp();
    const tokenService = createdCdpService.get('token');
    const wethToken = tokenService.getToken(tokens.WETH);
    const pethToken = tokenService.getToken(tokens.PETH);
    const defaultAccount = createdCdpService
      .get('token')
      .get('web3')
      .defaultAccount();

    await wethToken.deposit('0.1');
    await wethToken.approve(
      createdCdpService._tubContract().getAddress(),
      '0.1'
    );
    await pethToken.join('0.1');

    const balancePre = await pethToken.balanceOf(defaultAccount);
    const cdpInfoPre = await createdCdpService.getCdpInfo(id);
    await createdCdpService.lockPeth(id, '0.1');
    const cdpInfoPost = await createdCdpService.getCdpInfo(id);
    const balancePost = await pethToken.balanceOf(defaultAccount);

    expect(cdpInfoPre.ink.toString()).toEqual('0');
    expect(cdpInfoPost.ink.toString()).toEqual('100000000000000000');
    expect(parseFloat(balancePost)).toBeCloseTo(balancePre - 0.1, 5);

    await wethToken.approve(createdCdpService._tubContract().getAddress(), '0');
    await pethToken.approve(createdCdpService._tubContract().getAddress(), '0');
  },
  5000
);

test(
  'should be able to free peth from a cdp',
  done => {
    let newCdp;
    let firstBalance;
    let cdpId;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => {
        createdCdpService.openCdp().then(cdp => {
          newCdp = cdp;
          newCdp
            .getCdpId()
            .then(id => (cdpId = id))
            .then(() => createdCdpService.lockEth(cdpId, '0.1'))
            .then(() => {
              newCdp
                .getInfo()
                .then(info => (firstBalance = parseFloat(info.ink)))
                .then(() => {
                  createdCdpService.freePeth(cdpId, '0.1').then(() => {
                    newCdp.getInfo().then(info => {
                      expect(parseFloat(info.ink)).toBeCloseTo(
                        firstBalance - 100000000000000000
                      );
                      done();
                    });
                  });
                });
            });
        });
      });
  },
  5000
);

test(
  'should be able to draw dai',
  done => {
    let cdpId, firstDaiBalance, defaultAccount, dai;

    createdCdpService
      .manager()
      .authenticate()
      .then(() => {
        lockEth('0.1')
          .then(() => cdp.getCdpId())
          .then(id => {
            dai = createdCdpService.get('token').getToken(tokens.DAI);
            defaultAccount = createdCdpService
              .get('token')
              .get('web3')
              .defaultAccount();
            cdpId = id;
            dai.balanceOf(defaultAccount).then(balance => {
              firstDaiBalance = parseFloat(balance);
              createdCdpService
                .drawDai(cdpId, '1')
                .then(() => dai.balanceOf(defaultAccount))
                .then(secondDaiBalance => {
                  expect(parseFloat(secondDaiBalance)).toBeCloseTo(
                    firstDaiBalance + 1
                  );
                  cdp.wipeDai('1').then(() => done());
                });
            });
          });
      });
  },
  5000
);

test('should be able to wipe dai', done => {
  let cdpId, firstDaiBalance, defaultAccount, dai;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      return lockEth('0.1');
    })
    .then(() => cdp.getCdpId())
    .then(id => {
      dai = createdCdpService.get('token').getToken(tokens.DAI);
      defaultAccount = createdCdpService
        .get('token')
        .get('web3')
        .defaultAccount();
      cdpId = id;
      return cdp.drawDai('1');
    })
    .then(() => dai.balanceOf(defaultAccount))
    .then(balance => {
      firstDaiBalance = parseFloat(balance);
      return createdCdpService.wipeDai(cdpId, '1');
    })
    .then(() => dai.balanceOf(defaultAccount))
    .then(secondDaiBalance => {
      expect(parseFloat(secondDaiBalance)).toBeCloseTo(
        parseFloat(firstDaiBalance) - 1
      );
      const tokenService = createdCdpService.get('token');
      const mkrToken = tokenService.getToken(tokens.MKR);
      return Promise.all([
        mkrToken.approve(createdCdpService._tubContract().getAddress(), '0'),
        dai.approve(createdCdpService._tubContract().getAddress(), '0')
      ]);
    })
    .then(() => {
      done();
    });
});

test('should be able to transfer ownership of a cdp', done => {
  const newAddress = '0x046Ce6b8eCb159645d3A605051EE37BA93B6efCc';
  let cdpId, firstOwner;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      openCdp()
        .then(id => (cdpId = id))
        .then(() => cdp.getInfo())
        .then(info => (firstOwner = info.lad))
        .then(() => createdCdpService.give(cdpId, newAddress))
        .then(() => cdp.getInfo())
        .then(info => {
          expect(info.lad).not.toEqual(firstOwner);
          expect(info.lad).toEqual(newAddress);
          done();
        });
    });
});

// Also test that biting a safe cdp throws an error
test('should be able to bite an unsafe cdp', done => {
  let id;

  createdCdpService
    .manager()
    .authenticate()
    .then(() => {
      lockEth('0.1')
        .then(() => cdp.drawDai('13'))
        .then(() => cdp.getCdpId())
        .then(cdpId => (id = cdpId))
        .then(() => createdCdpService.get('price').setEthPrice('0.01'))
        .then(() => createdCdpService.get('price').getEthPrice())
        .then(() => createdCdpService.bite(id))
        .then(res => expect(typeof res).toEqual('object'))
        .then(() => createdCdpService.get('price').setEthPrice('400'))
        .then(() => done());
    });
});

test('can read the locked collateral in peth for a cdp ', async () => {
  await openCdp();
  await cdp.lockEth('0.2');
  const debt = await cdp.getCollateralAmountInPeth();
  expect(debt.toString()).toEqual('0.2');
});

test('can read the locked collateral in eth for a cdp ', async () => {
  await openCdp();
  await cdp.lockEth('0.2');
  const debt = await cdp.getCollateralAmountInEth();
  expect(debt.toString()).toEqual('0.2');
});

test('can read the locked collateral in USD for a cdp ', async () => {
  await openCdp();
  await cdp.lockEth('0.2');
  const debt = await cdp.getCollateralAmountInUSD();
  expect(debt.toString()).toEqual('80');
});

test('can read the debt in dai for a cdp', async () => {
  const id = await openCdp();
  await cdp.lockEth('0.1');
  await cdp.drawDai('5');
  const debt = await cdp.getDebtValueInDai(id);
  expect(debt.toString()).toEqual('5');
});

test('can read the debt in usd for a cdp', async () => {
  const id = await openCdp();
  await cdp.lockEth('0.1');
  await cdp.drawDai('5');
  const debt = await cdp.getDebtValueInUSD(id);
  expect(debt.toString()).toEqual('5');
});

test('can read the liquidation ratio', async () => {
  await createdCdpService.manager().authenticate();
  const liquidationRatio = await createdCdpService.getLiquidationRatio();
  expect(liquidationRatio.toString()).toEqual('1.5');
});

test('can read the liquidation penalty', async () => {
  await createdCdpService.manager().authenticate();
  const liquidationPenalty = await createdCdpService.getLiquidationPenalty();
  expect(liquidationPenalty.toString()).toEqual('0.13');
});

test('can read the annual governance fee', async () => {
  await createdCdpService.manager().authenticate();
  const governanceFee = await createdCdpService.getAnnualGovernanceFee();
  expect(governanceFee.toFixed(3)).toEqual('0.005');
});

test('can read the liquidation price in eth for a cdp', async () => {
  await openCdp();
  await cdp.lockEth('0.1');
  await cdp.drawDai('5');
  const price = await cdp.getLiquidationPriceEthUSD();
  expect(price.toString()).toEqual('75');
});

test('can read the target price', async () => {
  await createdCdpService.manager().authenticate();
  const tp = await createdCdpService.getTargetPrice();
  expect(tp).toBe(1);
});

test('can check if cdp is safe', async () => {
  await openCdp();
  await cdp.lockEth('0.1');
  await cdp.drawDai('5');
  const safe = await cdp.isSafe();
  expect(safe).toBe(true);
});

test('can calculate the collateralization ratio of a specific CDP', async () => {
  await createdCdpService.manager().authenticate();
  await createdCdpService.get('price').setEthPrice('500');
  await lockEth('0.1');
  await cdp.drawDai('20');
  const ethPerPeth = await createdCdpService.get('price').getWethToPethRatio();
  const collateralizationRatio = await cdp.getCollateralizationRatio();
  await createdCdpService.get('price').setEthPrice('400');
  expect(collateralizationRatio).toBeCloseTo(2.5 * ethPerPeth);
});

test('can calculate system collateralization', async () => {
  await createdCdpService.manager().authenticate();
  const collateralizatoinA = await createdCdpService.getSystemCollateralization();
  await lockEth('0.1');

  const collateralizatoinB = await createdCdpService.getSystemCollateralization();
  expect(collateralizatoinB).toBeGreaterThan(collateralizatoinA);
  await cdp.drawDai('10');

  const collateralizatoinC = await createdCdpService.getSystemCollateralization();
  expect(collateralizatoinB).toBeGreaterThan(collateralizatoinC);
});
