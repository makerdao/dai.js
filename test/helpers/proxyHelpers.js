import { MKR } from '../../src/eth/Currency';

// Provided service for all functions must directly
// depend on the token service.

export async function setProxyAccount(service, address, key) {
  const accountService = service
    .get('token')
    .get('web3')
    .get('accounts');
  await accountService.addAccount(address, {
    type: 'privateKey',
    key: key
  });
  accountService.useAccount(address);
}

export async function transferMkr(service, address) {
  const mkr = service.get('token').getToken(MKR);
  await mkr.transfer(address, MKR(1));
}

export async function setExistingAccount(service, name) {
  const accountService = service
    .get('token')
    .get('web3')
    .get('accounts');
  accountService.useAccount(name);
}
