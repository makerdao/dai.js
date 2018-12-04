import { getTopics, parseRawLog } from '../../../src/eth/web3/LogEvent';
import { buildTestService } from '../../helpers/serviceBuilders';

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
});
