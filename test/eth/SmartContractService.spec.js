import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import {
  buildTestService,
  buildTestSmartContractService
} from '../helpers/serviceBuilders';
import addresses from '../../contracts/addresses/testnet';

test('getContractByName should have proper error checking', async () => {
  const service = buildTestSmartContractService();

  expect(() => service.getContractByName('NOT_A_CONTRACT')).toThrow(
    'No contract found for "NOT_A_CONTRACT"'
  );
  expect(() => service.getContractByName(contracts.SAI_TOP)).toThrow(
    'Cannot resolve network ID. Are you connected?'
  );

  await service.manager().authenticate();
  expect(() =>
    service.getContractByName(contracts.SAI_TOP, { version: 999 })
  ).toThrow(new Error('Cannot find contract SAI_TOP, version 999'));
});

test('getContractByName should return a functioning contract', async () => {
  const service = buildTestSmartContractService();
  await service.manager().authenticate();
  // Read the PETH address by calling TOP.skr(). Confirm that it's the same as the configured address.
  const gem = await service.getContractByName(contracts.SAI_TOP).gem();

  expect(gem.toString().toUpperCase()).toEqual(
    service.getContractByName(tokens.WETH).address.toUpperCase()
  );
});

test("should get a contract's public constant member values in a state object", async () => {
  const service = buildTestSmartContractService();
  await service.manager().authenticate();

  const state = await service.getContractState(contracts.SAI_MOM);
  expect(Object.keys(state)).toEqual([
    '__self',
    'tub',
    'vox',
    'owner',
    'authority',
    'tap'
  ]);
});

test('should support recursive smart contract state inspection', async () => {
  const service = buildTestSmartContractService();
  await service.manager().authenticate();
  const state = await service.getContractState(contracts.SAI_TOP, 5, true, []);
  expect(state.tub.gem.symbol).toEqual('WETH');
});

test('parameterized smart contract input', async () => {
  const mockContractDefinition = {
    address: '0xbeefed1bedded2dabbed3defaced4decade5dead',
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'foo',
        outputs: [{ name: '', type: 'bytes32' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ]
  };

  const service = buildTestService('smartContract', {
    smartContract: {
      addContracts: {
        mock: mockContractDefinition
      }
    }
  });

  await service.manager().authenticate();
  const contract = service.getContractByName('mock');
  expect(contract.address).toEqual(mockContractDefinition.address);
  expect(typeof contract.foo).toBe('function');
});

test('parameterized smart contract input with multiple addresses', async () => {
  const mockContractDefinition = {
    address: {
      testnet: '0xbeefed1bedded2dabbed3defaced4decade5dead',
      kovan: '0xbeefed1bedded2dabbed3defaced4decade5caca',
      mainnet: '0xbeefed1bedded2dabbed3defaced4decade5feed'
    },
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'foo',
        outputs: [{ name: '', type: 'bytes32' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ]
  };

  const service = buildTestService('smartContract', {
    smartContract: {
      addContracts: {
        mock: mockContractDefinition
      }
    }
  });

  await service.manager().authenticate();
  const contract = service.getContractByName('mock');
  expect(contract.address).toEqual(mockContractDefinition.address.testnet);
  expect(typeof contract.foo).toBe('function');
});

test('getContractByName returns contract with a valid signer', async () => {
  const service = buildTestSmartContractService();

  await service.manager().authenticate();
  const { signer } = service.getContractByName(contracts.SAI_TOP);
  expect(signer).toBeTruthy();
  expect(signer.provider).toBeTruthy();
});

test('call constant function without account', async () => {
  const service = buildTestSmartContractService();
  service.get('web3').get('accounts').hasAccount = jest.fn(() => false);

  await service.manager().authenticate();
  const contract = service.getContractByName(contracts.SAI_TOP);
  const gem = await contract.gem();
  expect(contract.signer).toBeNull();
  expect(gem.toLowerCase()).toEqual(addresses.GEM);
});
