import PublicService from '../services/PublicService';
import Web3Service from '../web3/Web3Service';
//import NullLoggerService from '../loggers/NullLogger/NullLoggerService';

export default class GasEstimatorService extends PublicService {
  /**
   * @param {string} name
   */
  constructor(name = 'gasEstimator') { // should you be able to define number and policytype in the constructor?
    super(name, ['web3', 'log']);
    this._percentage = null; 
    this._absolute = null;
  }

  static buildTestService(web3 = null){
    web3 = web3 || Web3Service.buildTestService();
    const service = new GasEstimatorService();
    service.manager()
      .inject('log', web3.get('log'))
      .inject('web3', web3);
    return service;
  }

  estimateGasLimit(transaction){
    if (this._percentage === null && this._absolute === null) { throw new Error('no gas limit policy set'); }
    return Promise.all([
      this.get('web3').eth.getBlock('latest'),
      this.get('web3').eth.estimateGas(transaction)
    ])
      .then( web3Data => {
        const blockLimit = web3Data[0].gasLimit;
        const estimate = web3Data[1];
        if (this._percentage === null && this._absolute !== null) { return Math.min(this._absolute, blockLimit); } 
        if (this._absolute === null) { return Math.min(estimate * this._percentage, blockLimit); }
        return Math.min(estimate * this._percentage, this._absolute, blockLimit);
      });
  }

  setPercentage(number){
    if (number <= 0) {
      //this.get('log').error("gas limit policy number must be greater than 0");
      throw new Error('gas limit percentage must be greater than 0');
    }
    this._percentage = number;
  }

  setAbsolute(number){
    if (number <= 0) {
      //this.get('log').error("gas limit policy number must be greater than 0");
      throw new Error('gas limit must be greater than 0');
    }
    this._absolute = number;
  }

  removePercentage(){
    this._percentage = null;
  }

  removeAbsolute(){
    this._absolute = null;
  }

  //returns null if not set
  getPercentage(){
    return this._percentage;
  }

  //returns null if not set
  getAbsolute(){
    return this._absolute;
  }

}
