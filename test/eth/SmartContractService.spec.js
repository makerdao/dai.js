import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import SmartContractService from '../../src/eth/SmartContractService';

test('getContractByName should have proper error checking', done => {
  const service = SmartContractService.buildTestService();

  expect(() => service.getContractByName('NOT_A_CONTRACT')).toThrow('Provided name "NOT_A_CONTRACT" is not a contract');
  expect(() => service.getContractByName(contracts.SAI_TOP, 999)).toThrow('Cannot resolve network ID. Are you connected?');

  service.manager().authenticate().then(() => {
    expect(() => service.getContractByName(contracts.SAI_TOP, 999)).toThrow('Cannot find version 999 of contract SAI_TOP');
    done();
  });
});

test('getContractByName should return a functioning contract', done => {
  const service = SmartContractService.buildTestService();
  service.manager().authenticate().then(() => {
    // Read the PETH address by calling TOP.skr(). Confirm that it's the same as the configured address.
    service.getContractByName(contracts.SAI_TOP).gem().then(
      data => {
        expect(data.toString().toUpperCase())
          .toEqual(service.getContractByName(tokens.WETH).address.toUpperCase());
        done();
      }
    );
  });
});

test('should convert from bytes32 to a javascript number', () => {
  const bytes32 = '0x000000000000000000000000000000000000000000000000000000000000005c';
  const service = SmartContractService.buildTestService();
  
  service.manager().authenticate().then(() => {
    expect(service.bytes32ToNumber(bytes32)).toBe(92);
  });
});

test('should convert from a javascript number to bytes32', () => {
  const num = 92;
  const service = SmartContractService.buildTestService();

  service.manager().authenticate().then(() => {
    expect(service.numberToBytes32(num)).toBe('0x000000000000000000000000000000000000000000000000000000000000005c');
  });
});

