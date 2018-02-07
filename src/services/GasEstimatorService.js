import PublicService from '../services/PublicService';
import NullLoggerService from '../loggers/NullLogger/NullLoggerService';

export default class GasEstimatorService extends PublicService {
	/**
   * @param {string} name
   */
  constructor(name = 'gasEstimator') { // should you be able to define number and policytype in the constructor?
    super(name, ['web3', 'log']);
    this._percentage = null; 
    this._absolute = null;
  }

    //0xJs has a constant number of 200,000 that it adds to gas estimates as a buffer, as opposed to a percentage-based buffer
  //should make it so that if the gas would be over the block gas limit, the max allowable gas is returned instead.  Should also test for this
  estimateGasLimit(transaction){
    if (this._percentage == null && this._absolute == null) { throw new Error("no gas limit policy set"); } //0xJS calls estimateGas and addes 200000 if no gas limit provided as of last November: https://github.com/0xProject/0x.js/blob/46ad7b1b38df0f302821258629ffa749e7dd00b9/packages/0x.js/CHANGELOG.md
    let blockLimit = 0;
    return this.get('web3').eth.getBlock("latest")
    .then( block => {
      blockLimit = block.gasLimit;
      if (this._percentage == null && this._absolute != null) { return Math.min(this._absolute, blockLimit); } //to debug, try having this return the 2XXXX number
      return this.get('web3').eth.estimateGas(transaction)
    })
    .then(estimate => {
      if (this._absolute == null) { return Math.min(estimate * this._percentage, blockLimit); }
      return Math.min(estimate * this._percentage, this._absolute, blockLimit);
    })
  }

  setPercentage(number){
  	if (number <= 0) {
  		//this.get('log').error("gas limit policy number must be greater than 0");
  		throw new Error("gas limit percentage must be greater than 0");
  	}
  	this._percentage = number;
  }

  setAbsolute(number){
    if (number <= 0) {
      //this.get('log').error("gas limit policy number must be greater than 0");
      throw new Error("gas limit must be greater than 0");
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
