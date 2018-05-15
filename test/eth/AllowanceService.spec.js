import AllowanceService from '../../src/eth/AllowanceService';
import tokens from '../../contracts/tokens';
import TestAccountProvider from '../../src/utils/TestAccountProvider';
const utils = require('ethers').utils;

test('max allowance policy, no need to update', (done) => {
  const allowanceService = AllowanceService.buildTestServiceMaxAllowance();
  allowanceService.manager().authenticate().then(() => {
  	const randomAddress = TestAccountProvider.nextAddress();
  	const daiToken = allowanceService.get('token').getToken(tokens.DAI);

  	daiToken.approveUnlimited(randomAddress)
  	.then(()=>
  		allowanceService.requireAllowance(tokens.DAI, randomAddress)
  	)
  	.then(()=>{
  		return daiToken.allowance(allowanceService.get('token').get('web3').ethersSigner().address, randomAddress)
  	})
  	.then(allowanceAfter=>{
  		const EVMFormat = daiToken.toEthereumFormat(allowanceAfter);
  		const allowanceAfterBigNumber = utils.bigNumberify(EVMFormat);
  		const maxUint256 = utils.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  		expect(maxUint256.toString()).toEqual(allowanceAfterBigNumber.toString());
  		return daiToken.approve(randomAddress, '0');
  	})
  	.then(()=>{
  		done();
  	});
  });
});

test('max allowance policy, need to update', (done) => {
  const allowanceService = AllowanceService.buildTestServiceMaxAllowance();
  allowanceService.manager().authenticate().then(() => {
  	const randomAddress = TestAccountProvider.nextAddress();
  	const daiToken = allowanceService.get('token').getToken(tokens.DAI);

  	daiToken.approve(randomAddress, '0')
  	.then(()=>
  		allowanceService.requireAllowance(tokens.DAI, randomAddress)
  	)
  	.then(()=>{
  		return daiToken.allowance(allowanceService.get('token').get('web3').ethersSigner().address, randomAddress)
  	})
  	.then(allowanceAfter=>{
  		const EVMFormat = daiToken.toEthereumFormat(allowanceAfter);
  		const allowanceAfterBigNumber = utils.bigNumberify(EVMFormat);
  		const maxUint256 = utils.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  		expect(maxUint256.toString()).toEqual(allowanceAfterBigNumber.toString());
  		return daiToken.approve(randomAddress, '0');
  	})
  	.then(()=>{
  		done();
  	});
  });
});