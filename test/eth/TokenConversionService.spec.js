import TokenConversionService from '../../src/eth/TokenConversionService';
import EthereumTokenService from '../../src/eth/EthereumTokenService';
import tokens from '../../contracts/tokens';

import { utils } from 'ethers';

let conversionService;
let tokenService;

beforeAll(() => {
  conversionService = TokenConversionService.buildTestService();
  return tokenService = EthereumTokenService.buildTestService();
});

function parseBigNumber(number) {
  return parseFloat(utils.formatEther(number));
}

test('should convert eth to weth', done => {
  let initialBalance;

  conversionService.manager().authenticate().then(() => {
    tokenService.manager().authenticate().then(() => {
      const owner = tokenService.get('web3').defaultAccount();
      const token = tokenService.getToken(tokens.WETH);

      token.balanceOf(owner).then(balance => initialBalance = parseBigNumber(balance));
      conversionService.convertEthToWeth('0.1').then(() => {
        token.balanceOf(owner).then(newBalance => {
          expect(parseBigNumber(newBalance)).toBeCloseTo(initialBalance + 0.1);
          done();
        });
      });
    });
  });
});

test('should convert weth to peth', done => {
  let initialBalance;

  conversionService.manager().authenticate().then(() => {
    tokenService.manager().authenticate().then(() => {
      const owner = tokenService.get('web3').defaultAccount();
      const token = tokenService.getToken(tokens.PETH);

      token.balanceOf(owner).then(balance => initialBalance = parseBigNumber(balance));
      conversionService.convertEthToWeth('0.1').then(() => {
        conversionService.convertWethToPeth('0.1').then(() => {
          token.balanceOf(owner).then(newBalance => {
            expect(parseBigNumber(newBalance)).toBeCloseTo(initialBalance + 0.1);
            done();
          });
        });
      });
    });
  });
});

test('should convert eth to peth', done => {
  let initialBalance;

  conversionService.manager().authenticate().then(() => {
    const owner = tokenService.get('web3').defaultAccount();
    const token = tokenService.getToken(tokens.PETH);

    token.balanceOf(owner).then(balance => initialBalance = parseBigNumber(balance));
    conversionService.convertEthToPeth('0.1').then(() => {
      token.balanceOf(owner).then(newBalance => {
        expect(parseBigNumber(newBalance)).toBeCloseTo(initialBalance + 0.1);
        done();
      });
    });
  });
});
