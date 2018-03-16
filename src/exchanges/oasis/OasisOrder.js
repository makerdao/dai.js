import OasisExchangeService from './OasisExchangeService';
import orderType from '../orderType';

export default class OasisOrder {

  constructor(transaction) { //may need to pass addl arguments to listen for tx events
  	this._transaction = transaction;
  	this._timeStamp = new Date(); //time that the transaction was submitted to the network.  should we also have a time for when it was accepted
  	this._fillAmount = 0;
  }

	timeStamp(){
		return this._timeStamp;
	}	

	fees(){
		//gas cost in this case - need to wait for tx to get mined
	}		

	status(){
		//include every state that a tx can be in, and maybe other states as well, e.g. something related to oasis
	}		

	type(){
		return orderType.market; //create enum for this
	}			

	fillAmount(){
		return this._fillAmount; //need to wait for tx to get mined
	}			

}