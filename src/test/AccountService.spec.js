import AccountService from '../wallets/AccountService';



test('create account from private key', () => {
  const service = new AccountService.buildTestService();

  service.manager().connect()
    .then(() => {
      const wallet = service.getWalletFromPrivateKey('0x0123456789012345678901234567890123456789012345678901234567890123');
      expect(wallet.address).toBe('0x14791697260E4c9A71f18484C9f997B308e59325');
    });
});


test('create account from JSON file and password', () => {

});

test('create account with a new, empty wallet', () => {

});

test('lock an unlocked account', () => {

});

test('unlock a locked account', () => {

});