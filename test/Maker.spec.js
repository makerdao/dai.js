import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';

let maker;

beforeAll(() => {
  maker = new Maker(
    ConfigFactory.create('decentralized-oasis-without-proxies')
  );
});

test('openCdp should open a CDP', done => {
  maker.openCdp().then(txn => {
    txn.onMined(cdp => {
      console.log(cdp);
      done();
    });
  });
}, 10000);

xtest('openCdp should have an onMined event handler', done => {
  // console.log(maker.openCdp());
  done();
}, 10000);
