import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';

let maker;

beforeAll(() => {
  maker = new Maker(
    ConfigFactory.create('decentralized-oasis-without-proxies')
  );
});

xtest('openCdp should open a CDP', done => {
  maker.openCdp().then((newCdp) => {
    console.log(newCdp);
    done();
  })
});

xtest('openCdp should have an onMined event handler', done => {
  // console.log(maker.openCdp());
  done();
}, 10000);
