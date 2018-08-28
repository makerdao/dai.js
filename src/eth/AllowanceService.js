import PrivateService from '../core/PrivateService';
import BigNumber from 'bignumber.js';
import { UINT256_MAX } from '../utils/constants';

const maxAllowance = BigNumber(UINT256_MAX).shiftedBy(-18);

export default class AllowanceService extends PrivateService {
  constructor(name = 'allowance') {
    super(name, ['token']);
    this._shouldMinimizeAllowance = false;
  }

  initialize(settings) {
    if (settings && settings.useMinimizeAllowancePolicy) {
      this._shouldMinimizeAllowance = true;
    }
  }

  async requireAllowance(
    tokenSymbol,
    spenderAddress,
    amountEstimate = maxAllowance
  ) {
    const token = this.get('token').getToken(tokenSymbol);
    const ownerAddress = this.get('token')
      .get('web3')
      .currentAccount();
    const allowance = await token.allowance(ownerAddress, spenderAddress);

    if (allowance.lt(maxAllowance.div(2)) && !this._shouldMinimizeAllowance) {
      return token.approveUnlimited(spenderAddress);
    }

    if (allowance.lt(amountEstimate) && this._shouldMinimizeAllowance) {
      return token.approve(spenderAddress, amountEstimate);
    }
  }

  removeAllowance(tokenSymbol, spenderAddress) {
    const token = this.get('token').getToken(tokenSymbol);
    return token
      .allowance(
        this.get('token')
          .get('web3')
          .currentAccount(),
        spenderAddress
      )
      .then(allowance => {
        if (parseInt(allowance) != 0) {
          return token.approve(spenderAddress, '0');
        }
      });
  }
}
