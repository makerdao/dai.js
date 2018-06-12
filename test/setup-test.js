import Web3ServiceList from '../src/utils/Web3ServiceList';

beforeEach(() => {
  jest.setTimeout(10000);
});

afterEach(() => {
  Web3ServiceList.disconnectAll();
});
