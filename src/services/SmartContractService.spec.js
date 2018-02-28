// import PublicService from './PublicService';

import Web3Service from '../web3/Web3Service';
import { debug } from 'util';

// default testing account for Kovan eth
// public key 0x717bc9648b627316718Fe93f4cD98056E53a8C8d

test('wrap .001 kovan eth', (done) => {
  const service = Web3Service.buildEthersService();

  var kovanPrivateKey = '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700';
  var infuraKey = 'ihagQOzC3mkRXYuCivDN';  //TODO: put these in environment vars

  service.manager().connect()
    .then(() => {
    // create ethersjs Wallet with infura kovan Provider attached to it
      var infuraProvider = new service._ethers.providers.InfuraProvider('kovan', infuraKey);
      var wallet = new service._ethers.Wallet(kovanPrivateKey, infuraProvider);
      console.log(wallet);

      // create WETH Contract object
      var contractAddress = '0xd0a1e359811322d97991e03f863a0c30c2cf029c';
      var abi = [
        {'constant':true,'inputs':[],'name':'name','outputs':[{'name':'','type':'string'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'guy','type':'address'},{'name':'wad','type':'uint256'}],'name':'approve','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'totalSupply','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'src','type':'address'},{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'transferFrom','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'wad','type':'uint256'}],'name':'withdraw','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'decimals','outputs':[{'name':'','type':'uint8'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[{'name':'','type':'address'}],'name':'balanceOf','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[],'name':'symbol','outputs':[{'name':'','type':'string'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'transfer','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[],'name':'deposit','outputs':[],'payable':true,'stateMutability':'payable','type':'function'},{'constant':true,'inputs':[{'name':'','type':'address'},{'name':'','type':'address'}],'name':'allowance','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'payable':true,'stateMutability':'payable','type':'fallback'},{'anonymous':false,'inputs':[{'indexed':true,'name':'src','type':'address'},{'indexed':true,'name':'guy','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Approval','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'src','type':'address'},{'indexed':true,'name':'dst','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Transfer','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'dst','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Deposit','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'src','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Withdrawal','type':'event'}
      ];
      var contract = new service._ethers.Contract(contractAddress, abi, wallet);
      console.log(contract);
    
      // check Eth balance of Wallet
      var ethBalance = wallet.getBalance();         //Returns a Promise with the balance of the wallet (as a BigNumber, in wei) at the blockTag, defaults to latest.
      ethBalance.then(function(balance) {
        var currentEthBalance = service._ethers.utils.formatEther('' + balance);
        console.log('current ETH balance is: ', currentEthBalance);  // this is a decimal, like .8395
      });

      // callPromise to check WETH balance of Wallet
      var callPromise = contract.balanceOf('0x717bc9648b627316718Fe93f4cD98056E53a8C8d');
      callPromise.then(function(balance) {
        var wethBalance = service._ethers.utils.formatEther('' + balance);
        console.log('current WETH balance is: ', wethBalance);
      });

      // sendPromise to approve the wrapping
      var sendPromise = contract.approve('0x717bc9648b627316718Fe93f4cD98056E53a8C8d', service._ethers.utils.parseEther('20000'));
      sendPromise.then(function(transaction) {
        console.log(transaction);
      });

      // create override options to send a value with the deposit()
      console.log(service._ethers.utils.parseEther('.001'));       // BigNumber { _bn: <BN: 38d7ea4c68000> }
      var wei = service._ethers.utils.parseEther('.001');
      var overrideOptions = {
        value: wei
      };

      // sendPromise2 to wrap 0.001 eth
      var sendPromise2 = contract.deposit(overrideOptions);
      sendPromise2.then(function(transaction) {
        console.log(transaction);
        done();

      // checking the updated balances is not working. I'll try incrementing the nonce each time
      /* // check new ETH balance of Wallet
      var newEthBalance = wallet.getBalance();         //Returns a Promise with the balance of the wallet (as a BigNumber, in wei) at the blockTag, defaults to latest.
      newEthBalance.then(function(balance) {
        var newEthBalance = service._ethers.utils.formatEther('' + balance);
        console.log('new ETH balance is: ', newEthBalance);  // this is a decimal, like .8395
      });
  
      // callPromise to check new WETH balance of Wallet
      var callPromise2 = contract.balanceOf('0x717bc9648b627316718Fe93f4cD98056E53a8C8d');
      console.log(callPromise2);
      callPromise2.then(function(balance) {
        var newWethBalance = service._ethers.utils.formatEther('' + balance);
        console.log('new WETH balance is: ', newWethBalance);
      });
      */
      });
    });
}, 15000);

test('get token contract for MKR and see if its supply is 1,000,000', (done) => {
  const service = Web3Service.buildEthersService();

  service.manager().connect()
    .then(() => {
    // create MKR contract object
      var contractAddress = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2';
      var abi = [
        {'constant':true,'inputs':[],'name':'name','outputs':[{'name':'','type':'bytes32'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[],'name':'stop','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'guy','type':'address'},{'name':'wad','type':'uint256'}],'name':'approve','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'owner_','type':'address'}],'name':'setOwner','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'totalSupply','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'src','type':'address'},{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'transferFrom','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'decimals','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'guy','type':'address'},{'name':'wad','type':'uint256'}],'name':'mint','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'wad','type':'uint256'}],'name':'burn','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'name_','type':'bytes32'}],'name':'setName','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[{'name':'src','type':'address'}],'name':'balanceOf','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[],'name':'stopped','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'authority_','type':'address'}],'name':'setAuthority','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'owner','outputs':[{'name':'','type':'address'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[],'name':'symbol','outputs':[{'name':'','type':'bytes32'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'guy','type':'address'},{'name':'wad','type':'uint256'}],'name':'burn','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'wad','type':'uint256'}],'name':'mint','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'transfer','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'push','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[{'name':'src','type':'address'},{'name':'dst','type':'address'},{'name':'wad','type':'uint256'}],'name':'move','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':false,'inputs':[],'name':'start','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[],'name':'authority','outputs':[{'name':'','type':'address'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'guy','type':'address'}],'name':'approve','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'constant':true,'inputs':[{'name':'src','type':'address'},{'name':'guy','type':'address'}],'name':'allowance','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'src','type':'address'},{'name':'wad','type':'uint256'}],'name':'pull','outputs':[],'payable':false,'stateMutability':'nonpayable','type':'function'},{'inputs':[{'name':'symbol_','type':'bytes32'}],'payable':false,'stateMutability':'nonpayable','type':'constructor'},{'anonymous':false,'inputs':[{'indexed':true,'name':'guy','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Mint','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'guy','type':'address'},{'indexed':false,'name':'wad','type':'uint256'}],'name':'Burn','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'authority','type':'address'}],'name':'LogSetAuthority','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'owner','type':'address'}],'name':'LogSetOwner','type':'event'},{'anonymous':true,'inputs':[{'indexed':true,'name':'sig','type':'bytes4'},{'indexed':true,'name':'guy','type':'address'},{'indexed':true,'name':'foo','type':'bytes32'},{'indexed':true,'name':'bar','type':'bytes32'},{'indexed':false,'name':'wad','type':'uint256'},{'indexed':false,'name':'fax','type':'bytes'}],'name':'LogNote','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'from','type':'address'},{'indexed':true,'name':'to','type':'address'},{'indexed':false,'name':'value','type':'uint256'}],'name':'Transfer','type':'event'},{'anonymous':false,'inputs':[{'indexed':true,'name':'owner','type':'address'},{'indexed':true,'name':'spender','type':'address'},{'indexed':false,'name':'value','type':'uint256'}],'name':'Approval','type':'event'}
      ];
      var contract = new service._ethers.Contract(contractAddress, abi, service._ethersProvider);

      var callPromise = contract.totalSupply();
      callPromise.then(function(result) {
        var q = '' + result[0]._bn;  // converts hex to a string number
        console.log(q);
        var num = service._ethers.utils.formatUnits(q, 18);  // converts from wei
        expect(num).toBe('1000000.0');
        done();
      },
      reason => console.error(reason)
      );
    });
});

test('send an ETH transfer transaction to the Kovan network', (done) => {
  const service = Web3Service.buildEthersService();

  service.manager().connect()
    .then(() => {
      var privateKey = '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700';
      var infuraKey = 'ihagQOzC3mkRXYuCivDN';  // TODO: put these in environment vars 

      var infuraProvider = new service._ethers.providers.InfuraProvider('kovan', infuraKey);
      var wallet = new service._ethers.Wallet(privateKey, infuraProvider);

      var transaction = {
        to: '0xFD53E4AB1f71fDA9D5Ea42ECE36981302829c900',
        value: service._ethers.utils.parseEther('0.001')
      };
      console.log(transaction);

      var estimateGasPromise = wallet.estimateGas(transaction);

      estimateGasPromise.then(function(gasEstimate) {
        console.log(gasEstimate.toString());
        transaction.gasLimit = gasEstimate;
        expect(gasEstimate.toString()).toBeDefined();

        // Send the transaction
        var sendTransactionPromise = wallet.sendTransaction(transaction);

        sendTransactionPromise.then(function(transactionHash) {
          console.log(transactionHash);
          done();
        });
      });
    });
}, 15000);
