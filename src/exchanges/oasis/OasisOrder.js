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
      });
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
          fromBlock: 'latest', //what if somehow another block gets added in between here?
          toBlock: 'latest',
          address: '0xd0a1e359811322d97991e03f863a0c30c2cf029c', //kovan weth address - probably better to use the Oasis log logTrade shouldwork), then we don't care whether it was weth or dai that was purchased.
          topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] //hash of Transfer(...)
        };
        return this._ethersProvider.getLogs(filter);
      }).
      then(filterResults=>{
      //console.log('filterResults', filterResults);
      //console.log('transaction.hash', transaction.hash);
        const events = filterResults.filter((t)=> t.transactionHash === transaction.hash); //there could be several of these
        let totalDai = 0;
        events.forEach(event=>{
        //console.log('event: ', event);
        //console.log('amount of weth received: ', event.data);
          totalDai += parseInt(event.data, 16);
        });
        return utils.formatEther(totalDai);
      });
  }			

}