import QueryApi from '../src/QueryApi';

test('getCdpIdsForOwner on kovan', async () => {
  const q = new QueryApi('kovan');
  const ids = await q.getCdpIdsForOwner(
    '0x90d01F84F8Db06d9aF09054Fe06fb69C1f8ee9E9'
  );
  expect(ids).toEqual([4756, 1821]);
});
