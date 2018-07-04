import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get PETH balance of address', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.PETH);
      return token.balanceOf(TestAccountProvider.nextAddress());
    })
    .then(balance => {
      expect(balance.toString()).toBe('0.0');
      done();
    });
});

test('get PETH allowance of address', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.PETH);
      return token.allowance(
        TestAccountProvider.nextAddress(),
        TestAccountProvider.nextAddress()
      );
    })
    .then(allowance => {
      expect(allowance.toString()).toBe('0.0');
      done();
    });
});

test(
  'should successfully join and exit PETH',
  done => {
    const tokenService = buildTestEthereumTokenService();
    let weth = null,
      peth = null,
      tub = null,
      owner = null,
      initialBalance = null;

    tokenService
      .manager()
      .authenticate()
      .then(() => {
        tub = tokenService
          .get('smartContract')
          .getContractByName(contracts.SAI_TUB);
        owner = tokenService.get('web3').defaultAccount();
        weth = tokenService.getToken(tokens.WETH);
        peth = tokenService.getToken(tokens.PETH);
        const depositTransaction = weth.deposit('0.1');
        return Promise.all([
          peth.balanceOf(owner),
          weth.approveUnlimited(tub.getAddress()),
          depositTransaction
        ]);
      })
      .then(result => {
        initialBalance = parseFloat(result[0]);
        const joinTransaction = peth.join('0.1');
        return joinTransaction;
      })
      .then(() => {
        const approveTransaction = peth.approveUnlimited(tub.getAddress());
        return Promise.all([peth.balanceOf(owner), approveTransaction]);
      })
      .then(result => {
        expect(parseFloat(result[0])).toBeCloseTo(initialBalance + 0.1, 12);
        return peth.exit('0.1');
      })
      .then(() => peth.balanceOf(owner))
      .then(balance => {
        expect(parseFloat(balance)).toBeCloseTo(initialBalance, 12);
        done();
      });
  },
  5000
);

// These need better tests
test('should return the wrapper ratio', done => {
  const tokenService = buildTestEthereumTokenService();
  let peth;

  tokenService
    .manager()
    .authenticate()
    .then(() => {
      peth = tokenService.getToken(tokens.PETH);
      peth.wrapperRatio().then(ratio => {
        expect(typeof ratio).toBe('number');
        done();
      });
    });
});

test('should return the join price in eth', done => {
  const tokenService = buildTestEthereumTokenService();

  tokenService
    .manager()
    .authenticate()
    .then(() => {
      tokenService
        .getToken(tokens.PETH)
        .joinPrice('1')
        .then(value => {
          expect(typeof value).toBe('number');
          expect(value).toEqual(1);
          done();
        });
    });
});

test('should return the exit price in eth', done => {
  const tokenService = buildTestEthereumTokenService();

  tokenService
    .manager()
    .authenticate()
    .then(() => {
      tokenService
        .getToken(tokens.PETH)
        .exitPrice('1')
        .then(value => {
          expect(typeof value).toBe('number');
          expect(value).toEqual(1);
          done();
        });
    });
});
