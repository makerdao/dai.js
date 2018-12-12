import getMatchingEvent, {
  getTopics,
  parseRawLog
} from '../../../src/eth/web3/LogEvent';
import { buildTestService } from '../../helpers/serviceBuilders';
import contracts from '../../../contracts/contracts';
import util from 'util';

describe('event subscriptions', () => {
  const event = isAnonymous => {
    return {
      anonymous: isAnonymous,
      inputs: [
        { indexed: true, name: 'lad', type: 'address' },
        { indexed: false, name: 'cup', type: 'bytes32' }
      ],
      name: 'LogNewCup',
      type: 'event'
    };
  };

  const log = () => {
    return {
      data:
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      topics: [
        '0x89b8893b806db50897c8e2362c71571cfaeb9761ee40727f683f1793cda9df16',
        '0x00000000000000000000000016fb96a5fa0427af0c8f7cf1eb4870231c8154b6'
      ]
    };
  };

  const rawLogNewCup = () => {
    return {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: '0x2',
        result: {
          data:
            '0x0000000000000000000000000000000000000000000000000000000000000001',
          topics: [
            '0x89b8893b806db50897c8e2362c71571cfaeb9761ee40727f683f1793cda9df16',
            '0x00000000000000000000000016fb96a5fa0427af0c8f7cf1eb4870231c8154b6'
          ]
        }
      }
    };
  };

  const correctLogNewCup = () => {
    return {
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        subscription: '0x2',
        result: {
          data:
            '0x0000000000000000000000000000000000000000000000000000000000000002',
          topics: [
            '0x89b8893b806db50897c8e2362c71571cfaeb9761ee40727f683f1793cda9df16',
            '0x00000000000000000000000016fb96a5fa0427af0c8f7cf1eb4870231c8154b6'
          ]
        }
      }
    };
  };

  const expectedEvent = {
    '0': '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6',
    '1': '0x0000000000000000000000000000000000000000000000000000000000000001',
    __length__: 2,
    cup: '0x0000000000000000000000000000000000000000000000000000000000000001',
    lad: '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6'
  };

  const correctEvent = {
    '0': '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6',
    '1': '0x0000000000000000000000000000000000000000000000000000000000000002',
    __length__: 2,
    cup: '0x0000000000000000000000000000000000000000000000000000000000000002',
    lad: '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6'
  };

  function fireMockEvent(web3Service, eventObj, timeout, expects) {
    return new Promise(resolve => {
      const mockEventEmitter = web3Service.web3Provider();
      setTimeout(() => {
        expects();
        resolve(mockEventEmitter.emit('data', (null, eventObj)));
      }, timeout);
    });
  }

  let service;

  beforeEach(async () => {
    service = buildTestService('web3');
    await service.manager().authenticate();
  });

  test('topics will be generated correctly from event abi', async () => {
    const { sha3 } = service._web3.utils;
    const res = [
      '0x89b8893b806db50897c8e2362c71571cfaeb9761ee40727f683f1793cda9df16'
    ];
    expect(getTopics(event(false), sha3)).toEqual(res);
  });

  test('will parse log correctly', async () => {
    const decoder = service._web3.eth.abi;
    const refinedLog = parseRawLog(log(), event(false), decoder);
    const id = service._web3.utils.hexToNumber(refinedLog['1']);

    expect(refinedLog['0'].toLowerCase()).toEqual(
      service.currentAccount().toLowerCase()
    );
    expect(id).toEqual(1);
  });

  test('will parse log with anonymous event correctly', async () => {
    const decoder = service._web3.eth.abi;
    const refinedLog = parseRawLog(log(), event(true), decoder);
    const id = service._web3.utils.hexToNumber(refinedLog['1']);

    expect(refinedLog['0'].toLowerCase()).not.toEqual(
      service.currentAccount().toLowerCase()
    );
    expect(id).toEqual(1);
  });

  test('mock subscription event firing and catching', async () => {
    const smartContractService = buildTestService('smartContract', {
      smartContract: true
    });
    await smartContractService.manager().authenticate();
    const web3Service = smartContractService.get('web3');

    const contractAbi = smartContractService._getContractInfo(
      contracts.SAI_TUB
    );

    const eventPromise = getMatchingEvent(
      web3Service._web3,
      contractAbi,
      'LogNewCup',
      300000
    );

    expect(util.inspect(eventPromise)).toMatch(/<pending>/);
    await fireMockEvent(web3Service, rawLogNewCup(), 100, () => {
      const { subscriptions } = web3Service._web3.eth._requestManager;
      expect(subscriptions['0x2'].name).toEqual('logs');
    });

    // eventPromise callback will be triggered and will resolve itself
    expect(util.inspect(eventPromise)).toMatch(/Result/);
    expect(eventPromise).resolves.toEqual(expectedEvent);

    const { subscriptions } = web3Service._web3.eth._requestManager;
    expect(subscriptions['0x2']).toBe(undefined);
  });

  test('mock subscription event with predicate', async () => {
    const smartContractService = buildTestService('smartContract', {
      smartContract: true
    });
    await smartContractService.manager().authenticate();
    const web3Service = smartContractService.get('web3');

    const contractAbi = smartContractService._getContractInfo(
      contracts.SAI_TUB
    );

    const eventPromise = getMatchingEvent(
      web3Service._web3,
      contractAbi,
      'LogNewCup',
      30000,
      log => {
        const hexConvertAndPad = num => {
          return web3Service._web3.utils.padLeft(
            web3Service._web3.utils.numberToHex(num),
            64
          );
        };
        return log.cup === hexConvertAndPad(2);
      }
    );

    expect(util.inspect(eventPromise)).toMatch(/<pending>/);
    await fireMockEvent(web3Service, rawLogNewCup(), 100, () => {
      const { subscriptions } = web3Service._web3.eth._requestManager;
      expect(subscriptions['0x2'].name).toEqual('logs');
    });

    // eventPromise should not resolve as predicate is not satisfied
    expect(util.inspect(eventPromise)).toMatch(/<pending>/);

    await fireMockEvent(web3Service, correctLogNewCup(), 100, () => {
      const { subscriptions } = web3Service._web3.eth._requestManager;
      expect(subscriptions['0x2'].name).toEqual('logs');
    });

    // eventPromise should now be resolved as predicate is satisfied
    expect(util.inspect(eventPromise)).toMatch(/Result/);
    expect(eventPromise).resolves.toEqual(correctEvent);

    const { subscriptions } = web3Service._web3.eth._requestManager;
    expect(subscriptions['0x2']).toBe(undefined);
  });

  test('getMatchingEvent should timeout if not resolved', async () => {
    expect.assertions(1);
    const smartContractService = buildTestService('smartContract', {
      smartContract: true
    });
    await smartContractService.manager().authenticate();
    const web3Service = smartContractService.get('web3');

    const contractAbi = smartContractService._getContractInfo(
      contracts.SAI_TUB
    );

    const eventPromise = getMatchingEvent(
      web3Service._web3,
      contractAbi,
      'LogNewCup',
      2000
    );
    await eventPromise.catch(e => {
      expect(e).toEqual(Error('event did not resolve after 2 seconds'));
    });
  });
});
