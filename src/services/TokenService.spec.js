
import NullLoggerService from "../loggers/NullLogger/NullLoggerService";
import TokenService from "./TokenService";
import WalletService from "../wallets/EthereumWalletService";
//import MakerDaoService from "../MakerDaoService";

test('dummy test'), (done => {
  let x = 5;
  done();
});
/*
test('TokenService.transfer', (done) => {
  const
    log = new NullLoggerService(),
    token = new TokenService();
    wallet = new WalletService();
    makerDao = new MakerDaoService();

  token.manager()
    .inject('log', log)
    .inject('wallet', wallet)
    .inject('makerDao', makerDao).authenticate().then(() => {

    let checkpoints = 0, recipientAddress = null, sendAmount = 0;

    wallet.createAccount()
      .then(address => {
        recipientAddress = address;
        return token.getBalance(makerDao.tokens.DAI, address);
      })
      .then(balance => {
        expect(balance).toBe(0);
        checkpoints++;
        return token.getBalance(makerDao.tokens.DAI, wallet.accounts.MAIN);
      })
      .then(mainBalance => {
        sendAmount = mainBalance;
        return token.transfer(makerDao.tokens.DAI, wallet.accounts.MAIN, recipientAddress, sendAmount);
      })
      .then(() => Promise.all([
        token.getBalance(makerDao.tokens.DAI, wallet.accounts.MAIN),
        token.getBalance(makerDao.tokens.DAI, recipientAddress)
      ])
      .then(balances => {
        expect(balances[0]).toBe(0);
        expect(balances[1]).toBe(sendAmount);
        expect(checkpoints).toBe(1);
        
        done();
      })
      .catch(reason => console.error('Something went wrong: ', reason));

  });
});
*/
