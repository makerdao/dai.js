imp

import Cdp from './Cdp'
import EthereumCdpService from './EthereumCdpService'
import PriceService from './PriceService'
import ProxyCdp from './ProxyCdp'
import QueryApiScdService from './QueryApiScdService'
import { ServiceRoles as ServiceRoles_ } from './utils/constants'

export const ServiceRoles = ServiceRoles_;
const {
  CDP,
  PRICE,
  PROXY_CDP,
  QUERY_API
} = ServiceRoles;

export default {
  addConfig: function(config, { network = "mainnet", staging = false }) {
    const contractAddresses = {
      kovan: require('../contracts/addresses/kovan.json'),
      mainnet: require('../contracts/addresses/mainnet.json')
    }

    try {
      contractAddresses.testnet = require('../contracts/addresses/testnet.json')
    } catch (err) {

    }

    const addressKey = network === 'ganache' ? 'testnet' : network

    // const addContracts = {
    //   [CDP]: {
    //     address: ,
    //     abi:
    //   }
    // }
    const makerConfig = {
      ...config,
      additionalServices: [
        'CDP',
        'PRICE',
        'QUERY_API'
      ],
      ['CDP']: EthereumCdpService,
      ['PRICE']: PriceService
    }
    return makerConfig
  }
}
