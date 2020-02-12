// this is split out from the other GasService tests in order to mock fetching

import { buildTestService } from '../helpers/serviceBuilders';
import fetch from 'isomorphic-fetch';
import { API_URL } from '../../src/eth/GasService';

jest.mock('isomorphic-fetch', () => jest.fn());

test('apiKey setting', async () => {
  fetch.mockReturnValue(
    new Promise(res =>
      res({
        json: () => ({ mock: true })
      })
    )
  );
  const service = buildTestService('gas', {
    gas: {
      apiKey: 'foo'
    }
  });
  await service.manager().authenticate();
  expect(fetch).toBeCalledWith(API_URL + 'foo');
});
