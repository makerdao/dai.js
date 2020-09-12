import { MKR } from '../src/utils/constants';
import { createBallot } from './helpers/index';

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

export const dummyAllOptions = [
  { pollId: 102, optionId: 772, optionIdRaw: '772' },
  { pollId: 101, optionId: 1025, optionIdRaw: '1025' },
  { pollId: 96, optionId: 2, optionIdRaw: null },
  { pollId: 49, optionId: 2, optionIdRaw: null }
];

export const allOptionsExpect = [
  { pollId: 102, option: 772, rankedChoiceOption: [4, 3] },
  { pollId: 101, option: 1025, rankedChoiceOption: [1, 4] },
  { pollId: 96, option: 2, rankedChoiceOption: null },
  { pollId: 49, option: 2, rankedChoiceOption: null }
];

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

// ---

export const dummyBallotWithMajority = [
  {
    mkrSupport: '60.025000000000000000',
    ballot: createBallot([1, 3]) // [1st choice, 2nd choice, ...]
  },
  {
    mkrSupport: '200.598801867883985831',
    ballot: createBallot([3, 1])
  },
  {
    mkrSupport: '64.068823529411764706',
    ballot: createBallot([2, 3])
  }
];

export const dummyBallotWithMajorityExpect = {
  rounds: 1,
  winner: '3',
  totalMkrParticipation: '324.692625397295750537',
  options: {
    '1': {
      firstChoice: '60.025',
      transfer: '0',
      winner: false,
      eliminated: false
    },
    '2': {
      firstChoice: '64.068823529411764706',
      transfer: '0',
      winner: false,
      eliminated: false
    },
    '3': {
      firstChoice: '200.598801867883985831',
      transfer: '0',
      winner: true,
      eliminated: false
    }
  }
};

// ---

export const dummyBallotNoMajority = [
  {
    mkrSupport: '60.025000000000000000',
    ballot: createBallot([1, 3]) // [1st choice, 2nd choice, ...]
  },
  {
    mkrSupport: '102.598801867883985831',
    ballot: createBallot([3, 1])
  },
  {
    mkrSupport: '64.068823529411764706',
    ballot: createBallot([2, 3])
  }
];

export const dummyBallotNoMajorityExpect = {
  rounds: 2,
  winner: '3',
  totalMkrParticipation: '226.692625397295750537',
  options: {
    '1': {
      firstChoice: '60.025',
      transfer: '-60.025',
      winner: false,
      eliminated: true
    },
    '2': {
      firstChoice: '64.068823529411764706',
      transfer: '0',
      winner: false,
      eliminated: false
    },
    '3': {
      firstChoice: '102.598801867883985831',
      transfer: '60.025',
      winner: true,
      eliminated: false
    }
  }
};

// ---

export const dummyBallotMultipleRounds = [
  {
    mkrSupport: '60.025000000000000000',
    ballot: createBallot([1, 3]) // [1st choice, 2nd choice, ...]
  },
  {
    mkrSupport: '102.598801867883985831',
    ballot: createBallot([3, 1])
  },
  {
    mkrSupport: '64.068823529411764706',
    ballot: createBallot([2, 3])
  },
  {
    mkrSupport: '4',
    ballot: createBallot([4, 1])
  }
];

export const dummyBallotMultipleRoundsExpect = {
  rounds: 3,
  winner: '3',
  totalMkrParticipation: '230.692625397295750537',
  options: {
    '1': {
      firstChoice: '60.025',
      transfer: '-56.025',
      winner: false,
      eliminated: true
    },
    '2': {
      firstChoice: '64.068823529411764706',
      transfer: '0',
      winner: false,
      eliminated: false
    },
    '3': {
      firstChoice: '102.598801867883985831',
      transfer: '60.025',
      winner: true,
      eliminated: false
    },
    '4': {
      firstChoice: '4',
      transfer: '-4',
      winner: false,
      eliminated: true
    }
  }
};
