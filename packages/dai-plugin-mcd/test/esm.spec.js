import { mcdMaker } from './helpers';

let maker;

beforeAll(async () => {
  maker = await mcdMaker();
});

test('ESM exists', () => {
  const esm = maker.service('smartContract').getContract('MCD_ESM');
  expect(esm.address).toBeTruthy();
});
