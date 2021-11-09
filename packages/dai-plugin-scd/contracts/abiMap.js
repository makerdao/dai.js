// might not be run through babel in the future, so we must use an ES5-safe export
export default {
  SAI_PIP: require('./abis/DSValue.json'),
  SAI_PEP: require('./abis/DSValue.json'),
  SAI_PIT: require('./abis/GemPit.json'),
  SAI_SIN: require('./abis/ERC20.json'),
  SAI_MOM: require('./abis/SaiMom.json'),
  SAI_VOX: require('./abis/SaiVox.json'),
  SAI_TUB: require('./abis/SaiTub.json'),
  SAI_TAP: require('./abis/SaiTap.json'),
  SAI_TOP: require('./abis/SaiTop.json'),
  SAI_SKR: require('./abis/ERC20.json'),
  SAI_GEM: require('./abis/WETH9.json'),
  SAI_GOV: require('./abis/ERC20.json'),
  SAI: require('./abis/ERC20.json'),
  SAI_PROXY: require('./abis/SaiProxyCreateAndExecute.json'),
  PROXY_REGISTRY: require('./abis/ProxyRegistry.json'),
  DS_PROXY_FACTORY: require('./abis/DSProxyFactory.json'),
  DS_PROXY: require('./abis/DSProxy.json'),
  MULTICALL: require('./abis/Multicall.json'),
  SAI_TUB_CONSTANT: require('./abis/SaiTubConstant.json')
};
