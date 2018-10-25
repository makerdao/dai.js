import Maker from '../src';
import ConfigFactory from '../src/config/ConfigFactory';

beforeEach(() => {
  jest.spyOn(ConfigFactory, 'create');
});

test('function plugin', () => {
  const testPlugin = jest.fn(maker => {
    expect(maker).toBeInstanceOf(Maker);
  });

  Maker.create('test', { plugins: [testPlugin], autoAuthenticate: false });
  expect(testPlugin).toBeCalled();
});

test('object plugin with addConfig and afterCreate', () => {
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

  Maker.create('test', {
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
  class MockService extends Maker.LocalService {
    constructor(name = role) {
      super(name, []);
    }
  }

  return MockService;
};

test('add options, merging correctly', () => {
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

  Maker.create('test', {
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

test('do not allow collisions in smartContract.addContracts', () => {
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

  expect(() => {
    Maker.create('test', {
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
    });
  }).toThrowError(/Contracts "foo", "bar" cannot be defined more than once/);
  // note that "baz" is not in this list
});

test('add options when smartContract.addContracts is not set on target', () => {
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

  Maker.create('test', {
    plugins: [testPlugin],
    autoAuthenticate: false,
    smartContract: {}
  });
});

test('add options when smartContract.addContracts is not set on source', () => {
  const testPlugin = {
    addConfig: jest.fn(() => {
      return {
        smartContract: {}
      };
    })
  };

  Maker.create('test', {
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
