/*
import MakerDaoService from './MakerDaoService';
import NullLoggerService from "../loggers/NullLogger/NullLoggerService";
import ERC20Service from "../ERC20Service";

test('getting started use case', (done) => {
  const
    log = new NullLoggerService(),
    cdpService = new CdpService(),
    makerDao = new MakerDaoService();

  makerDao.manager()
    .inject('log', log)
    .inject('cdp', cdpService).authenticate().then(() => {

    makerDao.openCdp()
      .then(result => { cdp = result; cdp.lock(ethAmount, makerDao.tokens.ETH); })
      .then(() => cdp.drawDai(collRatio))
      .then(daiAmount => makerDao.sellDai(daiAmount, makerDao.tokens.ETH))
      .then(order => cdp.lock(order.fillAmount, makerDao.tokens.ETH))
      .then(() => console.log('Final collateral ratio: ', cdp.collateralRatio))
      .catch(reason => console.error('Something went wrong: ', reason));

    done();
  });
});
*/

test('dummy test'), (done => {
  let x = 5;
  done();
});