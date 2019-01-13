// A simple Ethers Signer built directly from a Web3 provider.

import { promisify } from '../../utils';

export default function makeSigner(web3Service) {
  const provider = web3Service.web3Provider();
  const call = promisify(web3Service._web3.eth.call);
  return {
    getAddress: () => web3Service.currentAddress(),
    estimateGas: tx => web3Service.estimateGas(tx),
    sendTransaction: tx => {
      return web3Service.sendTransaction({
        ...tx,
        from: web3Service.currentAddress()
      });
    },
    provider: new Proxy(provider, {
      get(target, key) {
        switch (key) {
          case 'resolveName':
            return address => address;
          case 'call':
            return call;
          default:
            return target[key];
        }
      }
    })
  };
}
