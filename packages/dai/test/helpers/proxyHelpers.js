import { MKR } from '../../src/eth/Currency';
import accounts from 'test-helpers/src/testAccounts.json';

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

export async function getNewAccount(proxyService, index = 20) {
  const account = {
    address: accounts.addresses[index],
    key: accounts.keys[index]
  };
  const proxy = await proxyService.getProxyAddress(account.address);
  if (proxy) return await getNewAccount(proxyService, index + 5);
  return account;
}

export async function setNewAccount(service) {
  const account = await getNewAccount(service);
  const accountService = service.get('web3').get('accounts');
  await accountService.addAccount(account.address, {
    type: 'privateKey',
    key: account.key
  });
  accountService.useAccount(account.address);
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
