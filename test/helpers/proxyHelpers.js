import { MKR } from '../../src/eth/Currency';
import TestAccountProvider from './TestAccountProvider';
import accounts from './testAccounts';

// Provided service for all functions must directly
// depend on the token service.

export async function setProxyAccount(service, account) {
  const accountService = service
    .get('token')
    .get('web3')
    .get('accounts');
  await accountService.addAccount(account.address, {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount(account.address);
}

export async function setNewAccount(service, index = 20) {
  const accountService = service.get('web3').get('accounts');
  TestAccountProvider.setIndex(index);
  const account = {
    address: accounts.addresses[index],
    key: accounts.keys[index]
  };
  await accountService.addAccount(account.address, {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount(account.address);
  const proxy = await service.currentProxy();
  if (proxy) {
    console.log(proxy);
    setNewAccount(service, index + 5);
  }
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
