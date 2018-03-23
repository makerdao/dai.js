import OasisExchangeService from './OasisExchangeService';
import orderType from '../orderType';
import { utils } from 'ethers';

export default class OasisOrder {

  constructor(transaction, ethersProvider) { //may need to pass addl arguments to listen for tx events
    this._ethersProvider = ethersProvider;
  	this._transaction = transaction;
  	this._timeStamp = new Date(); //time that the transaction was submitted to the network.  should we also have a time for when it was accepted
  }

  timeStamp(){
    return this._timeStamp;
  }	

  fees(){ //returns gas used in Ether
    let gasPrice = 0;
    return this._transaction.then(tx=>{
      gasPrice = tx.gasPrice;
      return this._ethersProvider.waitForTransaction(tx.hash);
    })
    .then(tx => {
      return this._ethersProvider.getTransactionReceipt(tx.hash);
    }).
    then(receipt=>{
      //unable to convert a decimal number to a BigNumber, so convert from wei to ether after the multiplication
      const fee = receipt.gasUsed.mul(gasPrice);
      return utils.formatEther(fee);
    })
  }		

  status(){
    //include every state that a tx can be in, and maybe other states as well, e.g. something related to oasis
  }		

  type(){
    return orderType.market; //create enum for this
  }			

  fillAmount(){
    let transaction = null;
    return this._transaction.then(tx=>{
      //console.log('tx', tx);
      transaction = tx;
      return this._ethersProvider.waitForTransaction(tx.hash);
    })
    .then(tx => {
      //console.log('txHash after mined', tx);
      const filter = {
        fromBlock: "latest", //what if somehow another block gets added in between here?
        toBlock: "latest",
        address: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2' //kovan dai address - how do we know that it was Dai that was sold?  update once we determine if this is the proper event to search for
        //topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] //hash of Transfer(...)
      }
      return this._ethersProvider.getLogs(filter);
    }).
    then(filterResults=>{
      //console.log('filterResults', filterResults);
      //console.log('transaction.hash', transaction.hash);
      const events = filterResults.filter((t)=> t.transactionHash === transaction.hash); //there could be several of these
      events.forEach(event=>{
        //console.log('event: ', event);
        //console.log('amount of Dai sold: ', event.data);
        return event.data;
      });
    })
  }			

}