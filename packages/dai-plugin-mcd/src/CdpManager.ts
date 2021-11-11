import { Currency } from '@makerdao/currency';
import { LocalService } from '@makerdao/services-core';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp, { ManagedCdpClass } from './ManagedCdp';
import {
  castAsCurrency,
  stringToBytes,
  bytesToString,
  promiseWait
} from './utils';
import has from 'lodash/has';
import padStart from 'lodash/padStart';
import { DAI, ETH, GNT } from './tokens';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA } = ServiceRoles;
import getEventHistoryImpl from './EventHistory';
import BigNumber from 'bignumber.js';

export default class CdpManager extends LocalService {
  _getCdpIdsPromises;
  _getUrnPromises;
  _instanceCache;
  _eventHistoryCache;

  constructor(name = CDP_MANAGER) {
    super(name, [
      'smartContract',
      CDP_TYPE,
      SYSTEM_DATA,
      'accounts',
      'proxy',
      'token',
      'web3'
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
    const cacheEnabled = !has(options, 'cache') || options.cache;
    let cdp = this._getFromInstanceCache(id, cacheEnabled);
    if (cdp) return cdp;

    // This lookup can sometimes miss when a vault is created
    // causing an assertion error on a missing ilk.
    let ilk;
    for (let i = 0; i < 5; i++) {
      ilk = await this.getIlkForCdp(id);
      if (ilk) break;
      await promiseWait(5000);
    }

    cdp = new ManagedCdpClass(id, ilk, this, options);

    this._putInInstanceCache(id, cdp, cacheEnabled);
    if (!has(options, 'prefetch') || options.prefetch) await cdp.prefetch();
    return cdp;
  }

  async getIlkForCdp(id) {
    return bytesToString(await this._manager.ilks(id));
  }

  async getCombinedDebtValue(proxyAddress, descending = true) {
    const ids = await this.getCdpIds(proxyAddress, descending);
    const debts = await Promise.all(
      ids.map(c => {
        const cdp = new ManagedCdpClass(c.id, c.ilk, this);
        return cdp.prefetch().then(() => cdp.debtValue);
      })
    );
    return debts.reduce((a: BigNumber, b: BigNumber) => a.plus(b));
  }

  @tracksTransactions
  async open(ilk, { promise, cache = true }) {
    const proxy = await this.get('proxy').ensureProxy({ promise });
    const op = this.proxyActions.open(
      this._managerAddress,
      stringToBytes(ilk),
      proxy,
      { dsProxy: true, promise, metadata: { ilk } }
    );
    const cdp = await ManagedCdp.create(await op, ilk, this);
    this._putInInstanceCache(cdp.id, cdp, cache);
    return cdp;
  }

  @tracksTransactions
  async reclaimCollateral(id, dink, { promise }) {
    dink = castAsCurrency(dink, ETH);
    return this.proxyActions.frob(
      this._managerAddress,
      this.getIdBytes(id),
      dink.toFixed('wei'),
      0,
      { dsProxy: true, promise, metadata: { id, dink } }
    );
  }

  // ilk is required if the currency type corresponds to more than one ilk; if
  // it's omitted, it is inferred from lockAmount's currency type
  @tracksTransactions
  async openLockAndDraw(
    ilk,
    lockAmount,
    drawAmount,
    { promise, cache = true }
  ) {
    const type = this.get(CDP_TYPE).getCdpType(lockAmount.type, ilk);
    const op = this.lockAndDraw(null, type.ilk, lockAmount, drawAmount, {
      promise
    });
    const cdp = await ManagedCdp.create(await op, type.ilk, this);
    this._putInInstanceCache(cdp.id, cdp, cache);
    return cdp;
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  async lockAndDraw(id, ilk, lockAmount, drawAmount = DAI(0), { promise }) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    assert(
      lockAmount instanceof Currency,
      'lockAmount must be a Currency value'
    );
    drawAmount = castAsCurrency(drawAmount, DAI);
    const proxyAddress = await this.get('proxy').ensureProxy({ promise });
    const jugAddress = this.get('smartContract').getContractAddress('MCD_JUG');
    const isEth = ETH.isInstance(lockAmount);
    const isGnt = GNT.isInstance(lockAmount);
    const method = setMethod(isEth, isGnt, id);
    const args = [
      this._managerAddress,
      jugAddress,
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      id || stringToBytes(ilk),
      !isEth && lockAmount.toFixed(this._precision(lockAmount, ilk)),
      drawAmount.toFixed('wei'),
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise,
        metadata: { id, ilk, lockAmount, drawAmount }
      }
    ].filter(x => x);

    // If opening a new GNT CDP, GNT must first be transferred
    // to the proxy (so it can be transferred to the new bag)
    if (method === 'openLockGNTAndDraw')
      await this.get('token')
        .getToken('GNT')
        .transfer(proxyAddress, lockAmount);
    // Transfers to bag if locking GNT in existing CDP
    if (id && isGnt) await transferToBag(lockAmount, proxyAddress, this);
    // Indicates if gem supports transferFrom
    if (!isEth && method !== 'openLockGNTAndDraw')
      args.splice(-1, 0, !GNT.isInstance(lockAmount));

    return await this.proxyActions[method](...args);
  }

  @tracksTransactions
  async lock(id, ilk, lockAmount, owner, { promise }) {
    if (!owner) owner = await this.getOwner(id);
    const proxyAddress = await this.get('proxy').ensureProxy({ promise });
    const isEth = ETH.isInstance(lockAmount);
    const isGnt = GNT.isInstance(lockAmount);
    const method = `safeLock${isEth ? 'ETH' : 'Gem'}`;
    const args = [
      this._managerAddress,
      this._adapterAddress(ilk),
      id,
      !isEth && lockAmount.toFixed(this._precision(lockAmount, ilk)),
      owner,
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise,
        metadata: { id, ilk, lockAmount }
      }
    ].filter(x => x);

    // Transfers to bag if locking GNT in existing CDP
    if (id && isGnt) await transferToBag(lockAmount, proxyAddress, this);
    // Indicates if gem supports transferFrom
    if (!isEth) args.splice(-2, 0, !GNT.isInstance(lockAmount));

    return this.proxyActions[method](...args);
  }

  @tracksTransactions
  async draw(id, ilk, drawAmount, { promise }) {
    return this.proxyActions.draw(
      this._managerAddress,
      this.get('smartContract').getContractAddress('MCD_JUG'),
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      castAsCurrency(drawAmount, DAI).toFixed('wei'),
      { dsProxy: true, promise, metadata: { id, ilk, drawAmount } }
    );
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  wipeAndFree(id, ilk, wipeAmount = DAI(0), freeAmount, { promise }) {
    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAndFreeETH' : 'wipeAndFreeGem';
    return this.proxyActions[method](
      this._managerAddress,
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      freeAmount.toFixed(this._precision(freeAmount, ilk)),
      wipeAmount.toFixed('wei'),
      { dsProxy: true, promise, metadata: { id, ilk, wipeAmount, freeAmount } }
    );
  }

  @tracksTransactions
  async wipe(id, wipeAmount, owner, { promise }) {
    if (!owner) owner = await this.getOwner(id);
    return this.proxyActions.safeWipe(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      wipeAmount.toFixed('wei'),
      owner,
      { dsProxy: true, promise, metadata: { id, wipeAmount } }
    );
  }

  @tracksTransactions
  unsafeWipe(id, wipeAmount, { promise }) {
    return this.proxyActions.wipe(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      wipeAmount.toFixed('wei'),
      { dsProxy: true, promise, metadata: { id, wipeAmount } }
    );
  }

  @tracksTransactions
  async wipeAll(id, owner, { promise = undefined } = {}) {
    if (!owner) owner = await this.getOwner(id);
    return this.proxyActions.safeWipeAll(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      owner,
      { dsProxy: true, promise, metadata: { id } }
    );
  }

  @tracksTransactions
  unsafeWipeAll(id, { promise = undefined } = {}) {
    return this.proxyActions.wipeAll(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      { dsProxy: true, promise, metadata: { id } }
    );
  }

  @tracksTransactions
  wipeAllAndFree(id, ilk, freeAmount, { promise }) {
    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAllAndFreeETH' : 'wipeAllAndFreeGem';
    return this.proxyActions[method](
      this._managerAddress,
      this._adapterAddress(ilk),
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      freeAmount.toFixed(this._precision(freeAmount, ilk)),
      { dsProxy: true, promise, metadata: { id, ilk, freeAmount } }
    );
  }

  // Gives CDP directly to the supplied address
  @tracksTransactions
  give(id, address, { promise }) {
    return this.proxyActions.give(
      this._managerAddress,
      this.getIdBytes(id),
      address,
      { dsProxy: true, promise, metadata: { id } }
    );
  }

  // Gives CDP to the proxy of the supplied address
  @tracksTransactions
  giveToProxy(id, address, { promise }) {
    return this.proxyActions.giveToProxy(
      this._contractAddress('PROXY_REGISTRY'),
      this._managerAddress,
      this.getIdBytes(id),
      address,
      { dsProxy: true, promise, metadata: { id, address } }
    );
  }

  getUrn(id) {
    if (!this._getUrnPromises[id]) {
      this._getUrnPromises[id] = this._manager.urns(id);
    }
    return this._getUrnPromises[id];
  }

  getOwner(id) {
    return this._manager.owns(this.getIdBytes(id));
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

  _precision(amount, ilk) {
    return amount.type.symbol === 'ETH'
      ? 'wei'
      : this.get(CDP_TYPE).getCdpType(amount.type, ilk).decimals;
  }

  _getFromInstanceCache(id, enabled) {
    if (!enabled) return;
    if (!this._instanceCache) this._instanceCache = {};
    const instance = this._instanceCache[id];
    if (instance) return instance;
  }

  _putInInstanceCache(id, instance, enabled) {
    if (!enabled) return;
    if (!this._instanceCache) this._instanceCache = {};
    this._instanceCache[id] = instance;
  }

  getNewCdpId(txo) {
    const logs = txo.receipt.logs;
    const managerContract = this.get('smartContract').getContract(
      'CDP_MANAGER'
    );
    const [topic] = managerContract.interface.encodeFilterTopics('NewCdp', []);
    const [receiptEvent] = logs.filter(
      e => e.topics[0].toLowerCase() === topic.toLowerCase()
    );
    const { args: eventArgs } = managerContract.interface.parseLog({
      data: receiptEvent.data,
      topics: receiptEvent.topics
    });
    assert(eventArgs['cdp'], 'could not find log for NewCdp event');
    return parseInt(eventArgs['cdp']);
  }

  getEventHistory(managedCdp) {
    if (!this._eventHistoryCache) this._eventHistoryCache = {};
    return getEventHistoryImpl(this, managedCdp, this._eventHistoryCache);
  }

  resetEventHistoryCache(id = null) {
    if (id !== null) delete this._eventHistoryCache[id];
    else this._eventHistoryCache = {};
  }
}

export function setMethod(isEth, isGnt, id) {
  if (id && isEth) {
    return 'lockETHAndDraw';
  } else if (isEth) {
    return 'openLockETHAndDraw';
  } else if (!id && isGnt) {
    return 'openLockGNTAndDraw';
  } else if (id) {
    return 'lockGemAndDraw';
  }
  return 'openLockGemAndDraw';
}

export async function transferToBag(lockAmount, proxyAddress, cdpMgr) {
  const gntToken = cdpMgr.get('token').getToken(GNT);
  const gntAdapter = cdpMgr.get('smartContract').getContract('MCD_JOIN_GNT_A');
  const bagAddress = await gntAdapter.bags(proxyAddress);

  return gntToken.transfer(bagAddress, lockAmount);
}
