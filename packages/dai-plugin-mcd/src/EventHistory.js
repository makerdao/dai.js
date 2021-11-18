import ethAbi from 'web3-eth-abi';
import padStart from 'lodash/padStart';
import padEnd from 'lodash/padEnd';
import orderBy from 'lodash/orderBy';
import flatten from 'lodash/flatten';
import BigNumber from 'bignumber.js';
import { bytesToString, parseWeiNumeric, numberFromNumeric } from './utils';

const formatAddress = v => '0x' + v.slice(26).toLowerCase();
const funcSigTopic = v => padEnd(ethAbi.encodeFunctionSignature(v), 66, '0');

const EVENT_GIVE = funcSigTopic('give(uint256,address)');
const EVENT_DAI_ADAPTER_EXIT = funcSigTopic('exit(address,uint256)');
const EVENT_DAI_ADAPTER_JOIN = funcSigTopic('join(address,uint256)');
const EVENT_POT_JOIN = funcSigTopic('join(uint256)');
const EVENT_POT_EXIT = funcSigTopic('exit(uint256)');
const EVENT_VAT_FROB = funcSigTopic(
  'frob(bytes32,address,address,address,int256,int256)'
);
const EVENT_MANAGER_FROB = funcSigTopic('frob(uint256,int256,int256)');
const EVENT_MANAGER_MOVE = funcSigTopic('move(uint256,address,uint256)');

const decodeManagerFrob = data => {
  const sig = ethAbi
    .encodeFunctionSignature('frob(uint256,int256,int256)')
    .slice(2);
  const decoded = ethAbi.decodeParameters(
    [
      'uint256', // id
      'int256', // dink
      'int256' // dart
    ],
    '0x' + data.replace(new RegExp('^.+?' + sig), '')
  );
  return {
    id: decoded[0].toString(),
    dink: decoded[1],
    dart: decoded[2] // can't be used directly because would need to be scaled up using vat.ilks[ilk].rate
  };
};

const decodeVatFrob = data => {
  const sig = ethAbi
    .encodeFunctionSignature(
      'frob(bytes32,address,address,address,int256,int256)'
    )
    .slice(2);
  const decoded = ethAbi.decodeParameters(
    [
      'bytes32', // ilk
      'address', // u (urnHandler)
      'address', // v (urnHandler)
      'address', // w (urnHandler)
      'int256', // dink
      'int256' // dart
    ],
    '0x' + data.replace(new RegExp('^.+?' + sig), '')
  );
  return {
    ilk: bytesToString(decoded[0].toString()),
    urnHandler: decoded[1].toString(),
    dink: decoded[4].toString(),
    dart: decoded[5].toString()
  };
};

export default async function getEventHistory(cdpManager, managedCdp, cache) {
  const MCD_JOIN_DAI = cdpManager
    .get('smartContract')
    .getContractAddress('MCD_JOIN_DAI');
  // const MCD_JOIN_SAI = cdpManager
  //   .get('smartContract')
  //   .getContractAddress('MCD_JOIN_SAI');
  const CDP_MANAGER = cdpManager
    .get('smartContract')
    .getContractAddress('CDP_MANAGER');
  const MIGRATION = cdpManager
    .get('smartContract')
    .getContractAddress('MIGRATION');
  const MCD_VAT = cdpManager.get('smartContract').getContractAddress('MCD_VAT');
  const MCD_CAT = cdpManager.get('smartContract').getContractAddress('MCD_CAT');
  const OLD_MCD_CAT = cdpManager
    .get('smartContract')
    .getContractAddress('OLD_MCD_CAT');

  const id = managedCdp.id;
  if (cache[id]) return cache[id];

  const web3 = cdpManager.get('web3');

  // 8600000 is 2019-09-22 on mainnet and 2018-09-04 on kovan
  const genesis = [1, 42].includes(web3.network) ? 8600000 : 1;

  const promisesBlockTimestamp = {};
  const getBlockTimestamp = block => {
    if (!promisesBlockTimestamp[block]) {
      promisesBlockTimestamp[block] = web3.getBlock(block, false);
    }
    return promisesBlockTimestamp[block];
  };

  const urnHandler = (await cdpManager.getUrn(id)).toLowerCase();
  const ilk = managedCdp.ilk;

  const Bite = cdpManager
    .get('smartContract')
    .getContract('MCD_CAT')
    .interface.getEvent('Bite');

  const [newCdpTopic0] = cdpManager
    .get('smartContract')
    .getContract('CDP_MANAGER')
    .interface.encodeFilterTopics('NewCdp', []);

  const [biteTopic0] = cdpManager
    .get('smartContract')
    .getContract('MCD_CAT')
    .interface.encodeFilterTopics('Bite', []);

  const cdpManagerNewCdp = {
    request: web3.getPastLogs({
      address: CDP_MANAGER,
      topics: [
        newCdpTopic0,
        null,
        null,
        '0x' + padStart(id.toString(16), 64, '0')
      ],
      fromBlock: genesis
    }),
    result: r =>
      r.map(({ blockNumber: block, transactionHash: txHash }) => {
        return {
          type: 'OPEN',
          order: 0,
          block,
          txHash,
          id,
          ilk
        };
      })
  };

  const daiAdapterJoinExit = {
    request: web3.getPastLogs({
      address: CDP_MANAGER,
      topics: [
        EVENT_MANAGER_FROB,
        null,
        '0x' + padStart(id.toString(16), 64, '0')
      ],
      fromBlock: genesis
    }),
    result: async r => {
      return r.reduce(async (acc, { blockNumber: block, data, topics }) => {
        let { dart } = decodeManagerFrob(data);
        acc = await acc;
        dart = new BigNumber(dart);
        // Imprecise debt amount frobbed (not scaled by vat.ilks[ilk].rate)
        if (dart.lt(0) || dart.gt(0)) {
          // Lookup the dai join events on this block for this proxy address
          const proxy = topics[1];

          const [joinDaiEvents, cdpMoveEvents] = await Promise.all([
            web3.getPastLogs({
              /*
              FIXME: ethers 5 doesn't support passing an array of addresses into getLogs
              as we move further away from SCD, join Sai events are less likely, but
              we should eventually re-add this functionality by duplicating this call for MCD_JOIN_SAI.
              */
              // address: [MCD_JOIN_DAI, MCD_JOIN_SAI],
              address: MCD_JOIN_DAI,
              topics: [
                dart.lt(0) ? EVENT_DAI_ADAPTER_JOIN : EVENT_DAI_ADAPTER_EXIT,
                proxy
              ],
              fromBlock: block,
              toBlock: block
            }),
            web3.getPastLogs({
              address: CDP_MANAGER,
              topics: [
                EVENT_MANAGER_MOVE,
                proxy,
                '0x' + padStart(id.toString(16), 64, '0')
              ],
              fromBlock: block,
              toBlock: block
            })
          ]);

          const filteredJoinDaiEvents = joinDaiEvents.filter(daiEvent =>
            cdpMoveEvents.some(
              moveEvent =>
                moveEvent.transactionHash === daiEvent.transactionHash
            )
          );
          acc.push(
            ...filteredJoinDaiEvents.map(
              ({
                address,
                blockNumber: block,
                transactionHash: txHash,
                topics
              }) => ({
                type: dart.lt(0) ? 'PAY_BACK' : 'GENERATE',
                order: 2,
                block,
                txHash,
                id,
                ilk,
                adapter: address.toLowerCase(),
                proxy: formatAddress(topics[1]),
                recipient: formatAddress(topics[2]),
                amount: parseWeiNumeric(topics[3])
              })
            )
          );
        }
        return acc;
      }, []);
    }
  };

  const vatFrob = {
    request: web3.getPastLogs({
      address: MCD_VAT,
      topics: [
        EVENT_VAT_FROB,
        null,
        '0x' + padStart(urnHandler.slice(2), 64, '0')
      ],
      fromBlock: genesis
    }),
    result: r =>
      r.map(
        ({
          address,
          blockNumber: block,
          transactionHash: txHash,
          data,
          topics,
          transactionLogIndex
        }) => {
          let { ilk, dink, urnHandler } = decodeVatFrob(data);
          dink = new BigNumber(dink);
          const reclaim =
            formatAddress(topics[2]) === urnHandler.toLowerCase() &&
            formatAddress(topics[3]) == urnHandler.toLowerCase() &&
            parseInt(transactionLogIndex, 16) === 1;
          return dink.lt(0) || dink.gt(0)
            ? {
                type: dink.lt(0) ? 'WITHDRAW' : reclaim ? 'RECLAIM' : 'DEPOSIT',
                order: dink.lt(0) ? 3 : 1,
                block,
                txHash,
                id,
                ilk,
                gem: managedCdp.currency.symbol,
                adapter: address.toLowerCase(),
                amount: Math.abs(parseWeiNumeric(dink)).toString()
              }
            : null;
        }
      )
  };

  const cdpManagerGive = {
    request: web3.getPastLogs({
      address: CDP_MANAGER,
      topics: [EVENT_GIVE, null, '0x' + padStart(id.toString(16), 64, '0')],
      fromBlock: genesis
    }),
    result: r =>
      r.map(({ blockNumber: block, transactionHash: txHash, topics }) => {
        const prevOwner = formatAddress(topics[1]);
        return {
          type: prevOwner === MIGRATION ? 'MIGRATE' : 'GIVE',
          order: 1,
          block,
          txHash,
          prevOwner,
          id: numberFromNumeric(topics[2]),
          newOwner: formatAddress(topics[3])
        };
      })
  };

  const catBite = (address, fromBlock, toBlock) => ({
    request: web3.getPastLogs({
      address,
      topics: [biteTopic0, null, '0x' + padStart(urnHandler.slice(2), 64, '0')],
      fromBlock,
      toBlock
    }),
    result: r =>
      r.map(tx => {
        const {
          topics,
          data,
          blockNumber: block,
          transactionHash: txHash
        } = tx;
        const inputs = Bite.inputs.names.reduceRight((acc, name, idx) => {
          if (['ilk', 'urn'].some(indexed => indexed === name)) return acc;
          return [
            {
              type: Bite.inputs.types[idx],
              name
            },
            ...acc
          ];
        }, []);
        const { id, ink } = ethAbi.decodeLog(inputs, data, topics);
        return {
          type: 'BITE',
          auctionId: numberFromNumeric(id),
          amount: new BigNumber(ink).shiftedBy(-18),
          gem: managedCdp.currency.symbol,
          block,
          txHash
        };
      })
  });

  const catUpgradeBlock = [1, 42].includes(web3.network) ? 10769102 : 1;

  const lookups = [
    cdpManagerNewCdp,
    daiAdapterJoinExit,
    vatFrob,
    cdpManagerGive,
    catBite(MCD_CAT, catUpgradeBlock),
    catBite(OLD_MCD_CAT, genesis, catUpgradeBlock)
  ];

  // eslint-disable-next-line require-atomic-updates
  cache[id] = (async () => {
    const results = await Promise.all(lookups.map(l => l.request));
    return orderBy(
      await Promise.all(
        flatten(await Promise.all(results.map((r, i) => lookups[i].result(r))))
          .filter(r => r !== null)
          .map(async e => {
            // eslint-disable-next-line require-atomic-updates
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
  })();

  return cache[id];
}

export async function getDsrEventHistory(service, address, cache) {
  const MCD_JOIN_DAI = service
    .get('smartContract')
    .getContractAddress('MCD_JOIN_DAI');
  const MCD_POT = service.get('smartContract').getContractAddress('MCD_POT');

  address = address.toLowerCase();
  if (cache[address]) return cache[address];

  const web3 = service.get('web3');

  // 8600000 is 2019-09-22 on mainnet and 2018-09-04 on kovan
  const fromBlock = [1, 42].includes(web3.network) ? 8600000 : 1;

  const promisesBlockTimestamp = {};
  const getBlockTimestamp = block => {
    if (!promisesBlockTimestamp[block]) {
      promisesBlockTimestamp[block] = web3.getBlock(block, false);
    }
    return promisesBlockTimestamp[block];
  };

  const lookups = [
    {
      request: web3.getPastLogs({
        address: MCD_POT,
        topics: [EVENT_POT_JOIN, '0x' + padStart(address.slice(2), 64, '0')],
        fromBlock
      }),
      result: async r =>
        r.reduce(
          async (acc, { blockNumber: block, transactionHash: txHash }) => {
            acc = await acc;
            const adapterJoinEvents = await web3.getPastLogs({
              address: MCD_JOIN_DAI,
              topics: [
                EVENT_DAI_ADAPTER_JOIN,
                '0x' + padStart(address.slice(2), 64, '0')
              ],
              fromBlock
            });
            const [{ topics: adapterTopics }] = adapterJoinEvents.filter(
              x => x.transactionHash === txHash
            );
            acc.push({
              type: 'DSR_DEPOSIT',
              order: 0,
              block,
              txHash,
              amount: parseWeiNumeric(adapterTopics[3]),
              gem: 'DAI'
            });
            return acc;
          },
          []
        )
    },
    {
      request: web3.getPastLogs({
        address: MCD_POT,
        topics: [EVENT_POT_EXIT, '0x' + padStart(address.slice(2), 64, '0')],
        fromBlock
      }),
      result: async r =>
        r.reduce(
          async (acc, { blockNumber: block, transactionHash: txHash }) => {
            acc = await acc;
            const adapterExitEvents = await web3.getPastLogs({
              address: MCD_JOIN_DAI,
              topics: [
                EVENT_DAI_ADAPTER_EXIT,
                '0x' + padStart(address.slice(2), 64, '0')
              ],
              fromBlock
            });
            const [{ topics: adapterTopics }] = adapterExitEvents.filter(
              x => x.transactionHash === txHash
            );
            acc.push({
              type: 'DSR_WITHDRAW',
              order: 0,
              block,
              txHash,
              amount: parseWeiNumeric(adapterTopics[3]),
              gem: 'DAI'
            });
            return acc;
          },
          []
        )
    }
  ];

  // eslint-disable-next-line require-atomic-updates
  cache[address] = (async () => {
    const results = await Promise.all(lookups.map(l => l.request));
    return orderBy(
      await Promise.all(
        flatten(await Promise.all(results.map((r, i) => lookups[i].result(r))))
          .filter(r => r !== null)
          .map(async e => {
            // eslint-disable-next-line require-atomic-updates
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
  })();

  return cache[address];
}
