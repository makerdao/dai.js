import { Currency } from '@makerdao/currency';
import { LocalService } from '@makerdao/services-core';
import ethAbi from 'web3-eth-abi';
import tracksTransactions, {
  tracksTransactionsWithOptions
} from './utils/tracksTransactions';
import { ServiceRoles } from './constants';
import assert from 'assert';
import ManagedCdp from './ManagedCdp';
import { castAsCurrency, stringToBytes, bytesToString } from './utils';
import has from 'lodash/has';
import padStart from 'lodash/padStart';
import padEnd from 'lodash/padEnd';
import orderBy from 'lodash/orderBy';
import flatten from 'lodash/flatten';
import { MDAI, ETH, GNT } from './index';
const { CDP_MANAGER, CDP_TYPE, SYSTEM_DATA, QUERY_API } = ServiceRoles;
import BigNumber from 'bignumber.js';
import { RAY } from './constants';
import { utils } from 'ethers';

export default class CdpManager extends LocalService {
  constructor(name = CDP_MANAGER) {
    super(name, [
      'smartContract',
      CDP_TYPE,
      SYSTEM_DATA,
      QUERY_API,
      'accounts',
      'proxy',
      'token',
      'web3'
    ]);
    this._getCdpIdsPromises = {};
    this._getUrnPromises = {};
    this._getEventHistoryPromises = {};
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
    const proxy = await this.get('proxy').ensureProxy({ promise });
    const op = this.proxyActions.open(
      this._managerAddress,
      stringToBytes(ilk),
      proxy,
      { dsProxy: true, promise }
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
      { dsProxy: true, promise }
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
      !isEth && lockAmount.toFixed(this._precision(lockAmount)),
      owner,
      {
        dsProxy: true,
        value: isEth ? lockAmount.toFixed('wei') : 0,
        promise
      }
    ].filter(x => x);

    // Transfers to bag if locking GNT in existing CDP
    if (id && isGnt) await transferToBag(lockAmount, proxyAddress, this);
    // Indicates if gem supports transferFrom
    if (!isEth) args.splice(-2, 0, !GNT.isInstance(lockAmount));

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
  async wipe(id, wipeAmount, owner, { promise }) {
    if (!owner) owner = await this.getOwner(id);
    return this.proxyActions.safeWipe(
      ...[
        this._managerAddress,
        this._adapterAddress('DAI'),
        this.getIdBytes(id),
        wipeAmount.toFixed('wei'),
        owner,
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
  async wipeAll(id, owner, { promise } = {}) {
    if (!owner) owner = await this.getOwner(id);
    return this.proxyActions.safeWipeAll(
      this._managerAddress,
      this._adapterAddress('DAI'),
      this.getIdBytes(id),
      owner,
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

  resetEventHistoryCache(id = null) {
    if (id !== null) delete this._getEventHistoryPromises[id];
    else this._getEventHistoryPromises = {};
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

  getNewCdpId(txo) {
    const logs = txo.receipt.logs;
    const managerContract = this
      .get('smartContract')
      .getContract('CDP_MANAGER');
    const web3 = this.get('web3')._web3;
    const { NewCdp } = managerContract.interface.events;
    const topic = utils.keccak256(web3.utils.toHex(NewCdp.signature));
    const receiptEvent = logs.filter(
      e => e.topics[0].toLowerCase() === topic.toLowerCase() //filter for NewCdp events
    );
    const parsedLog = NewCdp.parse(receiptEvent[0].topics, receiptEvent[0].data);
    assert(parsedLog['cdp'], 'could not find log for NewCdp event');
    return parseInt(parsedLog['cdp']);
  }

  async getEventHistory(managedCdp) {
    const MCD_JOIN_DAI = this.get('smartContract').getContractAddress('MCD_JOIN_DAI');
    const CDP_MANAGER = this.get('smartContract').getContractAddress('CDP_MANAGER');
    const MCD_VAT = this.get('smartContract').getContractAddress('MCD_VAT');

    const id = managedCdp.id;
    if (this._getEventHistoryPromises.hasOwnProperty(id)) return await this._getEventHistoryPromises[id];
    const fromBlock = 1;
    const web3 = this.get('smartContract').get('web3');

    const formatAddress = v => '0x' + v.slice(26);
    const funcSigTopic = v => padEnd(ethAbi.encodeFunctionSignature(v), 66, '0');
    const fromWei = v => web3._web3.utils.fromWei(v.toString());
    const fromHexWei = v => web3._web3.utils.fromWei(web3._web3.utils.toBN(v.toString()).toString()).toString();
    const numberFromHex = v => web3._web3.utils.toBN(v.toString()).toNumber();

    const EVENT_GIVE = funcSigTopic('give(uint256,address)');
    const EVENT_DAI_ADAPTER_EXIT = funcSigTopic('exit(address,uint256)');
    const EVENT_DAI_ADAPTER_JOIN = funcSigTopic('join(address,uint256)');
    const EVENT_VAT_FROB = funcSigTopic('frob(bytes32,address,address,address,int256,int256)');
    const EVENT_MANAGER_FROB = funcSigTopic('frob(uint256,int256,int256)');

    const promisesBlockTimestamp = {};
    const getBlockTimestamp = block => {
      if (promisesBlockTimestamp.hasOwnProperty(block)) return promisesBlockTimestamp[block];
      promisesBlockTimestamp[block] = web3.getBlock(block, false);
      return promisesBlockTimestamp[block];
    };

    const decodeManagerFrob = data => {
      const sig = ethAbi.encodeFunctionSignature('frob(uint256,int256,int256)').slice(2);
      const decoded = ethAbi.decodeParameters([
        'uint256', // id
        'int256',  // dink
        'int256'   // dart
      ], '0x' + data.replace(new RegExp('^.+?' + sig), ''));
      return {
        id: decoded[0].toString(),
        dink: decoded[1],
        dart: decoded[2] // can't be used directly because would need to be scaled up using vat.ilks[ilk].rate
      };
    };

    const decodeVatFrob = data => {
      const sig = ethAbi.encodeFunctionSignature('frob(bytes32,address,address,address,int256,int256)').slice(2);
      const decoded = ethAbi.decodeParameters([
        'bytes32', // ilk
        'address', // u (urnHandler)
        'address', // v (urnHandler)
        'address', // w (urnHandler)
        'int256',  // dink
        'int256'   // dart
      ], '0x' + data.replace(new RegExp('^.+?' + sig), ''));
      return {
        ilk: bytesToString(decoded[0].toString()),
        urnHandler: decoded[1].toString(),
        dink: decoded[4].toString(),
        dart: decoded[5].toString()
      };
    };

    const urnHandler = (await this.getUrn(id)).toLowerCase();
    const ilk = managedCdp.ilk;

    const lookups = [
      {
        request: web3.getPastLogs({
          address: CDP_MANAGER,
          topics: [
            EVENT_MANAGER_FROB,
            null,
            '0x' + padStart(id.toString(16), 64, '0')
          ],
          fromBlock
        }),
        result: async r => {
          // For now, use an approach where we find the oldest frob
          // (until we can get an indexed cdp param added to event NewCdp)
          const events1 = r.reduce(
            (acc, { blockNumber: block, transactionHash: txHash }) => {
              // Consider the earliest block to be the block the vault was opened
              if (acc === null || acc.block > block) {
                return {
                  type: 'OPEN',
                  order: 0,
                  block,
                  txHash,
                  id,
                  ilk
                };
              }
              return acc;
            },
            null
          );
          const events2 = r.reduce(
            async (acc, { blockNumber: block, data, topics }) => {
              let { dart } = decodeManagerFrob(data);
              acc = await acc;
              dart = new BigNumber(dart);

              // Imprecise debt amount frobbed (not scaled by vat.ilks[ilk].rate)
              if (dart.lt(0) || dart.gt(0)) {
                // Lookup the dai join events on this block for this proxy address
                const proxy = topics[1];
                const joinDaiEvents = await web3.getPastLogs({
                  address: MCD_JOIN_DAI,
                  topics: [
                    dart.lt(0)
                      ? EVENT_DAI_ADAPTER_JOIN
                      : EVENT_DAI_ADAPTER_EXIT,
                    proxy
                  ],
                  fromBlock: block,
                  toBlock: block
                });
                acc.push(
                  ...joinDaiEvents.map(
                    ({ blockNumber: block, transactionHash: txHash, topics }) => ({
                      type: dart.lt(0) ? 'PAY_BACK' : 'GENERATE',
                      order: 2,
                      block,
                      txHash,
                      id,
                      ilk,
                      adapter: MCD_JOIN_DAI.toLowerCase(),
                      proxy: formatAddress(topics[1]),
                      recipient: formatAddress(topics[2]),
                      amount: fromHexWei(topics[3]),
                    })
                  )
                );
              }
              return acc;
            },
            []
          );
          return flatten([events1, await events2]);
        }
      },
      {
        request: web3.getPastLogs({
          address: MCD_VAT,
          topics: [
            EVENT_VAT_FROB,
            null,
            '0x' + padStart(urnHandler.slice(2), 64, '0')
          ],
          fromBlock
        }),
        result: r => r.map(({ address, blockNumber: block, transactionHash: txHash, data }) => {
          let { ilk, dink, proxy } = decodeVatFrob(data);
          dink = new BigNumber(dink);
          if (dink.lt(0) || dink.gt(0)) return {
            type: dink.lt(0) ? 'WITHDRAW' : 'DEPOSIT',
            order: dink.lt(0) ? 3 : 1,
            block,
            txHash,
            id,
            ilk,
            gem: managedCdp.currency.symbol,
            adapter: address.toLowerCase(),
            amount: Math.abs(fromWei(dink.toString())).toString(),
            proxy
          };
          return null;
        })
      },
      {
        request: web3.getPastLogs({
          address: CDP_MANAGER,
          topics: [EVENT_GIVE, null, '0x' + padStart(id.toString(16), 64, '0')],
          fromBlock
        }),
        result: r => r.map(({ blockNumber: block, transactionHash: txHash, topics }) => ({
          type: 'GIVE',
          block,
          txHash,
          prevOwner: formatAddress(topics[1]),
          id: numberFromHex(topics[2]),
          newOwner: formatAddress(topics[3])
        }))
      }
    ];
    this._getEventHistoryPromises[id] = (async () => {
      const results = await Promise.all(lookups.map(l => l.request));
      const events = orderBy(
        await Promise.all(
          flatten(
            await Promise.all(
              results.map(async (r, i) => await lookups[i].result(r))
            )
          )
          .filter(r => r !== null)
          .map(async e => {
            e.timestamp = (await getBlockTimestamp(e.block)).timestamp;
            return e;
          })
        ),
        ['block', 'order'],
        ['desc', 'desc']
      ).map(e => {
        delete e.order;
        return e;
      });
      return events;
    })();
    return this._getEventHistoryPromises[id];
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
