import { contractInfo } from '../../contracts/networks';

test('kovan contract info', () => {
  expect(contractInfo('kovan')).toMatchSnapshot();
});

test('mainnet contract info', () => {
  expect(contractInfo('mainnet')).toMatchSnapshot();
});

test('testnet contract info', () => {
  expect(contractInfo('test')).toMatchSnapshot();
});
