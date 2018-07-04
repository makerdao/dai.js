import PrivateService from '../core/PrivateService';
const utils = require('ethers').utils;

export default class AllowanceService extends PrivateService {
  constructor(name = 'allowance') {
    super(name, ['token']);
    this._useMinimizeAllowancePolicy = false;
  }

  initialize(settings) {
    if (settings && settings.useMinimizeAllowancePolicy) {
      this._useMinimizeAllowancePolicy = true;
    }
  }

  requireAllowance(tokenSymbol, spenderAddress, amountEstimate = -1) {
    const token = this.get('token').getToken(tokenSymbol);
    return token
      .allowance(
        this.get('token')
          .get('web3')
          .ethersSigner().address,
        spenderAddress
      )
      .then(allowance => {
        const EVMFormat = token.toEthereumFormat(allowance);
        const allowanceBigNumber = utils.bigNumberify(EVMFormat);
        const maxUint256 = utils.bigNumberify(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
        let amountEstimateBigNumber = null;
        if (amountEstimate === -1) {
          amountEstimateBigNumber = maxUint256;
        } else {
          amountEstimateBigNumber = utils.bigNumberify(amountEstimate);
        }

        if (
          allowanceBigNumber.lt(maxUint256.div('2')) &&
          !this._useMinimizeAllowancePolicy
        ) {
          return token.approveUnlimited(spenderAddress);
        }
        if (
          allowanceBigNumber.lt(amountEstimateBigNumber) &&
          this._useMinimizeAllowancePolicy
        ) {
          return token.approve(
            spenderAddress,
            amountEstimateBigNumber.toString()
          );
        }
      });
  }

  removeAllowance(tokenSymbol, spenderAddress) {
    const token = this.get('token').getToken(tokenSymbol);
    return token
      .allowance(
        this.get('token')
          .get('web3')
          .ethersSigner().address,
        spenderAddress
      )
      .then(allowance => {
        if (parseInt(allowance) != 0) {
          return token.approve(spenderAddress, '0');
        }
      });
  }
}
