import PrivateService from '../core/PrivateService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';
import networks from '../../contracts/networks';
import Erc20Token from './tokens/Erc20Token';
import EtherToken from './tokens/EtherToken';
import WethToken from './tokens/WethToken';
import PethToken from './tokens/PethToken';

export default class EthereumTokenService extends PrivateService {
  constructor(name = 'token') {
    super(name, [
      'smartContract',
      'web3',
      'log',
      'gasEstimator',
      'transactionManager'
    ]);
  }

  getTokens() {
    return Object.keys(tokens);
  }

  getTokenVersions() {
    const mapping = this._getCurrentNetworkMapping();
    return this._selectTokenVersions(mapping);
  }

  getToken(symbol, version = null) {
    // support passing in Currency constructors
    if (symbol.symbol) symbol = symbol.symbol;

    if (this.getTokens().indexOf(symbol) < 0) {
      throw new Error('provided token is not a symbol');
    }

    if (symbol === tokens.ETH) {
      return new EtherToken(
        this.get('web3'),
        this.get('gasEstimator'),
        this.get('transactionManager')
      );
    } else {
      const mapping = this._getCurrentNetworkMapping(),
        tokenInfo = mapping[symbol],
        tokenVersionData =
          version === null
            ? tokenInfo[tokenInfo.length - 1]
            : tokenInfo[version - 1],
        smartContractService = this.get('smartContract'),
        contract = smartContractService.getContractByAddressAndAbi(
          tokenVersionData.address,
          tokenVersionData.abi
        );

      if (symbol === tokens.WETH) {
        return new WethToken(
          contract,
          this.get('web3'),
          tokenVersionData.decimals
        );
      }

      if (symbol === tokens.PETH) {
        if (tokenVersionData.decimals !== 18) {
          throw new Error('PethToken code hardcodes 18 decimal places.');
        }
        const tub = smartContractService.getContractByName(contracts.SAI_TUB);
        return new PethToken(contract, this.get('web3'), tub);
      }

      return new Erc20Token(
        contract,
        this.get('web3'),
        tokenVersionData.decimals,
        symbol
      );
    }
  }

  _getCurrentNetworkMapping() {
    let networkId = this.get('web3').networkId();
    const mapping = networks.filter(m => m.networkId === networkId);

    if (mapping.length < 1) {
      /* istanbul ignore next */
      throw new Error('networkId not found');
    }

    return mapping[0].addresses;
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
