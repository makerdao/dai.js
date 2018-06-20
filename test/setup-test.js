import Web3ServiceList from '../src/utils/Web3ServiceList';

beforeEach(() => {
  jest.setTimeout(10000);
});

afterEach(() => {
  return Web3ServiceList.disconnectAll();
});
