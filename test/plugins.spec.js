import Maker from '../src';
import ConfigFactory from '../src/config/ConfigFactory';
import { LocalService } from '@makerdao/services-core';

beforeEach(() => {
  jest.spyOn(ConfigFactory, 'create');
});

test('function plugin', async () => {
  const testPlugin = jest.fn(maker => {
    expect(maker).toBeInstanceOf(Maker);
  });

  await Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false
  });
  expect(testPlugin).toBeCalled();
});

test('object plugin with addConfig and afterCreate', async () => {
  const testPlugin = {
    addConfig: jest.fn(config => {
      expect(config.autoAuthenticate).toBe(false);
      expect(config.log).toBe(false);
      return {};
    }),
    afterCreate: jest.fn((maker, config) => {
      expect(maker).toBeInstanceOf(Maker);
      expect(config.log).toBe(false);
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false,
    log: false
  });

  expect(testPlugin.addConfig).toBeCalled();
  expect(testPlugin.afterCreate).toBeCalled();
  expect(ConfigFactory.create).toBeCalled();
  expect(ConfigFactory.create.mock.calls[0][1]).toEqual({
    autoAuthenticate: false
  });
});

const makeMockService = role => {
  class MockService extends LocalService {
    constructor(name = role) {
      super(name, []);
    }
  }

  return MockService;
};

test('add options, merging correctly', async () => {
  const MockService1 = makeMockService('mock1');
  const MockService2 = makeMockService('mock2');

  const testPlugin = {
    addConfig: jest.fn(() => {
      return {
        additionalServices: ['mock2'],
        mock2: MockService2,
        smartContract: {
          addContracts: {
            foo: {
              abi: [],
              address: '0xbeefed1bedded2dabbed3defaced4decade5bead'
            }
          }
        }
      };
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    additionalServices: ['mock1'],
    mock1: MockService1,
    autoAuthenticate: false,
    smartContract: {
      addContracts: {
        bar: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5feed'
        }
      }
    }
  });

  expect(testPlugin.addConfig).toBeCalled();
  expect(ConfigFactory.create).toBeCalled();
  const last = ConfigFactory.create.mock.calls.length - 1;
  expect(ConfigFactory.create.mock.calls[last][1]).toEqual({
    additionalServices: ['mock1', 'mock2'],
    mock1: MockService1,
    mock2: MockService2,
    autoAuthenticate: false,
    smartContract: {
      addContracts: {
        foo: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5bead'
        },
        bar: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5feed'
        }
      }
    }
  });
});

test('do not allow collisions in smartContract.addContracts', async () => {
  const exampleAbiItem = {
    constant: true,
    inputs: [],
    name: 'test',
    outputs: [
      {
        name: '',
        type: 'address'
      }
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function'
  };

  const testPlugin = {
    addConfig: () => ({
      smartContract: {
        addContracts: {
          foo: {
            abi: [],
            address: '0xbeefed1bedded2dabbed3defaced4decade5feed'
          },
          bar: {
            abi: [exampleAbiItem],
            address: '0xbeefed1bedded2dabbed3defaced4decade5bade'
          },
          baz: {
            abi: [],
            address: '0xbeefed1bedded2dabbed3defaced4decade5abed'
          }
        }
      }
    })
  };

  expect.assertions(1);

  await Maker.create('test', {
    autoAuthenticate: false,
    plugins: [testPlugin],
    smartContract: {
      addContracts: {
        // different address
        foo: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5bead'
        },
        // different ABI
        bar: {
          abi: [{ ...exampleAbiItem, name: 'zest' }],
          address: '0xbeefed1bedded2dabbed3defaced4decade5bade'
        },
        // same address and ABI -- will not cause error
        baz: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5abed'
        }
      }
    }
  }).catch(
    err =>
      expect(err).toEqual(
        new Error('Contracts "foo", "bar" cannot be defined more than once')
      )
    // note that "baz" is not in this list
  );
});

test('add options when smartContract.addContracts is not set on target', async () => {
  const testPlugin = {
    addConfig: jest.fn(() => {
      return {
        smartContract: {
          addContracts: {
            foo: {
              abi: [],
              address: '0xbeefed1bedded2dabbed3defaced4decade5bead'
            }
          }
        }
      };
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false,
    smartContract: {}
  });
});

test('add options when smartContract.addContracts is not set on source', async () => {
  const testPlugin = {
    addConfig: jest.fn(() => {
      return {
        smartContract: {}
      };
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    additionalServices: ['mock1'],
    autoAuthenticate: false,
    smartContract: {
      addContracts: {
        foo: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5bead'
        }
      }
    }
  });
});

test('each plugin type can be created with an optional options object for additional processing', async () => {
  const MockService1 = makeMockService('mock1');
  const MockService2 = makeMockService('mock2');

  const beforeCreatePlugin = {
    beforeCreate: jest.fn(options => {
      expect(options.testOption1).toBe('myOption1');
      return {
        additionalServices: ['mock1'],
        mock1: MockService1,
        testOption1: options.testOption1
      };
    })
  };

  const addConfigPlugin = {
    addConfig: jest.fn((config, options) => {
      expect(options.testOption2).toBe('myOption2');
      return {
        additionalServices: ['mock2'],
        mock2: MockService2,
        testOption2: options.testOption2
      };
    })
  };

  const afterCreatePlugin = {
    afterCreate: jest.fn((maker, config, options) => {
      expect(options.testOption3).toBe('myOption3');
    })
  };

  const functionPlugin = jest.fn((maker, config, options) => {
    const gasEstimatorService = maker.service('gasEstimator', true);
    gasEstimatorService.setPercentage(options.percentage);
    const percentage = gasEstimatorService.getPercentage();
    expect(percentage).toBe(options.percentage);
  });

  await Maker.create('test', {
    plugins: [
      [addConfigPlugin, { testOption2: 'myOption2' }],
      [beforeCreatePlugin, { testOption1: 'myOption1' }],
      [functionPlugin, { percentage: 10 }],
      [afterCreatePlugin, { testOption3: 'myOption3' }]
    ],
    autoAuthenticate: false
  });

  expect(addConfigPlugin.addConfig).toBeCalled();
  expect(beforeCreatePlugin.beforeCreate).toBeCalled();
  expect(afterCreatePlugin.afterCreate).toBeCalled();
  expect(functionPlugin).toBeCalled();
  expect(ConfigFactory.create).toBeCalled();
  const last = ConfigFactory.create.mock.calls.length - 1;

  //beforeCreate and addConfig plugins can modify the maker config
  expect(ConfigFactory.create.mock.calls[last][1]).toEqual({
    additionalServices: ['mock1', 'mock2'],
    mock1: MockService1,
    mock2: MockService2,
    autoAuthenticate: false,
    testOption1: 'myOption1',
    testOption2: 'myOption2'
  });
});

test('object plugin with beforeCreate can make an async call', async () => {
  const mockAsyncCall = async () => {
    return new Promise(resolve => {
      setTimeout(50);
      resolve({ testOption: 'myOption' });
    });
  };

  const testPlugin = {
    beforeCreate: jest.fn(async () => {
      return await mockAsyncCall();
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false
  });

  expect(testPlugin.beforeCreate).toBeCalled();
  expect(ConfigFactory.create).toBeCalled();
  const last = ConfigFactory.create.mock.calls.length - 1;
  expect(ConfigFactory.create.mock.calls[last][1]).toEqual({
    autoAuthenticate: false,
    testOption: 'myOption'
  });
});
