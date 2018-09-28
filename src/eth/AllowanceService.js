import PrivateService from '../core/PrivateService';
import BigNumber from 'bignumber.js';
import { UINT256_MAX } from '../utils/constants';
import tracksTransactions from '../utils/tracksTransactions';

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

  @tracksTransactions
  async requireAllowance(
    tokenSymbol,
    spenderAddress,
    { estimate = maxAllowance, promise }
  ) {
    const token = this.get('token').getToken(tokenSymbol);
    const ownerAddress = this.get('token')
      .get('web3')
      .currentAccount();
    const allowance = await token.allowance(ownerAddress, spenderAddress);

    if (allowance.lt(maxAllowance.div(2)) && !this._shouldMinimizeAllowance) {
      return token.approveUnlimited(spenderAddress, { promise });
    }

    if (allowance.lt(estimate) && this._shouldMinimizeAllowance) {
      return token.approve(spenderAddress, estimate, { promise });
    }
  }

  @tracksTransactions
  async removeAllowance(tokenSymbol, spenderAddress, { promise }) {
    const token = this.get('token').getToken(tokenSymbol);
    const allowance = await token.allowance(
      this.get('token')
        .get('web3')
        .currentAccount(),
      spenderAddress
    );
    if (parseInt(allowance) != 0) {
      return token.approve(spenderAddress, '0', { promise });
    }
  }
}
