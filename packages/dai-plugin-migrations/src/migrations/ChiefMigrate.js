import { MKR } from '..';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default class ChiefMigrate {
  constructor(manager) {
    this._manager = manager;
    this._oldChief = manager.get('smartContract').getContract('OLD_CHIEF');
    this._proxyFactoryContract = manager
      .get('smartContract')
      .getContractByName('VOTE_PROXY_FACTORY');
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

  async execute() {}

  async _getVoteProxyAddress(walletAddress) {
    const [proxyAddressCold, proxyAddressHot] = await Promise.all([
      this._proxyFactoryContract.coldMap(walletAddress),
      this._proxyFactoryContract.hotMap(walletAddress)
    ]);

    if (proxyAddressCold !== ZERO_ADDRESS) return proxyAddressCold;
    if (proxyAddressHot !== ZERO_ADDRESS) return proxyAddressHot;
    return null;
  }
}
