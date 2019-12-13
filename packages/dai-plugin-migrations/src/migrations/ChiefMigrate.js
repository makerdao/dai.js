import BigNumber from 'bignumber.js'

/* Addresses */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export default class ChiefMigrate {
  constructor (manager) {
    this._manager = manager
    this._oldChief = manager.get('smartContract').getContract('OLD_CHIEF')
    this._proxyFactoryContract = manager.get('smartContract').getContractByName('VOTE_PROXY_FACTORY')
    return this
  }

  async check () {
    const address = this._manager.get('accounts').currentAddress()
    const balance = this._oldChief.deposits(address)
    const [proxyAddressCold, proxyAddressHot] = await Promise.all([
      this._proxyFactoryContract.coldMap(address),
      this._proxyFactoryContract.hotMap(address)
    ])
    const proxyBalance = proxyAddressCold !== ZERO_ADDRESS
      ? this._oldChief.deposits(proxyAddressCold)
      : proxyAddressHot !== ZERO_ADDRESS
        ? this._oldChief.deposits(proxyAddressHot)
        : BigNumber(0)
    return [balance, proxyBalance]
  }
}
