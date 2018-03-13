import OasisExchangeService from './OasisExchangeService';

export default class OasisOrder {

  constructor(transaction) { //may need to pass addl arguments to listen for tx events
  	this._transaction = transaction;
  	this._timeStamp = new Date(); //current time
  	this._fillAmount = 0;
  }

	timeStamp(){
		return 'banana';
	}	

	fees(){
		//gas cost in this case
	}		

	status(){
		//include every state that a tx can be in, and maybe other states as well, e.g. something related to oasis
	}		

	type(){
		return orderType.market; //create enum for this
	}			

	fillAmount(){
		return this._fillAmount;
	}			

}