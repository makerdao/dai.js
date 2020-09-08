import QueryApi from '../src/QueryApiScd';

test('getCdpIdsForOwner on mainnet', async () => {
  const q = new QueryApi();
  const ids = await q.getCdpIdsForOwner(
    '0xCd5f8fa45E0cA0937F86006B9eE8fE1eEdEe5FC4'
  );
  expect(ids.includes(1)).toBeTruthy();
});
