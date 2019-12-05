import { PrivateService } from '@makerdao/services-core';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';
import networks from '../../contracts/networks';
import Erc20Token from './tokens/Erc20Token';
import EtherToken from './tokens/EtherToken';
import WethToken from './tokens/WethToken';
import PethToken from './tokens/PethToken';
import ERC20TokenAbi from '../../contracts/abis/ERC20.json';
import assert from 'assert';

export default class EthereumTokenService extends PrivateService {
  constructor(name = 'token') {
    super(name, ['smartContract', 'web3', 'log', 'gas', 'transactionManager']);
    this._tokens = tokens;
    this._addedTokens = {};
  }

  initialize(settings = {}) {
    if (settings.erc20) {
      for (const token of settings.erc20) {
        const symbol = token.symbol || token.currency.symbol;
        this._tokens[symbol] = symbol;
        this._addedTokens[symbol] = [token];
      }
    }
  }

  getTokens() {
    return Object.keys(this._tokens);
  }

  // FIXME should be caching/memoizing here
  getToken(symbol, version) {
    // support passing in Currency constructors
    if (symbol.symbol) symbol = symbol.symbol;

    assert(symbol, 'Symbol is blank');
    assert(
      this.getTokens().indexOf(symbol) >= 0,
      `Symbol "${symbol}" is not recognized`
    );

    if (symbol === tokens.ETH) {
      return new EtherToken(
        this.get('web3'),
        this.get('gas'),
        this.get('transactionManager')
      );
    }

    const { address, decimals, abi, currency } = this._getTokenInfo(
      symbol,
      version
    );

    const scs = this.get('smartContract');
    const contract = scs.getContractByAddressAndAbi(
      address,
      abi || ERC20TokenAbi
    );

    if (symbol === tokens.WETH) {
      return new WethToken(contract, this.get('web3'), decimals);
    }

    if (symbol === tokens.PETH) {
      if (decimals !== 18) {
        throw new Error('PethToken code hardcodes 18 decimal places.');
      }
      const tub = scs.getContract(contracts.SAI_TUB);
      return new PethToken(contract, this.get('web3'), tub);
    }

    return new Erc20Token(
      contract,
      this.get('web3'),
      decimals || 18,
      symbol,
      currency
    );
  }

  _getTokenInfo(symbol, version) {
    let { network, networkName } = this.get('web3');
    const tokenInfoList =
      this._addedTokens[symbol] || this._getNetworkMapping(network)[symbol];

    const tokenInfo = version
      ? tokenInfoList[version - 1]
      : tokenInfoList[tokenInfoList.length - 1];

    if (typeof tokenInfo.address === 'string') return tokenInfo;

    return {
      ...tokenInfo,
      address:
        tokenInfo.address[networkName === 'test' ? 'testnet' : networkName]
    };
  }

  _getNetworkMapping(networkId) {
    const mapping = networks.filter(m => m.networkId === networkId);

    if (mapping.length < 1) {
      throw new Error('networkId not found');
    }

    return mapping[0].contracts;
  }

  _selectTokenVersions(mapping) {
    const tokenArray = [];

    for (let token in tokens) {
      if (token === 'ETH') {
        tokenArray['ETH'] = [1];
      }

      if (token in mapping) {
        let versionArray = [];
        mapping[token].forEach(e => {
          versionArray.push(e.version);
        });
        tokenArray[token] = versionArray;
      }
    }

    return tokenArray;
  }
}
