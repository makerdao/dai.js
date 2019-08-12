import ServiceProvider from '../src/ServiceProvider';
import LocalService from '../src/LocalService';

class FooService extends LocalService {
  constructor(name = 'foo') {
    super(name, []);
  }

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
});
