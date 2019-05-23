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
import { MDAI, ETH } from './index';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;

export default class CdpManager extends LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, [
      'smartContract',
      CDP_TYPE,
      SYSTEM_DATA,
      QUERY_API,
      'accounts',
      'proxy'
    ]);
    this._getCdpIdsPromises = {};
  }

  async getCdpIds(proxyAddress, descending = true) {
    const getCdpsMethod = descending ? 'getCdpsDesc' : 'getCdpsAsc';
    if (!this._getCdpIdsPromises[proxyAddress]) {
      this._getCdpIdsPromises[proxyAddress] = this.get('smartContract')
        .getContract('GET_CDPS')
        [getCdpsMethod](this._managerAddress, proxyAddress);
    }
    const [ids, , ilks] = await this._getCdpIdsPromises[proxyAddress];
    assert(ids.length === ilks.length, 'ids and ilks must be the same length');
    return ids.map((id, index) => {
      return { id: id.toNumber(), ilk: bytesToString(ilks[index]) };
    });
  }

  async getCdp(id) {
    const ilk = bytesToString(await this._manager.ilks(id));
    return new ManagedCdp(id, ilk, this);
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

    const method = `${id ? 'lock' : 'openLock'}${isEth ? 'ETH' : 'Gem'}AndDraw`;
    return this.proxyActions[method](...args);
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

  async getCombinedEventHistory(proxyAddress) {
    const cdpIds = await this.getCdpIds(proxyAddress);
    const ilksAndUrns = await Promise.all(
      cdpIds.map(async c => {
        const returnObj = {};
        returnObj.urn = await this.getUrn(c.id); //will add caching to this function
        returnObj.ilk = stringToBytes(c.ilk);
        return returnObj;
      })
    );
    const events = await this.get(QUERY_API).getCdpEventsForArrayOfIlksAndUrns(ilksAndUrns);
    /*const events = await Promise.all(
      cdpIds.map(async c => {
        const cdp = new ManagedCdp(c.id, c.ilk, this);
        return cdp.getEventHistory();
      })
    );*/
    /*const arr = [].concat.apply([], events); //flatten array
    const arrSort = arr.sort((a, b) => {
      //sort by date descending
      return b.time - a.time;
    });
    return arrSort;*/
  }

  //add caching indexed by id
  async getUrn(id) {
    return this._manager.urns(id);
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
}
