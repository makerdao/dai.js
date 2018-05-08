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

test('should get a contract\'s public constant member values in a state object', done => {
  const service = SmartContractService.buildTestService();
  service.manager().authenticate()
    .then(() => service.getContractState(contracts.SAI_MOM))
    .then(r => {
      expect(r).toEqual({
        __self: '0x603d52d6ae2b98a49f8f32817ad4effe7e8a2502; SAI_MOM',
        authority: '0x4986C24C7f752C2ac2D738F1270639Dd9E9D7BF5',
        tub: '0xE82CE3D6Bf40F2F9414C8d01A35E3d9eb16a1761; SAI_TUB',
        vox: '0xE16bf7AaFeB33cC921d6D311E0ff33C4faA836dD; SAI_VOX',
        owner: '0x0000000000000000000000000000000000000000',
        tap: '0x6896659267C3C9FD055d764327199A98E571e00D; SAI_TAP'
      });
      done();
    });
});

test('should support recursive smart contract state inspection', done => {
  const service = SmartContractService.buildTestService();
  service.manager().authenticate()
    .then(() => service.getContractState(contracts.SAI_TOP, 5, true, []))
    .then(top => {
      expect(top.tub.gem.symbol).toEqual('WETH');
      done();
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

