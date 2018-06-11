import ObjectWrapper from '../../src/utils/ObjectWrapper';

test('should call wrapper object handlers', done => {
  const calls = [],
    innerObject = {
      a: 10,
      f: function(x) {
        return this.a + x;
      },
      g: x => x * x
    },
    handlers = {
      onCall: (...args) => calls.push(['onCall'].concat(args)),
      afterCall: (...args) => calls.push(['afterCall'].concat(args)),
      onGet: (...args) => calls.push(['onGet'].concat(args)),
      afterGet: (...args) => calls.push(['afterGet'].concat(args)),
      onSet: (...args) => calls.push(['onSet'].concat(args)),
      afterSet: (...args) => calls.push(['afterSet'].concat(args))
    },
    wrapper = ObjectWrapper.addWrapperInterface(
      {},
      innerObject,
      [],
      true,
      true,
      true,
      handlers
    );

  wrapper.setA(wrapper.getA() + 1);
  wrapper.f(10);
  wrapper.g(20);

  expect(calls).toEqual([
    ['onGet', 'a'],
    ['afterGet', 'a', 10],
    ['onSet', 'a', 11],
    ['afterSet', 'a', 11, wrapper],
    ['onCall', 'f', [10]],
    ['afterCall', 'f', [10], 21],
    ['onCall', 'g', [20]],
    ['afterCall', 'g', [20], 400]
  ]);

  done();
});
