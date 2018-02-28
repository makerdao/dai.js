import SmartContractService from '../services/SmartContractService';


export default class PethToken extends ERC20Token {

  constructor(contract, tub) {
    this._contract = contract;
    this._tub = tub;
  }

  join(amount){
    this._tub.join(amount);
  }

  exit(amount){
    this._tub.exit(amount);
  }

  //the join and exit methods are on the TubContract
  //does it still make sense to 

}