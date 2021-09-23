import erc20 from './abis/ERC20.json';

import dsEthToken from './abis/WETH9.json';
import dsValue from './abis/DSValue.json';
import dsGuard from './abis/DSGuard.json';
import dsChief from './abis/DSChief.json';
import dsSpell from './abis/DSSpell.json';
import dsSpellBook from './abis/DSSpellBook.json';
import dsProxy from './abis/DSProxy.json';
import dsProxyFactory from './abis/DSProxyFactory.json';

import makerOtc from './abis/MatchingMarket.json';
import oasisProxy from './abis/ProxyCreationAndExecute.json';
import saiProxy from './abis/SaiProxyCreateAndExecute.json';
import proxyRegistry from './abis/ProxyRegistry.json';

// import saiTop from './abis/SaiTop.json';
import tub from './abis/SaiTub.json';
// import tap from './abis/SaiTap.json';
// import vox from './abis/SaiVox.json';
// import mom from './abis/SaiMom.json';
// import pit from './abis/GemPit.json';

import multicall from './abis/Multicall.json';

import cageFree from './abis/CageFree.json';

const daiV1 = {
  //   saiTop,
  tub
  //   tap,
  //   vox,
  //   mom,
  //   pit
};

const dappHub = {
  dsValue,
  dsEthToken,
  dsGuard,
  dsChief,
  dsSpell,
  dsSpellBook,
  dsProxy
};

const exchangesV1 = {
  makerOtc
};

const general = {
  erc20
};

const proxies = {
  oasisProxy,
  saiProxy,
  dsProxyFactory,
  proxyRegistry
};

export default { daiV1, dappHub, exchangesV1, general, proxies, multicall, cageFree };
