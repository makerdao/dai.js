import EthereumTokenService from './EthereumTokenService';
import PrivateService from '../core/PrivateService';

export default class AllowanceService extends PrivateService {

  static buildTestServiceMaxAllowance() {
    const service = new AllowanceService();
    const token = EthereumTokenService.buildTestService();

    service
      .manager()
      .inject('token', token);

    return service;
  }

  constructor(name = 'allowance') {
    super(name, ['token']);
  }

  updateAllowanceIfNecessary(tokenSymbol, spenderAddress, amountEstimate = -1) {
    const token = this.get('token').getToken(tokenSymbol);
    return token.allowance(this.get('token').get('web3').ethersSigner().address, spenderAddress).then(allowance=>{
      console.log('allowance', allowance);
      console.log('type', typeof allowance);
      console.log('max safe number', Number.MAX_SAFE_INTEGER);
      if (allowance < 100000){
        return token.approveUnlimited(spenderAddress);
      }
    });
  }

}
