import getMatchingEvent, {
  getTopics,
  parseRawLog
} from '../../../src/eth/web3/LogEvent';
import { buildTestService } from '../../helpers/serviceBuilders';
import contracts from '../../../contracts/contracts';

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

  let service;

  beforeEach(async () => {
    service = buildTestService('web3', { useWebsockets: true });
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
      smartContract: true,
      useWebsockets: true
    });
    await smartContractService.manager().authenticate();
    const web3Service = smartContractService.get('web3');

    const mockEventEmitter = web3Service.web3Provider();

    const logEmitter = new Promise(resolve => {
      setTimeout(() => {
        const { subscriptions } = web3Service._web3.eth._requestManager;
        expect(subscriptions['0x2'].name).toEqual('logs');
        resolve(mockEventEmitter.emit('data', (null, rawLogNewCup())));
      }, 100);
    });

    const contractAbi = smartContractService._getContractInfo(
      contracts.SAI_TUB
    );

    const eventPromise = getMatchingEvent(
      web3Service._web3,
      contractAbi,
      'LogNewCup'
    );
    await logEmitter;

    const { subscriptions } = web3Service._web3.eth._requestManager;
    expect(subscriptions['0x2']).toBe(undefined);

    const expectedEvent = {
      '0': '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6',
      '1': '0x0000000000000000000000000000000000000000000000000000000000000001',
      __length__: 2,
      cup: '0x0000000000000000000000000000000000000000000000000000000000000001',
      lad: '0x16Fb96a5fa0427Af0C8F7cF1eB4870231c8154B6'
    };

    expect(eventPromise).resolves.toEqual(expectedEvent);
  });
});
