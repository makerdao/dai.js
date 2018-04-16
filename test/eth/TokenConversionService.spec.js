import TokenConversionService from '../../src/eth/TokenConversionService';

let createdTokenService;

beforeAll(() => {
  return createdTokenService = TokenConversionService.buildTestService();
});

test('should convert eth to weth', done => {
  createdTokenService.manager().authenticate().then(() => {
    createdTokenService.convertEthToWeth('0.1').then(result => {
      expect(result).toBeTruthy();
      done();
    });
  });
});

test('should convert weth to peth', done => {
  createdTokenService.manager().authenticate().then(() => {
    createdTokenService.convertEthToWeth('0.1').then(() => {
      createdTokenService.convertWethToPeth('0.1').then(result => {
        expect(result).toBeTruthy();
        done();
      });
    });
  });
});

test('should convert eth to peth', done => {
  createdTokenService.manager().authenticate().then(() => {
    createdTokenService.convertEthToPeth('0.1').then(result => {
      expect(result).toBeTruthy();
      done();
    });
  });
});
