import repl from 'repl';
import Maker from '../src';

let maker;

const addressOverrides = {
  SAI_GEM: '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
  SAI_GOV: '0xAaF64BFCC32d0F15873a02163e7E500671a4ffcD',
  SAI_PIP: '0xd65e5e0A6F601d41221eB6Fd3AFA85854EdCa2F9',
  SAI_PEP: '0x2c2ceD47D68dfe54920a920c94B941F793aD6793',
  SAI_PIT: '0xbd747742B0F1f9791d3e6B85f8797A0cf4fbf10b',
  SAI_SAI: '0xEf0a998a09E7AC683bD5b5c35721646456C6b284',
  SAI_SIN: '0x67e805382683397124bAC22512E98a337fA2a732',
  SAI_SKR: '0xb20a1f576055D05eFDA1dFAdc3d18999A49Efb3E',
  SAI_DAD: '0xD60Ff198F1F89f05A434f64633970212f4f3800A',
  SAI_MOM: '0x0aB8960161E03561938A8C861EA2A22b5f340d9B',
  SAI_VOX: '0x5f3D74DAa9De09d512AC6D8D3F9f0B22974921f0',
  SAI_TUB: '0x81c3dD4873Fb724D1bc6b562d3fe573Eeb5b9f64',
  SAI_TAP: '0x97dED9E2F2D645b01b86FEc718b01cc5ecF4B476',
  SAI_TOP: '0x50b7A3217Ff1dB43e4cacfd7F3c099ec301B61CA',
  SAI_ADM: '0xdE6058CeBF6C5C2FE7aD791df862Ff683Cf3D7e9'
};

// example of a helper function
const addr = async () => maker.currentAddress();

async function main() {
  try {
    maker = await Maker.create('http', {
      // url: 'http://localhost:2000'
      url: 'https://kovan.infura.io/v3/c3f0f26a4c1742e0949d8eedfc47be67',
      privateKey: process.env.KOVAN_PRIVATE_KEY,
      smartContract: { addressOverrides },
      token: {
        addressOverrides: {
          PETH: addressOverrides.SAI_SKR
        }
      }
    });

    const r = repl.start();
    r.on('exit', () => process.exit());

    Object.assign(r.context, {
      // add your helpers as repl globals here
      maker,
      addr,
      scs: maker.service('smartContract'),
      weth: maker.service('token').getToken('WETH'),
      peth: maker.service('token').getToken('PETH')
    });
  } catch (err) {
    console.error(err);
  }
}

main();
