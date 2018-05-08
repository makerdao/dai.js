import PrivateService from '../../core/PrivateService';
import Web3Service from '../../eth/Web3Service';
import SmartContractService from '../../eth/SmartContractService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import GasEstimatorService from '../../eth/GasEstimatorService';
import TimerService from '../../utils/TimerService';
//import * as Web3ProviderEngine  from 'web3-provider-engine';

const Web3ProviderEngine = require('web3-provider-engine');
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js');
const RPCSubprovider = require('web3-provider-engine/subproviders/rpc.js');
import * as RpcSource  from 'web3-provider-engine/subproviders/rpc';
//import * as HookedWalletSubprovider from 'web3-provider-engine/subproviders/hooked-wallet';
//import * as RPCSubprovider from 'web3-provider-engine/subproviders/rpc';
import { PrivateKeySubprovider } from '@0xproject/subproviders';
import { ZeroEx, ZeroExConfig } from '0x.js';
import {
    FeesRequest,
    FeesResponse,
    HttpClient,
    Order,
    OrderbookRequest,
    OrderbookResponse,
    SignedOrder,
} from '@0xproject/connect';
import tokens from '../../../contracts/tokens';
import contracts from '../../../contracts/contracts';

export default class ZeroExExchangeService extends PrivateService {
  static buildKovanService(relayerApiEndpoint) {
    const service = new ZeroExExchangeService(),
      web3 = Web3Service.buildInfuraService(
        'kovan',
        '0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700'
      ),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      );

    service
      .manager()
      .inject('timer', new TimerService())
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('ethereumToken', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      )
      .settings({
        relayerApi: relayerApiEndpoint
      });

    return service;
  }

  static buildTestService(privateKey = null) {
    const service = new ZeroExExchangeService(),
      web3 = Web3Service.buildTestService(privateKey),
      smartContractService = SmartContractService.buildTestService(web3),
      ethereumTokenService = EthereumTokenService.buildTestService(
        smartContractService
      );

    service
      .manager()
      .inject('timer', new TimerService())
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('ethereumToken', ethereumTokenService)
      .inject(
        'gasEstimator',
        GasEstimatorService.buildTestService(smartContractService.get('web3'))
      );

    return service;
  }

  constructor(name = 'zeroExExchange') {
    super(name, [
      'smartContract',
      'ethereumToken',
      'web3',
      'log',
      'gasEstimator',
      'timer'
    ]);
    this._relayerClient = null;
    this._firstOrder = null;
    this._availableAddress = null;
    this._zeroEx = null;
  }


  initialize(settings) {
    const relayerApiUrl = settings.relayerApi;
	this._relayerClient = new HttpClient(relayerApiUrl);
  }

  connect(){ //TODO, find a better way to test this
  	return this._relayerClient.getOrdersAsync({ page: 1, perPage: 1})
  	.then(orders => {

  		this._firstOrder = orders[0];

  		this.get('timer').createTimer(
            'zeroExCheckConnectionStatus',
            30000,
            true,
            () =>
              this._isStillConnected().then(connected => {
                if (!connected) {
                  this.disconnect();
                }
              })
          );
  	},
  	reason => {
    	this.get('log').error(reason);
    });
  }

  authenticate(){
	const providerEngine = new Web3ProviderEngine();
	providerEngine.addProvider(new HookedWalletSubprovider({
	  getAccounts: (cb)=>{cb(null, [this.get('web3').ethersSigner().getAddress()]);},
	  approveTransaction: (txParams, cb)=>{ 
	  	console.log('in approveTransaction function');
	  	cb() },
	  signTransaction: (txParams, cb)=>{
	  	console.log('in signTransaction function');
	  	cb(null,'signedTx') },
	}));
	providerEngine.addProvider(new RPCSubprovider({
		rpcUrl: this.get('web3').web3Provider().host
	}));
	providerEngine.start();

    const zeroExConfig = {
		networkId: this.get('web3').networkId(),
	};
	this._zeroEx = new ZeroEx(providerEngine, zeroExConfig);
	return this._zeroEx.getAvailableAddressesAsync().then(address=>{
		this._availableAddress = address[0];
	});
  }

  _isStillConnected() {
    return this._relayerClient.getOrdersAsync({ page: 1, perPage: 1})
  	.then(
      orders =>
        orders[0].orderHash != null,
      () => false
    );
  }

/*
daiAmount: amount of Dai to sell
tokenSymbol: symbol of token to buy
minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
*/

sellDai(daiAmount, tokenSymbol, minFillAmount = '0') {

	const daiToken = this.get('ethereumToken').getToken(tokens.DAI);
	const daiAddress = daiToken.address();
	const wethToken = this.get('ethereumToken').getToken(tokens.WETH);
	const wethAddress = wethToken.address();
    const buyTokenAddress = this.get('ethereumToken')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);

   return this._zeroEx.token.setUnlimitedProxyAllowanceAsync(daiAddress, this.get('web3').ethersSigner().address)
   .then(val => val);

  }
}


