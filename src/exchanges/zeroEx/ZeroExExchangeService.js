import PrivateService from '../../core/PrivateService';
import Web3Service from '../../eth/Web3Service';
import SmartContractService from '../../eth/SmartContractService';
import EthereumTokenService from '../../eth/EthereumTokenService';
import GasEstimatorService from '../../eth/GasEstimatorService';
//import * as Web3ProviderEngine  from 'web3-provider-engine';
const Web3ProviderEngine = require('web3-provider-engine');
import * as RpcSource  from 'web3-provider-engine/subproviders/rpc';
import * as HookedWalletSubprovider from 'web3-provider-engine/subproviders/hooked-wallet';
import * as RPCSubprovider from 'web3-provider-engine/subproviders/rpc';
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
      })

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
      'gasEstimator'
    ]);
    this._relayerClient = null;
    this._firstOrder = null;
  }


  initialize(settings) {
    const relayerApiUrl = settings.relayerApi;
	this._relayerClient = new HttpClient(relayerApiUrl);
  }

  connect(){ //TODO, find a better way to test this
  	return this._relayerClient.getOrdersAsync({ page: 1, perPage: 1}).then(orders => {
  		this._firstOrder = orders[0];
  	});
  }

/*
daiAmount: amount of Dai to sell
tokenSymbol: symbol of token to buy
minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
*/
/*
async sellDai(daiAmount, tokenSymbol, minFillAmount = '0') {
    const zeroExContract = this.get('smartContract').getContractByName(
      contracts.ZERO_EX_EXCHANGE
    );

    const zeroExConfig = {
		networkId: this.get('web3').networkId(),
	};
	console.log('Web3ProviderEngine', Web3ProviderEngine);
	const providerEngine = new Web3ProviderEngine();

	providerEngine.addProvider(new PrivateKeySubprovider('0xa69d30145491b4c1d55e52453cabb2e73a9daff6326078d49376449614d2f700')); //use web3Service instead
	
	providerEngine.addProvider(new RPCSubprovider({  }));
	
	providerEngine.start();
    const zeroEx = new ZeroEx(providerEngine, zeroExConfig);
    const zeroEx = new ZeroEx(this.get('web3').ethersProvider()._web3Provider, zeroExConfig);
    const zeroEx = new ZeroEx(this.get('web3')._web3.currentProvider, zeroExConfig);

    this.get('web3').eth.getAccounts().then(accounts => {console.log('getAccounts ', accounts);});

    const relayerApiUrl = 'https://api.radarrelay.com/0x/v0/';
	const relayerClient = new HttpClient(relayerApiUrl);
	const EXCHANGE_ADDRESS = await zeroEx.exchange.getContractAddress();

	const daiToken = this.get('ethereumToken').getToken(tokens.DAI);
	const daiAddress = daiToken.address();
	const wethToken = this.get('ethereumToken').getToken(tokens.WETH);
	const wethAddress = wethToken.address();
	const balance = await zeroEx.token.getBalanceAsync(daiAddress, this.get('web3').ethersSigner().address);
	console.log('balance using 0xJS', balance.toString());
	const availableAddresses = await zeroEx.getAvailableAddressesAsync();
	console.log('available addresses: ', availableAddresses);
	//const setDaiAllowanceTxHash = await zeroEx.token.setUnlimitedProxyAllowanceAsync(daiAddress, this.get('web3').ethersSigner().address);
	//zeroEx.token.setUnlimitedProxyAllowanceAsync(wethAddress, this.get('web3').ethersSigner().address);

    const buyTokenAddress = this.get('ethereumToken')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);

  }
  */
}


