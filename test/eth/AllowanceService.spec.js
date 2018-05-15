import AllowanceService from '../../src/eth/AllowanceService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
const utils = require('ethers').utils;

test.only('max allowance policy, no need to update', (done) => {
  const allowanceService = AllowanceService.buildTestServiceMaxAllowance();
  allowanceService.manager().authenticate().then(() => {
  	const randomAddress = TestAccountProvider.nextAddress();
  	const daiToken = allowanceService.get('token').getToken(tokens.DAI);

  	daiToken.approveUnlimited(randomAddress)
  	.then(()=>
  		allowanceService.updateAllowanceIfNecessary(tokens.DAI, randomAddress)
  	)
  	.then(()=>{
  		return daiToken.allowance(allowanceService.get('token').get('web3').ethersSigner().address, randomAddress)
  	})
  	.then(allowanceAfter=>{
  		console.log('allowanceAfter', allowanceAfter);
  		const EVMFormat = daiToken.toEthereumFormat(allowanceAfter);
  		const allowanceAfterBigNumber = utils.bigNumberify(EVMFormat);
  		const maxUint256 = utils.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      	console.log('maxUint256', maxUint256);
  		console.log('allowanceAfterBigNumber', allowanceAfterBigNumber);
  		expect(maxUint256.toString()).toEqual(allowanceAfterBigNumber.toString());
  		return daiToken.approve(randomAddress, '0');
  	})
  	.then(()=>{
  		done();
  	});
  });
});