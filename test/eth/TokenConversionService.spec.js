import { buildTestService } from '../helpers/serviceBuilders';
import tokens from '../../contracts/tokens';

function buildTestTokenConversionService(maxAllowance = true) {
  return buildTestService('conversionService', {
    allowance: maxAllowance ? true : { useMinimizeAllowancePolicy: true },
    conversionService: true
  });
}

test(
  'should convert eth to weth',
  done => {
    let initialBalance, initialEthBalance, owner, token, eth;
    const conversionService = buildTestTokenConversionService();
    conversionService
      .manager()
      .authenticate()
      .then(() => {
        const tokenService = conversionService.get('token');
        owner = tokenService.get('web3').defaultAccount();
        token = tokenService.getToken(tokens.WETH);
        eth = tokenService.getToken(tokens.ETH);
        return eth.balanceOf(owner);
      })
      .then(balance => {
        initialEthBalance = parseFloat(balance);
        return token.balanceOf(owner);
      })
      .then(balance => {
        initialBalance = parseFloat(balance);
        return conversionService.convertEthToWeth('0.1');
      })
      .then(() => eth.balanceOf(owner))
      .then(newEthBalance => {
        expect(parseFloat(initialEthBalance)).toBeGreaterThan(
          parseFloat(newEthBalance)
        );
        return token.balanceOf(owner);
      })
      .then(newBalance => {
        expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
        done();
      });
  },
  5000
);

test(
  'should convert weth to peth',
  done => {
    let initialBalance;
    const conversionService = buildTestTokenConversionService(false);
    conversionService
      .manager()
      .authenticate()
      .then(() => {
        const tokenService = conversionService.get('token');
        const owner = tokenService.get('web3').defaultAccount();
        const token = tokenService.getToken(tokens.PETH);

        token
          .balanceOf(owner)
          .then(balance => (initialBalance = parseFloat(balance)));
        conversionService.convertEthToWeth('0.1').then(() => {
          conversionService.convertWethToPeth('0.1').then(() => {
            token.balanceOf(owner).then(newBalance => {
              expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
              done();
            });
          });
        });
      });
  },
  5000
);

test(
  'should convert eth to peth',
  done => {
    let initialBalance;
    const conversionService = buildTestTokenConversionService(false);
    conversionService
      .manager()
      .authenticate()
      .then(() => {
        const tokenService = conversionService.get('token');
        const owner = tokenService.get('web3').defaultAccount();
        const token = tokenService.getToken(tokens.PETH);

        token
          .balanceOf(owner)
          .then(balance => (initialBalance = parseFloat(balance)));
        conversionService.convertEthToPeth('0.1').then(() => {
          token.balanceOf(owner).then(newBalance => {
            expect(parseFloat(newBalance)).toBeCloseTo(initialBalance + 0.1);
            done();
          });
        });
      });
  },
  5000
);
