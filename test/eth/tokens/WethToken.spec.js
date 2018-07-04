import { buildTestEthereumTokenService } from '../../helpers/serviceBuilders';
import tokens from '../../../contracts/tokens';
import TestAccountProvider from '../../../src/utils/TestAccountProvider';

test('get WETH allowance of address', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      const token = ethereumTokenService.getToken(tokens.WETH);
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

test('token name and symbol are correct', done => {
  const ethereumTokenService = buildTestEthereumTokenService();

  let token = null;

  ethereumTokenService
    .manager()
    .authenticate()
    .then(() => {
      token = ethereumTokenService.getToken(tokens.WETH);
      return token.symbol();
    })
    .then(symbol => {
      expect(symbol).toEqual('WETH');
      return token.name();
    })
    .then(name => {
      expect(name).toBe('Wrapped Ether');
      done();
    });
});

test(
  'wrap and unwrap ETH',
  done => {
    const ethereumTokenService = buildTestEthereumTokenService();

    let token = null,
      originalBalance = null,
      owner = null;

    ethereumTokenService
      .manager()
      .authenticate()
      .then(() => {
        owner = ethereumTokenService.get('web3').defaultAccount();
        token = ethereumTokenService.getToken(tokens.WETH);
        return token.balanceOf(owner);
      })
      .then(b => {
        originalBalance = parseFloat(b);
        return token.deposit('0.1');
      })
      .then(() => token.balanceOf(owner))
      .then(b => {
        expect(parseFloat(b)).toBeCloseTo(originalBalance + 0.1, 12);
        return token.withdraw('0.1');
      })
      .then(() => token.balanceOf(owner))
      .then(b => {
        expect(parseFloat(b)).toBeCloseTo(originalBalance, 12);
        done();
      });
  },
  5000
);
