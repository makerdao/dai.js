import { Currency } from '@makerdao/currency';
import { LocalService } from '@makerdao/services-core';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, stringToBytes, bytesToString } from './utils';
import { padStart } from 'lodash';
import { MDAI, ETH } from './index';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA } = ServiceRoles;

export default class CdpManager extends LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, ['smartContract', CDP_TYPE, SYSTEM_DATA, 'accounts', 'proxy']);
  }

  async getCdps(proxyAddress) {
    const [ids, ilks] = await this.get('smartContract')
      .getContract('GET_CDPS')
      .getCdps(this._managerAddress, proxyAddress);

    assert(ids.length === ilks.length, 'ids and ilks must be the same length');
    return ids.map((id, index) => {
      return new ManagedCdp(id.toNumber(), bytesToString(ilks[index]), this);
    });
  }

  async getCdp(id) {
    const ilk = bytesToString(await this._manager.ilks(id));
    return new ManagedCdp(id, ilk, this);
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
      this._contractAddress('MCD_VAT'),
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
        this._contractAddress('MCD_VAT'),
        this.getIdBytes(id),
        freeAmount.toFixed('wei'),
        wipeAmount.toFixed('wei'),
        { dsProxy: true, promise }
      ].filter(x => x)
    );
  }

  getUrn(id) {
    return (
      '0x' +
      this._managerAddress.replace(/^0x/, '') +
      this.getIdBytes(id, false)
    );
  }

  getIdBytes(id, prefix = true) {
    return (prefix ? '0x' : '') + padStart(id.toString(16), 24, '0');
  }

  get proxyActions() {
    return this.get('smartContract').getContract('PROXY_ACTIONS');
  }

  get vat() {
    return this.get(SYSTEM_DATA).vat;
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
