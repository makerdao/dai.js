import { Currency } from '@makerdao/currency';
import { LocalService } from '@makerdao/services-core';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, stringToBytes, bytesToString } from './utils';
import padStart from 'lodash/padStart';
import { MDAI, ETH, GNT } from './index';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;
import BigNumber from 'bignumber.js';
import { RAY } from './constants';

export default class CdpManager extends LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, [
      'smartContract',
      CDP_TYPE,
      SYSTEM_DATA,
      QUERY_API,
      'accounts',
      'proxy',
      'token'
    ]);
    this._getCdpIdsPromises = {};
    this._getUrnPromises = {};
  }

  async getCdpIds(proxyAddress, descending = true) {
    const getCdpsMethod = descending ? 'getCdpsDesc' : 'getCdpsAsc';
    if (!this._getCdpIdsPromises[proxyAddress]) {
      this._getCdpIdsPromises[proxyAddress] = this.get('smartContract')
        .getContract('GET_CDPS')
        //eslint-disable-next-line no-unexpected-multiline
        [getCdpsMethod](this._managerAddress, proxyAddress);
    }
    const [ids, , ilks] = await this._getCdpIdsPromises[proxyAddress];
    assert(ids.length === ilks.length, 'ids and ilks must be the same length');
    return ids.map((id, index) => {
      return { id: id.toNumber(), ilk: bytesToString(ilks[index]) };
    });
  }

  async getCdp(id, options) {
    const ilk = bytesToString(await this._manager.ilks(id));
    return new ManagedCdp(id, ilk, this, options);
  }

  async getCombinedDebtValue(proxyAddress, descending = true) {
    const ids = await this.getCdpIds(proxyAddress, descending);
    const debts = await Promise.all(
      ids.map(c => {
        const cdp = new ManagedCdp(c.id, c.ilk, this);
        return cdp.getDebtValue();
      })
    );
    return debts.reduce((a, b) => a.plus(b));
  }

  async getCombinedEventHistory(proxyAddress) {
    const cdpIds = await this.getCdpIds(proxyAddress);
    const ilksAndUrns = await Promise.all(
      cdpIds.map(async c => {
        const urn = await this.getUrn(c.id);
        const ilk = stringToBytes(c.ilk);
        return { urn, ilk };
      })
    );
    const events = await this.get(QUERY_API).getCdpEventsForArrayOfIlksAndUrns(
      ilksAndUrns
    );
    return this.parseFrobEvents(events, this.get(CDP_TYPE));
  }

  @tracksTransactions
  async open(ilk, { promise }) {
    await this.get('proxy').ensureProxy({ promise });
    const op = this.proxyActions.open(
      this._managerAddress,
      stringToBytes(ilk),
      { dsProxy: true, promise }
    );
    return ManagedCdp.create(await op, ilk, this);
  }

  // ilk is required if the currency type corresponds to more than one ilk; if
  // it's omitted, it is inferred from lockAmount's currency type
  @tracksTransactions
  async openLockAndDraw(ilk, lockAmount, drawAmount, { promise }) {
    const type = this.get(CDP_TYPE).getCdpType(lockAmount.type, ilk);
    const op = this.lockAndDraw(null, type.ilk, lockAmount, drawAmount, {
      promise
    });
    return ManagedCdp.create(await op, type.ilk, this);
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  async lockAndDraw(id, ilk, lockAmount, drawAmount = MDAI(0), { promise }) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    assert(
      lockAmount instanceof Currency,
      'lockAmount must be a Currency value'
    );
    drawAmount = castAsCurrency(drawAmount, MDAI);
    await this.get('proxy').ensureProxy({ promise });
    const isEth = ETH.isInstance(lockAmount);
    const isGnt = GNT.isInstance(lockAmount);
    const args = [
      this._managerAddress,
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      id || stringToBytes(ilk),
      !isEth && lockAmount.toFixed('wei'),
      drawAmount.toFixed('wei'),
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise
      }
    ].filter(x => x);

    // GNT needs `false` as a parameter, because it
    // doesn't have a transferFrom function. All other
    // ilks besides ETH need `true`.
    if (isGnt) await this._transferToBag(lockAmount);
    const transferFrom = !isGnt;
    if (!isEth) args.splice(-1, 0, transferFrom);
    let method = `${id ? 'lock' : 'openLock'}${isEth ? 'ETH' : 'Gem'}AndDraw`;
    if (method === 'lockGemAndDraw') {
      method += '(address,address,address,uint256,uint256,uint256,bool)';
    }

    return await this.proxyActions[method](...args);
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  async wipeAndFree(id, ilk, wipeAmount = MDAI(0), freeAmount, { promise }) {
    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAndFreeETH' : 'wipeAndFreeGem';
    return this.proxyActions[method](
      ...[
        this._managerAddress,
        this._adapterAddress(ilk),
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        freeAmount.toFixed('wei'),
        wipeAmount.toFixed('wei'),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  async getUrn(id) {
    if (!this._getUrnPromises[id]) {
      this._getUrnPromises[id] = this._manager.urns(id);
    }
    return this._getUrnPromises[id];
  }

  parseFrobEvents(events) {
    return events.map(e => {
      const ilk = e.ilkIdentifier;
      const currency = this.get(CDP_TYPE).getCdpType(null, ilk).currency;
      const transactionHash = e.tx.transactionHash;
      const rate = new BigNumber(e.ilk.rate.toString()).dividedBy(RAY);
      const changeInCollateral = currency.wei(Math.abs(e.dink));
      let collateralAction;
      if (parseInt(e.dink) !== 0) {
        collateralAction = parseInt(e.dink) > 0 ? 'lock' : 'free';
      }
      const dart = MDAI.wei(Math.abs(e.dart));
      const changeInDebt = dart.times(rate);
      let daiAction;
      if (parseInt(e.dart) !== 0) {
        daiAction = parseInt(e.dart) > 0 ? 'draw' : 'wipe';
      }
      const time = new Date(e.tx.era.iso);
      const senderAddress = e.tx.txFrom;
      const resultingCollateral = currency.wei(e.urn.nodes[0].ink);
      const resultingDebt = MDAI.wei(e.urn.nodes[0].art);
      return {
        transactionHash,
        changeInCollateral,
        collateralAction,
        changeInDebt,
        daiAction,
        ilk,
        time,
        senderAddress,
        resultingCollateral,
        resultingDebt
      };
    });
  }

  getIdBytes(id, prefix = true) {
    assert(typeof id === 'number', 'ID must be a number');
    return (prefix ? '0x' : '') + padStart(id.toString(16), 24, '0');
  }

  get proxyActions() {
    return this.get('smartContract').getContract('PROXY_ACTIONS');
  }

  get vat() {
    return this.get(SYSTEM_DATA).vat;
  }

  reset() {
    this._getCdpIdsPromises = {};
    this._getUrnPromises = {};
  }

  get _manager() {
    return this.get('smartContract').getContract('CDP_MANAGER');
  }

  get _managerAddress() {
    return this._contractAddress('CDP_MANAGER');
  }

  _contractAddress(name) {
    return this.get('smartContract').getContractAddress(name);
  }

  _adapterAddress(ilk) {
    return this.get(SYSTEM_DATA).adapterAddress(ilk);
  }

  // The following functions are only required for GNT
  async _transferToBag(lockAmount) {
    const bagAddress = await this._ensureBag();
    const gntToken = this.get('token').getToken(GNT);

    return gntToken.transfer(bagAddress, lockAmount);
  }

  async _ensureBag() {
    const proxyAddress = await this.get('proxy').ensureProxy();
    const joinContract = this.get('smartContract').getContract(
      'MCD_JOIN_GNT_A'
    );

    let bagAddress = await this._getBagAddress(proxyAddress, joinContract);
    if (!bagAddress) {
      // TODO: check if this is gettable from a contract event
      await joinContract.make(proxyAddress);
      bagAddress = await this._getBagAddress(proxyAddress, joinContract);
    }

    return bagAddress;
  }

  async _getBagAddress(proxyAddress, joinContract) {
    let bagAddress = await joinContract.bags(proxyAddress);
    if (bagAddress === '0x0000000000000000000000000000000000000000') {
      bagAddress = null;
    }

    return bagAddress;
  }
}
