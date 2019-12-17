import { MKR } from '..';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default class ChiefMigrate {
  constructor(manager) {
    this._manager = manager;
    this._oldChief = manager.get('smartContract').getContract('OLD_CHIEF');
    this._oldProxyFactoryContract = manager
      .get('smartContract')
      .getContractByName('OLD_VOTE_PROXY_FACTORY');
    return this;
  }

  async check() {
    const address = this._manager.get('accounts').currentAddress();
    const voteProxyAddress = await this._getVoteProxyAddress(address);

    const mkrLockedDirectly = MKR.wei(await this._oldChief.deposits(address));
    const mkrLockedViaProxy = MKR.wei(
      voteProxyAddress ? await this._oldChief.deposits(voteProxyAddress) : 0
    );

    return { mkrLockedDirectly, mkrLockedViaProxy };
  }

  async _getVoteProxyAddress(walletAddress) {
    const [proxyAddressCold, proxyAddressHot] = await Promise.all([
      this._oldProxyFactoryContract.coldMap(walletAddress),
      this._oldProxyFactoryContract.hotMap(walletAddress)
    ]);

    if (proxyAddressCold !== ZERO_ADDRESS) return proxyAddressCold;
    if (proxyAddressHot !== ZERO_ADDRESS) return proxyAddressHot;
    return null;
  }
}
