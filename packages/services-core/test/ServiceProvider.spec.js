import ServiceProvider from '../src/ServiceProvider';
import LocalService from '../src/LocalService';

class FooService extends LocalService {
  static role = 'foo';

  initialize(settings) {
    this.settings = settings;
  }
}

class BarService extends LocalService {
  static role = 'bar';

  initialize(settings) {
    this.settings = settings;
  }
}

test('pass settings to service by role name', async () => {
  const config = {
    foo: { value: 77 }
  };

  const resolver = {
    services: { FooService },
    defaults: { foo: 'FooService' }
  };

  const provider = new ServiceProvider(config, resolver);
  const container = provider.buildContainer();
  const service = container.service('foo');
  await container.initialize();
  expect(service.settings).toEqual({ value: 77 });
  expect(provider.service('foo')).toEqual(service);
});

test('include dependencies', () => {
  class BarService extends LocalService {
    static role = 'bar';
    static dependencies = ['foo'];
  }

  const config = { bar: true };

  const resolver = {
    defaults: { foo: FooService, bar: BarService }
  };

  const provider = new ServiceProvider(config, resolver);
  expect(provider.service('foo')).toBeInstanceOf(FooService);
});

test('handle different service config formats', async () => {
  class Foo2Service extends FooService {}

  class BazService extends FooService {
    static role = 'baz';
  }

  class BonkService extends FooService {
    static role = 'bonk';
  }

  class QuxService extends FooService {
    static role = 'qux';
  }

  class QuzService extends FooService {
    static role = 'quz';
  }

  const config = {
    foo: new Foo2Service(),
    bar: BarService,
    qux: true,
    quz: 'QuzService',
    baz: [BazService, { foo: 7 }],
    bonk: [true, { foo: 8 }]
  };

  const resolver = {
    defaults: { bonk: BonkService, qux: QuxService },
    services: { QuzService }
  };

  const container = new ServiceProvider(config, resolver).buildContainer();
  await container.initialize();

  expect(container.service('foo')).toBeInstanceOf(Foo2Service);
  expect(container.service('bar')).toBeInstanceOf(BarService);
  expect(container.service('qux')).toBeInstanceOf(QuxService);
  expect(container.service('quz')).toBeInstanceOf(QuzService);

  const baz = container.service('baz');
  expect(baz).toBeInstanceOf(BazService);
  expect(baz.settings.foo).toEqual(7);

  const bonk = container.service('bonk');
  expect(bonk).toBeInstanceOf(BonkService);
  expect(bonk.settings.foo).toEqual(8);
});

test('catch role-name mismatch', () => {
  const provider = new ServiceProvider({ bar: FooService });

  expect(() => {
    provider.service('bar');
  }).toThrow('Role mismatch: "foo", "bar"');
});
