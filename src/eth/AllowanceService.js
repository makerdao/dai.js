import EthereumTokenService from './EthereumTokenService';
import PrivateService from '../core/PrivateService';
const utils = require('ethers').utils;

export default class AllowanceService extends PrivateService {

  static buildTestServiceMaxAllowance() {
    const service = new AllowanceService();
    const token = EthereumTokenService.buildTestService();

    service
      .manager()
      .inject('token', token);

    return service;
  }

  static buildTestServiceMinAllowance() {
    const service = new AllowanceService();
    const token = EthereumTokenService.buildTestService();

    service
      .manager()
      .inject('token', token)
      .settings({
        useMinimizeAllowancePolicy: true
      });

    return service;
  }

  constructor(name = 'allowance') {
    super(name, ['token']);
    this._useMinimizeAllowancePolicy = false;
  }

  initialize(settings){

    if (settings && settings.useMinimizeAllowancePolicy){
      this._useMinimizeAllowancePolicy = true;
    }
  }

  requireAllowance(tokenSymbol, spenderAddress, amountEstimate = -1) {
    const token = this.get('token').getToken(tokenSymbol);
    return token.allowance(this.get('token').get('web3').ethersSigner().address, spenderAddress).then(allowance=>{
      const EVMFormat = token.toEthereumFormat(allowance);
      const allowanceBigNumber = utils.bigNumberify(EVMFormat);
      const maxUint256 = utils.bigNumberify('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      let amountEstimateBigNumber = null;
      if (amountEstimate === -1){
        amountEstimateBigNumber = maxUint256;
      }else{
        amountEstimateBigNumber = utils.bigNumberify(amountEstimate);
      }

      if (allowanceBigNumber.lt(maxUint256.div('2')) && !this._useMinimizeAllowancePolicy){
        return token.approveUnlimited(spenderAddress);
      }
      if (allowanceBigNumber.lt(amountEstimateBigNumber) && this._useMinimizeAllowancePolicy){
        return token.approve(spenderAddress, amountEstimateBigNumber.toString());
      }
    });
  }

  removeAllowance(){
    //check if allowance >0, if so, remove allowance
  }

}
