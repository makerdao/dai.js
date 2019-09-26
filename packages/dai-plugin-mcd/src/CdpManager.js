import { Currency } from '@makerdao/currency';
import { LocalService } from '@makerdao/services-core';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, stringToBytes, bytesToString } from './utils';
import has from 'lodash/has';
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
    const cacheEnabled = !has(options, 'cache') || options.cache;
    let cdp = this._getFromInstanceCache(id, cacheEnabled);
    if (cdp) return cdp;

    const ilk = bytesToString(await this._manager.ilks(id));
    cdp = new ManagedCdp(id, ilk, this, options);

    this._putInInstanceCache(id, cdp, cacheEnabled);
    if (!has(options, 'prefetch') || options.prefetch) await cdp.prefetch();
    return cdp;
  }

  async getCombinedDebtValue(proxyAddress, descending = true) {
    const ids = await this.getCdpIds(proxyAddress, descending);
    const debts = await Promise.all(
      ids.map(c => {
        const cdp = new ManagedCdp(c.id, c.ilk, this);
        return cdp.prefetch().then(() => cdp.debtValue);
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
  async open(ilk, { promise, cache = true }) {
    await this.get('proxy').ensureProxy({ promise });
    const op = this.proxyActions.open(
      this._managerAddress,
      stringToBytes(ilk),
      { dsProxy: true, promise }
    );
    const cdp = await ManagedCdp.create(await op, ilk, this);
    this._putInInstanceCache(cdp.id, cdp, cache);
    return cdp;
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
  async lockAndDraw(id, ilk, lockAmount, drawAmount = MDAI(0), { promise }) {
    assert(lockAmount && drawAmount, 'both amounts must be specified');
    assert(
      lockAmount instanceof Currency,
      'lockAmount must be a Currency value'
    );
    drawAmount = castAsCurrency(drawAmount, MDAI);
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
      !isEth && lockAmount.toFixed(this._precision(lockAmount)),
      drawAmount.toFixed('wei'),
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise
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
  async lock(id, ilk, lockAmount, { promise }) {
    const proxyAddress = await this.get('proxy').ensureProxy({ promise });
    const isEth = ETH.isInstance(lockAmount);
    const isGnt = GNT.isInstance(lockAmount);
    const method = `safeLock${isEth ? 'ETH' : 'Gem'}`;
    const args = [
      this._managerAddress,
      this._adapterAddress(ilk),
      id,
      !isEth && lockAmount.toFixed(this._precision(lockAmount)),
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise
      }
    ].filter(x => x);

    // Transfers to bag if locking GNT in existing CDP
    if (id && isGnt) await transferToBag(lockAmount, proxyAddress, this);
    // Indicates if gem supports transferFrom
    if (!isEth) args.splice(-1, 0, !GNT.isInstance(lockAmount));

    return this.proxyActions[method](...args);
  }

  @tracksTransactionsWithOptions({ numArguments: 5 })
  wipeAndFree(id, ilk, wipeAmount = MDAI(0), freeAmount, { promise }) {
    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAndFreeETH' : 'wipeAndFreeGem';
    return this.proxyActions[method](
      ...[
        this._managerAddress,
        this._adapterAddress(ilk),
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        freeAmount.toFixed(this._precision(freeAmount)),
        wipeAmount.toFixed('wei'),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  @tracksTransactions
  wipe(id, wipeAmount, { promise }) {
    return this.proxyActions.safeWipe(
      ...[
        this._managerAddress,
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        wipeAmount.toFixed('wei'),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  @tracksTransactions
  unsafeWipe(id, wipeAmount, { promise }) {
    return this.proxyActions.wipe(
      ...[
        this._managerAddress,
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        wipeAmount.toFixed('wei'),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  @tracksTransactions
  wipeAll(id, { promise } = {}) {
    return this.proxyActions.safeWipeAll(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      { dsProxy: true, promise }
    );
  }

  @tracksTransactions
  unsafeWipeAll(id, { promise } = {}) {
    return this.proxyActions.wipeAll(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      { dsProxy: true, promise }
    );
  }

  @tracksTransactions
  wipeAllAndFree(id, ilk, freeAmount, { promise }) {
    const isEth = ETH.isInstance(freeAmount);
    const method = isEth ? 'wipeAllAndFreeETH' : 'wipeAllAndFreeGem';
    return this.proxyActions[method](
      ...[
        this._managerAddress,
        this._adapterAddress(ilk),
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        freeAmount.toFixed(this._precision(freeAmount)),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  // Gives CDP directly to the supplied address
  @tracksTransactions
  give(id, address, { promise }) {
    return this.proxyActions.give(
      this._managerAddress,
      this.getIdBytes(id),
      address,
      { dsProxy: true, promise }
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
      { dsProxy: true, promise }
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

  parseFrobEvents(events) {
    return events.map(e => {
      const ilk = e.ilkIdentifier;
      const currency = this.get(CDP_TYPE).getCdpType(null, ilk).currency;
      const transactionHash = e.tx.transactionHash;
      const rate = new BigNumber(e.ilkRate.toString()).dividedBy(RAY);
      const changeInCollateral = currency.wei(Math.abs(e.dink));
      let collateralAction;
      if (parseInt(e.dink) !== 0) {
        collateralAction = parseInt(e.dink) > 0 ? 'lock' : 'free';
      }
      const dart = MDAI.wei(Math.abs(e.dart));
      const changeInDai = dart.times(rate);
      let daiAction;
      if (parseInt(e.dart) !== 0) {
        daiAction = parseInt(e.dart) > 0 ? 'draw' : 'wipe';
      }
      const time = new Date(e.tx.era.iso);
      const senderAddress = e.tx.txFrom;
      //const resultingCollateral = currency.wei(e.urn.nodes[0].ink);
      //const resultingDebt = MDAI.wei(e.urn.nodes[0].art);
      return {
        transactionHash,
        changeInCollateral,
        collateralAction,
        changeInDai,
        daiAction,
        ilk,
        time,
        senderAddress
        //resultingCollateral,
        //resultingDebt
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

  _precision(amount) {
    return amount.type.symbol === 'ETH'
      ? 'wei'
      : this.get(CDP_TYPE).getCdpType(amount.type).decimals;
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
  const gntAdapter = cdpMgr
    .get('smartContract')
    .getContractByName('MCD_JOIN_GNT_A');
  const bagAddress = await gntAdapter.bags(proxyAddress);

  return gntToken.transfer(bagAddress, lockAmount);
}
