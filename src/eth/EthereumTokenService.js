import PrivateService from '../core/PrivateService';
import SmartContractService from './SmartContractService';
import GasEstimatorService from './GasEstimatorService';
import tokens from '../../contracts/tokens';
import contracts from '../../contracts/contracts';
import networks from '../../contracts/networks';
import Erc20Token from './tokens/Erc20Token';
import EtherToken from './tokens/EtherToken';
import WethToken from './tokens/WethToken';
import PethToken from './tokens/PethToken';

export default class EthereumTokenService extends PrivateService {

  static buildTestService(smartContractService = null) {
    const service = new EthereumTokenService();
    smartContractService = smartContractService || SmartContractService.buildTestService();

    service.manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3')));

    return service;
  }

  static buildEthersService(smartContractService = null) {
    const service = new EthereumTokenService();
    smartContractService = smartContractService || SmartContractService.buildEthersService();
    service.manager()
      .inject('log', smartContractService.get('log'))
      .inject('web3', smartContractService.get('web3'))
      .inject('smartContract', smartContractService)
      .inject('gasEstimator', GasEstimatorService.buildTestService(smartContractService.get('web3'))); //I pass in web3 since both services depend on it
    return service;
  }

  constructor(name = 'token') {
    super(name, ['smartContract', 'web3', 'log', 'gasEstimator']);
  }

  getTokens() {
    return Object.keys(tokens);
  }

  getTokenVersions(){
    const mapping = this._getCurrentNetworkMapping();
    return this._selectTokenVersions(mapping);
  }

  getToken(symbol, version = null){
    if (this.getTokens().indexOf(symbol) < 0) {
      throw new Error('provided token is not a symbol');
    }

    if (symbol === tokens.ETH) {
      return new EtherToken(this.get('web3'), this.get('gasEstimator'));

    } else {
      const mapping = this._getCurrentNetworkMapping(),
        tokenInfo = mapping[symbol],
        tokenVersionData = (version === null) ? tokenInfo[tokenInfo.length - 1] : tokenInfo[version - 1],
        smartContractService = this.get('smartContract'),
        contract = smartContractService.getContractByAddressAndAbi(tokenVersionData.address, tokenVersionData.abi);

      if (symbol === tokens.WETH) {
        return new WethToken(contract);
      }

      if (symbol === tokens.PETH) {
        const tub = smartContractService.getContractByName(contracts.TUB);
        return new PethToken(contract, tub);
      }

      return new Erc20Token(contract);
    }
  }

  _getCurrentNetworkMapping(){
    let networkId = this.get('web3').networkId();
    const mapping = networks.filter((m)=> m.networkId === networkId);

    if (mapping.length < 1) {
      /* istanbul ignore next */
      throw new Error('networkId not found');
    }

    return mapping[0].addresses;
  }

  _selectTokenVersions(mapping){
    const tokenArray = [];

    for (let token in tokens) {
      if (token === 'ETH') {
        tokenArray['ETH'] = [1];
      }

      if (token in mapping) {
        let versionArray = [];
        mapping[token].forEach((e) => {
          versionArray.push(e.version);
        });
        tokenArray[token] = versionArray;
      }
    }

    return tokenArray;
  }
}
