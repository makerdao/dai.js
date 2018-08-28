import ethUtil from 'ethereumjs-util';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';
import { getBrowserProvider } from './setup';

export function privateKeyAccountFactory({ key }) {
  if (typeof key != 'string' || !key.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key format');
  }

  const [keyWithPrefix, keySansPrefix] = key.startsWith('0x')
    ? [key, key.replace(/^0x/, '')]
    : ['0x' + key, key];

  const address =
    '0x' + ethUtil.privateToAddress(keyWithPrefix).toString('hex');
  const keyBuffer = Buffer.from(keySansPrefix, 'hex');

  const subprovider = new Wallet(
    { getAddressString: () => address, getPrivateKey: () => keyBuffer },
    {}
  );

  return { subprovider, address };
}

async function getAccountAddress(subprovider) {
  return new Promise((resolve, reject) =>
    subprovider.handleRequest(
      { method: 'eth_accounts', params: [], id: 1 },
      null,
      (err, val) => (err ? reject(err) : resolve(val[0]))
    )
  );
}

export async function providerAccountFactory(_, provider) {
  // we need to be able to swap out this account while leaving the original
  // provider in place for other accounts, so the subprovider here has to be
  // a different instance. using Proxy is a simple way to accomplish this.
  const subprovider = new Proxy(provider, {});
  return { subprovider, address: await getAccountAddress(subprovider) };
}

export async function browserProviderAccountFactory() {
  const subprovider = await getBrowserProvider();
  return { subprovider, address: await getAccountAddress(subprovider) };
}
