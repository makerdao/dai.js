import QueryApi from '../src/QueryApi';

test('getPriceHistoryForPip on kovan', async () => {
  const q = new QueryApi('kovan');
  console.log('q', q);
  const val = await q.getPriceHistoryForPip(
    '0x8C73Ec0fBCdEC6b8C060BC224D94740FD41f3774'
  );
  console.log('val', val);
});
