import Maker from '../src';
import ConfigFactory from '../src/config/ConfigFactory';
import { LocalService } from '@makerdao/services-core';

beforeEach(() => {
  jest.spyOn(ConfigFactory, 'create');
  ConfigFactory.create.mockClear();
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
      return {};
    }),
    afterCreate: jest.fn((maker, config) => {
      expect(maker).toBeInstanceOf(Maker);
    })
  };

  await Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false,
    foo: 3
  });

  expect(testPlugin.addConfig).toBeCalled();
  expect(testPlugin.afterCreate).toBeCalled();
  expect(ConfigFactory.create).toBeCalled();
  expect(ConfigFactory.create.mock.calls[0][1]).toEqual({
    autoAuthenticate: false,
    foo: 3
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
  expect(ConfigFactory.create.mock.calls[0][1]).toEqual({
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

test('plugin override rules', async () => {
  const exampleAbi = {
    name: 'coldMap',
    inputs: [{ name: 'inputA', type: 'address' }]
  };

  const exampleUserConfigAbi = {
    name: 'coldMap',
    inputs: [
      { name: 'inputA', type: 'address' },
      { name: 'inputB', type: 'uint256' }
    ]
  };

  const testPlugin1 = {
    addConfig: () => ({
      smartContract: {
        addContracts: {
          TUB: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5tub1',
            abi: [exampleAbi]
          },
          TAP: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5tap1'
          },
          TOP: {
            address: '0xbeefed1bedded2dabbed3defaced4decade5top1',
            abi: [exampleAbi]
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
            address: '0xbeefed1bedded2dabbed3defaced4decade5tub2',
            abi: [exampleAbi]
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

  const maker = await Maker.create('test', {
    provider: { url: 'http://localhost:2000' },
    plugins: [testPlugin1, testPlugin2],
    smartContract: {
      addContracts: {
        FOO: {
          address: '0xbeefed1bedded2dabbed3defaced4decade5foo3'
        },
        TOP: {
          address: '0xbeefed1bedded2dabbed3defaced4decade5top3',
          abi: [exampleUserConfigAbi]
        }
      }
    }
  });

  const configFactoryCall = ConfigFactory.create.mock.calls[0][1];
  const addContractsResult = configFactoryCall.smartContract.addContracts;

  // User supplied overrides all
  const fooExpected = '0xbeefed1bedded2dabbed3defaced4decade5foo3';
  const topExpected = '0xbeefed1bedded2dabbed3defaced4decade5top3';
  // 2nd plugin overrides the 1st
  const tubExpected = '0xbeefed1bedded2dabbed3defaced4decade5tub2';
  const barExpected = '0xbeefed1bedded2dabbed3defaced4decade5bar2';
  // No overrides for this one from 1st plugin
  const tapExpected = '0xbeefed1bedded2dabbed3defaced4decade5tap1';
  const scs = maker.service('smartContract');
  expect(addContractsResult['FOO'].address).toBe(fooExpected);
  expect(scs.getContractAddress('TOP')).toBe(topExpected);
  expect(scs.getContractAddress('TUB')).toBe(tubExpected);
  expect(addContractsResult['BAR'].address).toBe(barExpected);
  expect(scs.getContractAddress('TAP')).toBe(tapExpected);

  // Duplicate ABIs don't concat array properties
  expect(addContractsResult['TUB'].abi).toEqual([exampleAbi]);
  // User supplied ABIs take precedence
  expect(addContractsResult['TOP'].abi).toEqual([exampleUserConfigAbi]);

  // All user config options will be preserved
  expect(configFactoryCall.provider.url).toBe('http://localhost:2000');
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

  //beforeCreate and addConfig plugins can modify the maker config
  expect(ConfigFactory.create.mock.calls[0][1]).toEqual({
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
  expect(ConfigFactory.create.mock.calls[0][1]).toEqual({
    autoAuthenticate: false,
    testOption: 'myOption'
  });
});

test('reject bad plugin config', async () => {
  let message;
  try {
    await Maker.create('test', {
      plugins: [
        () => {},
        { beforeCreate: () => {} },
        [{ addConfig: () => {} }, { foo: 1 }],
        [{}, {}]
      ]
    });
  } catch (err) {
    message = err.message;
  }
  expect(message).toEqual('plugins[3] does not seem to be a plugin');
});
