import { MKR } from '../src/utils/constants';

export const dummyMkrSupportData = [
  {
    optionId: 1,
    mkrSupport: 40,
    percentage: 25,
    blockTimestamp: Date.now()
  },
  {
    optionId: 2,
    mkrSupport: 120,
    percentage: 75,
    blockTimestamp: Date.now()
  }
];

export const dummyAllPollsData = [
  {
    creator: '0xeda95d1bdb60f901986f43459151b6d1c734b8a2',
    pollId: 1,
    blockCreated: 123456788,
    startDate: Date.now() - 10000000,
    endDate: Date.now() - 1,
    multiHash: 'QmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4',
    url: 'https://dummyURL/1'
  },
  {
    creator: '0xTYa95d1bdb60f901986f43459151b6d1c734b8a2',
    pollId: 2,
    blockCreated: 123456789,
    startDate: Date.now() - 20000000,
    endDate: Date.now(),
    multiHash: 'ZmaozNR7DZHQK1ZcU9p7QdrshMvXqWK6gpu5rmrkPdT3L4',
    url: 'https://dummyURL/2'
  }
];

let i = 0;
export function dummyBlockNumber() {
  return [8017399, 8200000][i++ % 2];
}

export const dummyNumUnique = 225;

export const dummyWeight = 5.5;

export const dummyOption = 1;

export const dummyEsmData = [
  {
    txFrom: '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6',
    txHash:
      '0x992dc7815d91eedb691ff4a7192bafc79f624534655ee0663c555252f9e48e22',
    joinAmount: '0.100000000000000000',
    blockTimestamp: '2019-11-13T15:03:28+00:00'
  },
  {
    txFrom: '0x14341f81df14ca86e1420ec9e6abd343fb1c5bfc',
    txHash:
      '0x6cead96909408284c77dca7a96c18df75c3f0c0eb6e972c2c0fb84f569648bfe',
    joinAmount: '0.010000000000000000',
    blockTimestamp: '2020-01-10T00:16:16+00:00'
  }
];

export const parsedDummyEsmData = [
  {
    senderAddress: '0x14341f81df14ca86e1420ec9e6abd343fb1c5bfc',
    transactionHash:
      '0x6cead96909408284c77dca7a96c18df75c3f0c0eb6e972c2c0fb84f569648bfe',
    amount: MKR(0.01),
    time: new Date('2020-01-10T00:16:16+00:00')
  },
  {
    senderAddress: '0x16fb96a5fa0427af0c8f7cf1eb4870231c8154b6',
    transactionHash:
      '0x992dc7815d91eedb691ff4a7192bafc79f624534655ee0663c555252f9e48e22',
    amount: MKR(0.1),
    time: new Date('2019-11-13T15:03:28+00:00')
  }
];
