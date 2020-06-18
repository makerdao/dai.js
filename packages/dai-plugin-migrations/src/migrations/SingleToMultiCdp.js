import { tracksTransactionsWithOptions } from '../utils';
import { getIdBytes, stringToBytes } from '../utils';
import { SAI, MKR } from '..';
import dsValue from '../../contracts/abis/DSValue.json';

export default class SingleToMultiCdp {
  constructor(manager) {
    this._manager = manager;
    return this;
  }

  async check() {
    const address = this._manager.get('accounts').currentAddress();

    if (global.scdESTest) {
      if (global.testnet) {
        console.log('fudging cdp id data for testnet');
        const proxyAddress = await this._manager.get('proxy').currentProxy();
        return {
          [address]: [1],
          [proxyAddress]: [2, 3, 4, 5, 6]
        };
      }

      console.log('looking up cdp ids from logs; excludes proxy cdps');
      const scs = this._manager.get('smartContract');
      const ws = this._manager.get('web3');
      const { utils } = ws._web3;
      const { LogNewCup } = scs.getContract('SAI_TUB').interface.events;

      const logs = await ws.getPastLogs({
        address: scs.getContractAddress('SAI_TUB'),
        topics: [
          utils.keccak256(utils.toHex(LogNewCup.signature)),
          '0x000000000000000000000000' + address.replace(/^0x/, '')
        ],
        fromBlock: 4750000 // Dec 17, 2017 on mainnet; earlier on Kovan
      });
      return logs.length > 0
        ? { [address]: logs.map(l => parseInt(l.data, 16)) }
        : {};
    }

    const proxyAddress = await this._manager.get('proxy').currentProxy();
    const idsFromProxy = proxyAddress
      ? await this._manager.get('cdp').getCdpIds(proxyAddress)
      : [];
    const idsFromAddress = await this._manager.get('cdp').getCdpIds(address);
    return idsFromProxy.length + idsFromAddress.length > 0
      ? { [proxyAddress]: idsFromProxy, [address]: idsFromAddress }
      : {};
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  async execute(cupId, payment = 'MKR', maxPayAmount, minRatio, { promise }) {
    const jug = this._manager.get('smartContract').getContract('MCD_JUG')
      .address;
    const migrationProxy = this._manager
      .get('smartContract')
      .getContract('MIGRATION_PROXY_ACTIONS');
    const migration = this._manager
      .get('smartContract')
      .getContract('MIGRATION');
    const defaultArgs = [migration.address, jug, getIdBytes(cupId)];
    const { method, args } = this._setMethodAndArgs(
      payment,
      defaultArgs,
      maxPayAmount,
      minRatio
    );

    if (payment !== 'DEBT') await this._requireAllowance(cupId, payment);
    return migrationProxy[method](...args, {
      dsProxy: true,
      promise
    }).then(txo => this._manager.get('mcd:cdpManager').getNewCdpId(txo));
  }

  async _requireAllowance(cupId, payment) {
    const pepAddress = await this._manager
      .get('smartContract')
      .getContract('SAI_TUB')
      .pep();
    const mkrOracleActive = (
      await this._manager
        .get('smartContract')
        .getContractByAddressAndAbi(pepAddress, dsValue)
        .peek()
    )[1];
    if (payment === 'MKR' && !mkrOracleActive) return;
    const address = this._manager.get('web3').currentAddress();
    const proxyAddress = await this._manager.get('proxy').currentProxy();
    const cdp = await this._manager.get('cdp').getCdp(cupId);
    const token = payment === 'MKR' ? this._getToken(MKR) : this._getToken(SAI);

    let fee = await cdp.getGovernanceFee();
    if (payment === 'GEM') {
      const mkrPrice = await this._manager.get('price').getMkrPrice();
      fee = SAI(fee.toNumber() * mkrPrice.toNumber());
    }
    const allowance = await token.allowance(address, proxyAddress);

    // add a buffer amount to allowance in case drip hasn't been called recently
    if (allowance.lt(fee.toNumber()))
      await token.approve(proxyAddress, fee.times(1.5));
  }

  _setMethodAndArgs(payment, defaultArgs, maxPayAmount, minRatio) {
    const otc = this._manager.get('smartContract').getContract('MAKER_OTC')
      .address;

    if (payment === 'GEM') {
      const gem = this._manager
        .get('token')
        .getToken('SAI')
        .address();
      return {
        method: 'migratePayFeeWithGem',
        args: [...defaultArgs, otc, gem, SAI(maxPayAmount).toFixed('wei')]
      };
    }

    if (payment === 'DEBT') {
      return {
        method: 'migratePayFeeWithDebt',
        args: [
          ...defaultArgs,
          otc,
          SAI(maxPayAmount).toFixed('wei'),
          SAI(minRatio).toFixed('wei')
        ]
      };
    }

    return {
      method: 'migrate',
      args: defaultArgs
    };
  }

  // the Sai available is the smaller of two values:
  //  - the Sai locked in the migration contract's special CDP
  //  - the debt ceiling for the ETH-A ilk in MCD
  async migrationSaiAvailable() {
    const vat = this._manager.get('smartContract').getContract('MCD_VAT_1');
    const migrationContractAddress = this._manager
      .get('smartContract')
      .getContract('MIGRATION').address;

    const ethA = this._manager.get('mcd:cdpType').getCdpType(null, 'ETH-A');
    ethA.reset();

    const [migrationCdp, debtHeadroom] = await Promise.all([
      vat.urns(stringToBytes('SAI'), migrationContractAddress),
      ethA.prefetch().then(() => {
        if (ethA.debtCeiling.toNumber() === 0) return SAI(0);
        return SAI(ethA.debtCeiling.minus(ethA.totalDebt));
      })
    ]);

    // for technical reasons, the liquidation ratio of the mcd migration cdp
    // cannot be 0. but it will be close enough that the migration contract will
    // not be able to free only the last 1 wei of sai
    let lockedSai = SAI.wei(migrationCdp.ink);
    if (lockedSai.gt(0)) lockedSai = lockedSai.minus(SAI.wei(1));

    return debtHeadroom.lt(lockedSai) ? debtHeadroom : lockedSai;
  }

  async saiAmountNeededToBuyMkr(mkrAmount) {
    const otcContract = this._manager
      .get('smartContract')
      .getContract('MAKER_OTC');
    return otcContract
      .getPayAmount(
        this._getToken(SAI).address(),
        this._getToken(MKR).address(),
        MKR(mkrAmount).toFixed('wei')
      )
      .then(a => SAI.wei(a));
  }

  _getToken(symbol) {
    return this._manager.get('token').getToken(symbol);
  }
}
