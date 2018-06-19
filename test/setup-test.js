import Web3ServiceList from '../src/utils/Web3ServiceList';
import { resetCache } from './helpers/serviceBuilders';

// beforeAll(() => {
//   resetCache();
// });

beforeEach(() => {
  jest.setTimeout(10000);
});

afterEach(() => {
  return Web3ServiceList.disconnectAll();
});
