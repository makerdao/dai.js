import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import {
  buildTestService,
  buildTestSmartContractService
} from '../helpers/serviceBuilders';

test('getContractByName should have proper error checking', done => {
  const service = buildTestSmartContractService();

  expect(() => service.getContractByName('NOT_A_CONTRACT')).toThrow(
    'Provided name "NOT_A_CONTRACT" is not a contract'
  );
  expect(() => service.getContractByName(contracts.SAI_TOP)).toThrow(
    'Cannot resolve network ID. Are you connected?'
  );

  service
    .manager()
    .authenticate()
    .then(() => {
      expect(() =>
        service.getContractByName(contracts.SAI_TOP, { version: 999 })
      ).toThrow('Cannot find contract SAI_TOP, version 999');
      done();
    });
});

test('getContractByName should return a functioning contract', done => {
  const service = buildTestSmartContractService();
  service
    .manager()
    .authenticate()
    .then(() => {
      // Read the PETH address by calling TOP.skr(). Confirm that it's the same as the configured address.
      service
        .getContractByName(contracts.SAI_TOP)
        .gem()
        .then(data => {
          expect(data.toString().toUpperCase()).toEqual(
            service.getContractByName(tokens.WETH).address.toUpperCase()
          );
          done();
        });
    });
});

test("should get a contract's public constant member values in a state object", done => {
  const service = buildTestSmartContractService();
  service
    .manager()
    .authenticate()
    .then(() => service.getContractState(contracts.SAI_MOM))
    .then(r => {
      expect(r).toEqual({
        __self: '0x4bdf94bfb6e7c707a6cc4197cc45bed589a43bf9; SAI_MOM',
        authority: '0xBaCE01E69dBac1B95C43A24689854cbBf091e3B5',
        owner: '0x0000000000000000000000000000000000000000',
        tap: '0xFE728e121a1B6C48FC512754116CD2E5D91dc3b2; SAI_TAP',
        tub: '0xF926cCA78a9A33A2D3e197e6104665df7a8D5F93; SAI_TUB',
        vox: '0xD47e94f3cE71D15aabF274E3d9b7a484E1F91212; SAI_VOX'
      });
      done();
    });
});

test('should support recursive smart contract state inspection', done => {
  const service = buildTestSmartContractService();
  service
    .manager()
    .authenticate()
    .then(() => service.getContractState(contracts.SAI_TOP, 5, true, []))
    .then(top => {
      expect(top.tub.gem.symbol).toEqual('WETH');
      done();
    });
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
