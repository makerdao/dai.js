import AllowanceService from '../../src/eth/AllowanceService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';

test('max allowance policy, no need to update', (done) => {
  const allowanceService = AllowanceService.buildTestServiceMaxAllowance();
  allowanceService.manager().authenticate().then(() => {
  	const randomAddress = TestAccountProvider.nextAddress();
  	console.log('randomAddress', randomAddress);
  	allowanceService.updateAllowanceIfNecessary(tokens.DAI, randomAddress);
    done();
  });
});