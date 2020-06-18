// this is just a rough cut which is occasionally useful; 
// don't take anything happening here as authoritative

import repl from 'repl';
import Maker from '../src';
import testAccounts from '../../test-helpers/src/testAccounts.json';
import ScdPlugin from '@makerdao/dai-plugin-scd';

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

const env = {
  testnet: {
    fromBlock: 0,
    config: {
      url: 'http://localhost:2000',
      privateKey: testAccounts.keys[0],
    }
  },
  kovan: {
    fromBlock: 4750000,
    config: {
      url: 'https://kovan.infura.io/v3/c3f0f26a4c1742e0949d8eedfc47be67',
      privateKey: process.env.KOVAN_PRIVATE_KEY,
      smartContract: { addressOverrides },
      token: {
        addressOverrides: {
          PETH: addressOverrides.SAI_SKR,
          DAI: addressOverrides.SAI_SAI
        }
      }
    }
  },
  mainnet: {
    config: {
      fromBlock: 4750000,
      url: 'https://mainnet.infura.io/v3/c3f0f26a4c1742e0949d8eedfc47be67'
    }
  }
};

const currentEnv = env.mainnet;

async function main() {
  try {
    const { config, fromBlock } = currentEnv;
    maker = await Maker.create('http', {
      ...config,
      plugins: [ScdPlugin],
      log: false
    });

    const r = repl.start();
    r.on('exit', () => process.exit());

    const scs = maker.service('smartContract');
    const w3s = maker.service('web3');
    const { utils } = w3s._web3;
    const { LogNewCup } = scs.getContract('SAI_TUB').interface.events;

    const getCdpIds = async address => {
      const logs = await w3s.getPastLogs(
        {
          address: scs.getContractAddress('SAI_TUB'),
          topics: [
            utils.keccak256(utils.toHex(LogNewCup.signature)),
            '0x000000000000000000000000' + (address || maker.currentAddress()).replace(/^0x/, '')
          ],
          fromBlock
        },
      );
      return logs.map(l => parseInt(l.data, 16));
    };

    Object.assign(r.context, {
      // add your helpers as repl globals here
      maker,
      addr,
      scs,
      eth: maker.getToken('ETH'),
      weth: maker.getToken('WETH'),
      peth: maker.getToken('PETH'),
      sai: maker.getToken('SAI'),
      getCdpIds,
      tub: scs.getContract('SAI_TUB'),
      top: scs.getContract('SAI_TOP'),
      WAD: '1000000000000000000',
      RAY: '1000000000000000000000000000'
    });
  } catch (err) {
    console.error(err);
  }
}

main();
