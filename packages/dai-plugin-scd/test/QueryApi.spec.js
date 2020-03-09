import QueryApi from '../src/QueryApi';

test('getCdpIdsForOwner on kovan', async () => {
  const q = new QueryApi('kovan');
  const ids = await q.getCdpIdsForOwner(
    '0x90d01f84f8db06d9af09054fe06fb69c1f8ee9e9'
  );
  expect(ids).toEqual([4756]);
});
