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

export const dummyMkrGetMkrSupportRCForPluralityData = [
  {
    optionIdRaw: '1',
    mkrSupport: '40'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '60'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '77'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '32'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '600'
  }
];
export const dummyMkrGetMkrSupportRCForPluralityDataAdjusted = [
  {
    optionIdRaw: '1',
    mkrSupport: '40'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '60'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '77'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '32'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '600'
  },
  {
    optionIdRaw: '2',
    mkrSupport: '32'
  },
  {
    optionIdRaw: '2',
    mkrSupport: '1200'
  }
];


export const dummyMkrGetMkrSupportRCForPluralityDataAbstain = [
  {
    optionIdRaw: '1',
    mkrSupport: '40'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '60'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '77'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '32'
  },
  {
    optionIdRaw: '1',
    mkrSupport: '600'
  },
  {
    optionIdRaw: '2',
    mkrSupport: '32'
  },
  {
    optionIdRaw: '0',
    mkrSupport: '1200'
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
  { pollId: 102, optionId: 772, optionIdRaw: '772', blockTimestamp: 60321321 },
  {
    pollId: 101,
    optionId: 1025,
    optionIdRaw: '1025',
    blockTimestamp: 60321321
  },
  { pollId: 96, optionId: 2, optionIdRaw: null, blockTimestamp: 60321321 },
  { pollId: 49, optionId: 2, optionIdRaw: null, blockTimestamp: 60321321 }
];

export const allOptionsExpect = [
  {
    pollId: 102,
    option: 772,
    rankedChoiceOption: [4, 3],
    blockTimestamp: 60321321
  },
  {
    pollId: 101,
    option: 1025,
    rankedChoiceOption: [1, 4],
    blockTimestamp: 60321321
  },
  { pollId: 96, option: 2, rankedChoiceOption: null, blockTimestamp: 60321321 },
  { pollId: 49, option: 2, rankedChoiceOption: null, blockTimestamp: 60321321 }
];

export const dummyAllOptionsMany = [
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 102,
    optionId: 772,
    optionIdRaw: '772'
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 101,
    optionId: 1025,
    optionIdRaw: '1025'
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 96,
    optionId: 2,
    optionIdRaw: null
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 49,
    optionId: 2,
    optionIdRaw: null
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 102,
    optionId: 772,
    optionIdRaw: '772'
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 101,
    optionId: 1025,
    optionIdRaw: '1025'
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 96,
    optionId: 2,
    optionIdRaw: null
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 49,
    optionId: 2,
    optionIdRaw: null
  }
];

export const allOptionsManyExpect = [
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 102,
    option: 772,
    rankedChoiceOption: [4, 3]
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 101,
    option: 1025,
    rankedChoiceOption: [1, 4]
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 96,
    option: 2,
    rankedChoiceOption: null
  },
  {
    voter: '0xa',
    blockTimestamp: 60321321,
    pollId: 49,
    option: 2,
    rankedChoiceOption: null
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 102,
    option: 772,
    rankedChoiceOption: [4, 3]
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 101,
    option: 1025,
    rankedChoiceOption: [1, 4]
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 96,
    option: 2,
    rankedChoiceOption: null
  },
  {
    voter: '0xb',
    blockTimestamp: 60321321,
    pollId: 49,
    option: 2,
    rankedChoiceOption: null
  }
];

export const dummyMkrVotedByAddress = [
  {
    voter: '0x14a4ed2000ca405452c140e21c10b3536c1a98e4',
    optionId: 1,
    optionIdRaw: '1',
    mkrSupport: '239.500000000000000000'
  },
  {
    voter: '0x87e6888935180a9b27a9b48b75c9b779bfec1f76',
    optionId: 0,
    optionIdRaw: '0',
    mkrSupport: '1480.609359492058691716'
  }
];

export const mkrVotedByAddressExpect = [
  {
    voter: '0x14a4ed2000ca405452c140e21c10b3536c1a98e4',
    optionId: 1,
    optionIdRaw: '1',
    mkrSupport: '239.500000000000000000',
    rankedChoiceOption: [1]
  },
  {
    voter: '0x87e6888935180a9b27a9b48b75c9b779bfec1f76',
    optionId: 0,
    optionIdRaw: '0',
    mkrSupport: '1480.609359492058691716',
    rankedChoiceOption: []
  }
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
  },
  numVoters: 3
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
  },
  numVoters: 3
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
  },
  numVoters: 4
};

export const dummyBallotDontMoveToEliminated = [
  {
    mkrSupport: '60.025000000000000000',
    ballot: createBallot([1, 3])
  },
  {
    mkrSupport: '102.598801867883985831',
    ballot: createBallot([3, 1])
  },
  {
    mkrSupport: '54.068823529411764706',
    // option 4 should never get these votes since it's eliminated in the first round
    ballot: createBallot([2, 4])
  },
  {
    mkrSupport: '4',
    ballot: createBallot([4, 1])
  }
];

export const dummyBallotDontMoveToEliminatedExpect = {
  rounds: 4,
  winner: '3',
  totalMkrParticipation: '220.692625397295750537',
  options: {
    '1': {
      firstChoice: '60.025',
      transfer: '-56.025',
      winner: false,
      eliminated: true
    },
    '2': {
      firstChoice: '54.068823529411764706',
      transfer: '0',
      winner: false,
      eliminated: true
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
  },
  numVoters: 4
};

// round 1
// option 1: 101, option 2: 100, option 3: 50, option 4: 49, total: 300
// round 2
// option 1: 101, option 2: 100, option 3: 99, option 4: 0, total: 300
// round 3
// option 1: 101, option 2: 100, option 3: 0, option 4: 0, total: 300
// round 4
// option 1: 201, option 2: 0, option 3: 0, option 4: 0, total: 300
// winner: option 1
export const dummyBallotStopWhenOneRemains = [
  {
    mkrSupport: '101',
    ballot: createBallot([1])
  },
  {
    mkrSupport: '100',
    ballot: createBallot([2, 1])
  },
  {
    mkrSupport: '50',
    ballot: createBallot([3])
  },
  {
    mkrSupport: '49',
    ballot: createBallot([4, 3])
  }
];

export const dummyBallotStopWhenOneRemainsExpect = {
  rounds: 4,
  winner: '1',
  totalMkrParticipation: '300',
  options: {
    '1': {
      firstChoice: '101',
      transfer: '100',
      winner: true,
      eliminated: false
    },
    '2': {
      firstChoice: '100',
      transfer: '-100',
      winner: false,
      eliminated: true
    },
    '3': {
      firstChoice: '50',
      transfer: '49',
      winner: false,
      eliminated: true
    },
    '4': {
      firstChoice: '49',
      transfer: '-49',
      winner: false,
      eliminated: true
    }
  },
  numVoters: 4
};
