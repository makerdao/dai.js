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
        //address: '0xd0a1e359811322d97fi991e03f863a0c30c2cf029c', kovan weth
        address: '0x8cf1Cab422A0b6b554077A361f8419cDf122a9F9', //kovan oasis
        //topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'] //hash of Transfer(...)
        topics: ['0x819e390338feffe95e2de57172d6faf337853dfd15c7a09a32d76f7fd2443875']
      }
      return this._ethersProvider.getLogs(filter);
    }).
    then(filterResults=>{
      //console.log('filterResults', filterResults);
      //console.log('transaction.hash', transaction.hash);
      const events = filterResults.filter((t)=> t.transactionHash === transaction.hash); //there could be several of these
      let totalDai = 0;
      events.forEach(event=>{
        console.log('event: ', event);
        console.log('amount of token received: ', event.data.substring(2,66));
        totalDai += parseInt(event.data.substring(2,66), 16);
      });
      console.log('totalDai', totalDai);
      return utils.formatEther(totalDai);
    })
  }	

}