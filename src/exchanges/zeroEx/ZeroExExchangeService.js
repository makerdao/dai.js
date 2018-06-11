import PrivateService from '../../core/PrivateService';
import Web3ProviderEngine from 'web3-provider-engine/dist/es5';
import HookedWalletSubprovider from 'web3-provider-engine/dist/es5/subproviders/hooked-wallet.js';
import RPCSubprovider from 'web3-provider-engine/dist/es5/subproviders/rpc.js';
import { ZeroEx } from '0x.js';
import { HttpClient } from '@0xproject/connect';
import tokens from '../../../contracts/tokens';
//import contracts from '../../../contracts/contracts';

export default class ZeroExExchangeService extends PrivateService {
  constructor(name = 'zeroExExchange') {
    super(name, [
      'smartContract',
      'token',
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

  connect() {
    //TODO, find a better way to test this
    return this._relayerClient.getOrdersAsync({ page: 1, perPage: 1 }).then(
      orders => {
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
      }
    );
  }

  authenticate() {
    const providerEngine = new Web3ProviderEngine();
    providerEngine.addProvider(
      new HookedWalletSubprovider({
        getAccounts: cb => {
          cb(null, [
            this.get('web3')
              .ethersSigner()
              .getAddress()
          ]);
        },
        approveTransaction: (txParams, cb) => {
          //console.log('in approveTransaction function');
          cb();
        },
        signTransaction: (txParams, cb) => {
          //console.log('in signTransaction function');
          cb(null, 'signedTx');
        }
      })
    );
    providerEngine.addProvider(
      new RPCSubprovider({
        rpcUrl: this.get('web3').web3Provider().host
      })
    );
    providerEngine.start();

    const zeroExConfig = {
      networkId: this.get('web3').networkId()
    };
    this._zeroEx = new ZeroEx(providerEngine, zeroExConfig);
    return this._zeroEx.getAvailableAddressesAsync().then(address => {
      this._availableAddress = address[0];
    });
  }

  _isStillConnected() {
    return this._relayerClient
      .getOrdersAsync({ page: 1, perPage: 1 })
      .then(orders => orders[0].orderHash != null, () => false);
  }

  /*
  daiAmount: amount of Dai to sell
  tokenSymbol: symbol of token to buy
  minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
  */

  sellDai(/*daiAmount, tokenSymbol, minFillAmount = '0'*/) {
    const daiToken = this.get('ethereumToken').getToken(tokens.DAI);
    const daiAddress = daiToken.address();
    //const wethToken = this.get('ethereumToken').getToken(tokens.WETH);
    //const wethAddress = wethToken.address();
    //const buyTokenAddress = this.get('ethereumToken')
    //  .getToken(tokenSymbol)
    //  .address();
    //const daiAmountEVM = daiToken.toEthereumFormat(daiAmount);
    //const minFillAmountEVM = daiToken.toEthereumFormat(minFillAmount);

    return this._zeroEx.token
      .setUnlimitedProxyAllowanceAsync(
        daiAddress,
        this.get('web3').ethersSigner().address
      )
      .then(val => val);
  }
}
