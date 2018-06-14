import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
const utils = require('ethers').utils;
import { buildTestService } from '../helpers/serviceBuilders';

function buildTestAllowanceServiceMax() {
  return buildTestService('allowance', { allowance: true });
}

function buildTestAllowanceServiceMin() {
  return buildTestService('allowance', {
    allowance: { useMinimizeAllowancePolicy: true }
  });
}

test('max allowance policy, no need to update', done => {
  const allowanceService = buildTestAllowanceServiceMax();
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approveUnlimited(randomAddress)
        .then(() =>
          allowanceService.requireAllowance(tokens.DAI, randomAddress)
        )
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          const EVMFormat = daiToken.toEthereumFormat(allowanceAfter);
          const allowanceAfterBigNumber = utils.bigNumberify(EVMFormat);
          const maxUint256 = utils.bigNumberify(
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
          );
          expect(maxUint256.toString()).toEqual(
            allowanceAfterBigNumber.toString()
          );
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});

test('max allowance policy, need to update', done => {
  const allowanceService = buildTestAllowanceServiceMax();
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approve(randomAddress, '0')
        .then(() =>
          allowanceService.requireAllowance(tokens.DAI, randomAddress)
        )
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          const EVMFormat = daiToken.toEthereumFormat(allowanceAfter);
          const allowanceAfterBigNumber = utils.bigNumberify(EVMFormat);
          const maxUint256 = utils.bigNumberify(
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
          );
          expect(maxUint256.toString()).toEqual(
            allowanceAfterBigNumber.toString()
          );
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});

test('min allowance policy, need to update', done => {
  const allowanceService = buildTestAllowanceServiceMin();
  const estimate = 100;
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approve(randomAddress, '0')
        .then(() =>
          allowanceService.requireAllowance(tokens.DAI, randomAddress, estimate)
        )
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          expect(parseInt(allowanceAfter)).toEqual(estimate);
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});

test('min allowance policy, no need to update', done => {
  const allowanceService = buildTestAllowanceServiceMin();
  const estimate = 100;
  const initialAllowance = '200';
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approve(randomAddress, initialAllowance)
        .then(() =>
          allowanceService.requireAllowance(tokens.DAI, randomAddress, estimate)
        )
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          expect(parseInt(allowanceAfter)).toEqual(parseInt(initialAllowance));
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});

test('removeAllowance() works, need to update', done => {
  const allowanceService = buildTestAllowanceServiceMin();
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approve(randomAddress, '300')
        .then(() => allowanceService.removeAllowance(tokens.DAI, randomAddress))
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          expect(parseInt(allowanceAfter)).toEqual(0);
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});

test('removeAllowance() works, no need to update', done => {
  const allowanceService = buildTestAllowanceServiceMin();
  allowanceService
    .manager()
    .authenticate()
    .then(() => {
      const randomAddress = TestAccountProvider.nextAddress();
      const daiToken = allowanceService.get('token').getToken(tokens.DAI);

      daiToken
        .approve(randomAddress, '0')
        .then(() => allowanceService.removeAllowance(tokens.DAI, randomAddress))
        .then(() => {
          return daiToken.allowance(
            allowanceService
              .get('token')
              .get('web3')
              .ethersSigner().address,
            randomAddress
          );
        })
        .then(allowanceAfter => {
          expect(parseInt(allowanceAfter)).toEqual(0);
          return daiToken.approve(randomAddress, '0');
        })
        .then(() => {
          done();
        });
    });
});
