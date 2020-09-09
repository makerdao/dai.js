import QueryApi from '../src/QueryApiScd';

test('getCdpIdsForOwner on mainnet', async () => {
  const q = new QueryApi('mainnet');
  const ids = await q.getCdpIdsForOwner(
    '0xa464c0873368367778f2981eA1e65E5DC646bb9e'
  );
  expect(ids).toEqual([30]);
});
