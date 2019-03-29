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

test('plugins using addContracts property will override the previous one in sequential order; user-supplied config will override all', async () => {
  const testPlugin1 = {
    addConfig: () => ({
      smartContract: {
        addContracts: {
          TUB: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5tub1'
          },
          TAP: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5tap1'
          },
          TOP: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5top1'
          },
          FOO: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5foo1'
          }
        }
      }
    })
  };
  const testPlugin2 = {
    addConfig: () => ({
      provider: { url: 'pluginURL' },
      smartContract: {
        addContracts: {
          TUB: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5tub2'
          },
          BAR: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5bar2'
          },
          TOP: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5top2'
          }
        }
      }
    })
  };

  await Maker.create('test', {
    autoAuthenticate: false,
    provider: { url: 'userURL' },
    plugins: [testPlugin1, testPlugin2],
    smartContract: {
      addContracts: {
        FOO: {
          abi: [],
          address: '0xbeefed1bedded2dabbed3defaced4decade5foo3'
        },
        TOP: {
          address: '0xbeefed1bedded2dabbed3defaced4decade5top3'
        }
      }
    }
  });

  const last = ConfigFactory.create.mock.calls.length - 1;

  const addContractsResult =
    ConfigFactory.create.mock.calls[last][1].smartContract.addContracts;

  // User supplied overrides all
  const fooExpected = '0xbeefed1bedded2dabbed3defaced4decade5foo3';
  const topExpected = '0xbeefed1bedded2dabbed3defaced4decade5top3';
  // 2nd plugin overrides the 1st
  const tubExpected = '0xbeefed1bedded2dabbed3defaced4decade5tub2';
  const barExpected = '0xbeefed1bedded2dabbed3defaced4decade5bar2';
  // No overrides for this one from 1st plugin
  const tapExpected = '0xbeefed1bedded2dabbed3defaced4decade5tap1';

  expect(addContractsResult['FOO'].address).toBe(fooExpected);
  expect(addContractsResult['TOP'].address).toBe(topExpected);
  expect(addContractsResult['TUB'].address).toBe(tubExpected);
  expect(addContractsResult['BAR'].address).toBe(barExpected);
  expect(addContractsResult['TAP'].address).toBe(tapExpected);

  // All user config options will be preserved
  expect(ConfigFactory.create.mock.calls[last][1].provider.url).toBe('userURL');
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
    const gasService = maker.service('gas', true);
    gasService.multiplier = options.multiplier;
    expect(gasService.multiplier).toBe(options.multiplier);
  });

  await Maker.create('test', {
    plugins: [
      [addConfigPlugin, { testOption2: 'myOption2' }],
      [beforeCreatePlugin, { testOption1: 'myOption1' }],
      [functionPlugin, { multiplier: 10 }],
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
