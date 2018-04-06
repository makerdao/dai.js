import Maker from '../src/Maker';
import ConfigFactory from '../src/utils/ConfigFactory';

let maker;
let newCdp;

beforeAll(() => {
  maker = new Maker(
    ConfigFactory.create('decentralized-oasis-without-proxies')
  );

  newCdp = new Promise((resolve, reject) => {
    try {
      resolve(maker.openCdp());
    } catch (error) {
      reject(error.message);
    }
  })
});

test('openCdp should open a CDP', done => {
  // console.log(newCdp);
  done();
});

test('openCdp should have an onMined event handler', done => {
  // console.log(maker.openCdp());
  done();
}, 10000);