import Account from 'eth-lib/lib/account';
import Wallet from 'web3-provider-engine/dist/es5/subproviders/wallet';
import { getBrowserProvider } from './setup';
import assert from 'assert';

export function privateKeyAccountFactory({ key }) {
  if (typeof key != 'string' || !key.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    throw new Error('Invalid private key format');
  }

  const [keyWithPreffix, keySansPrefix] = key.startsWith('0x')
    ? [key, key.replace(/^0x/, '')]
    : ['0x' + key, key];

  const account = Account.fromPrivate(keyWithPreffix);

  const keyBuffer = Buffer.from(keySansPrefix, 'hex');

  const subprovider = new Wallet(
    { getAddressString: () => account.address.toLowerCase(), getPrivateKey: () => keyBuffer },
    {}
  );

  return { subprovider, address: account.address };
}

async function getAccountAddress(subprovider, { offset = 0, address } = {}) {
  assert(!(offset && address), 'Cannot set both address and offset');

  return new Promise((resolve, reject) =>
    subprovider.handleRequest(
      { method: 'eth_accounts', params: [], id: 1 },
      null,
      (err, val) => {
        if (err) return reject(err);
        if (address) {
          const matchingAddress = val.find(
            a => a.toLowerCase() === address.toLowerCase()
          );
          assert(matchingAddress, 'No matching address found in provider.');
          resolve(matchingAddress.toLowerCase());
        } else {
          resolve(
            typeof val[offset] === 'string'
              ? val[offset].toLowerCase()
              : val[offset]
          );
        }
      }
    )
  );
}

export async function providerAccountFactory({ offset, address }, provider) {
  // we need to be able to swap out this account while leaving the original
  // provider in place for other accounts, so the subprovider here has to be
  // a different instance. using Proxy is a simple way to accomplish this.
  const subprovider = new Proxy(provider, {});
  return {
    subprovider,
    address: await getAccountAddress(subprovider, { offset, address })
  };
}

export async function browserProviderAccountFactory() {
  const subprovider = await getBrowserProvider();
  return { subprovider, address: await getAccountAddress(subprovider) };
}
