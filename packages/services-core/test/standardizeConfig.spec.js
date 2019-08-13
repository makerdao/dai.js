import standardizeConfig from '../src/standardizeConfig';

test('accepts a constructor', () => {
  class FakeService {}
  const config = standardizeConfig('timer', FakeService);
  expect(config).toEqual([FakeService, {}]);
});

test('accepts a constructor + settings pair', () => {
  class FakeService {}
  const config = standardizeConfig('timer', [FakeService, { foo: 3 }]);
  expect(config).toEqual([FakeService, { foo: 3 }]);
});
