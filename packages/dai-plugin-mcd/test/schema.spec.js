import { mcdMaker } from './helpers';
import { ETH } from '../src';
import { takeSnapshot, restoreSnapshot } from '@makerdao/test-helpers';
import schemas, { totalEncumberedDebt } from '../src/schema';
import { first } from 'rxjs/operators';

let service, maker, watcher, snapshotData;

beforeAll(async () => {
  maker = await mcdMaker({
    cdpTypes: [{ currency: ETH, ilk: 'ETH-A' }],
    multicall: true
  });
  service = maker.service('multicall');
  watcher = service.createWatcher({ interval: 'block' });
  service.registerSchemas(schemas);
  snapshotData = await takeSnapshot(maker);
});

afterAll(async () => {
  await restoreSnapshot(snapshotData, maker);
});

test('totalEncumberedDebt', async () => {
  const totalEncumberedDebt$ = service.watchObservable(
    totalEncumberedDebt,
    'ETH-A'
  );
  const res = await totalEncumberedDebt$.pipe(first()).toPromise();
  console.log(res);
  // res not returned, hangs
});
