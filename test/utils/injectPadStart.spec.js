import injectPadStart from '../../src/utils/injectPadStart';

test('Injecting padStart should make the function available in older versions of node', done => {
  injectPadStart();

  expect('0'.padStart(3, 0)).toBe('000');
  done();
});