import ServiceBase from '../../src/core/ServiceBase';
import ServiceType from '../../src/core/ServiceType';
import ServiceManager from '../../src/core/ServiceManager';
import ServiceState from '../../src/core/ServiceState';

const serviceName = 'MyService';

test('constructor() should reject invalid type names', () => {
  expect(() => new ServiceBase('INVALID_TYPE', serviceName)).toThrow(
    'Invalid ServiceType: INVALID_TYPE'
  );
});

test('constructor() should define the right lifecycle methods', () => {
  const s = {
    LOCAL: new ServiceBase(ServiceType.LOCAL, serviceName),
    PUBLIC: new ServiceBase(ServiceType.PUBLIC, serviceName),
    PRIVATE: new ServiceBase(ServiceType.PRIVATE, serviceName)
  };

  expect(typeof s.LOCAL.initialize).toBe('function');
  expect(typeof s.LOCAL.connect).toBe('undefined');
  expect(typeof s.LOCAL.disconnect).toBe('undefined');
  expect(typeof s.LOCAL.authenticate).toBe('undefined');
  expect(typeof s.LOCAL.deauthenticate).toBe('undefined');

  expect(typeof s.PUBLIC.initialize).toBe('function');
  expect(typeof s.PUBLIC.connect).toBe('function');
  expect(typeof s.PUBLIC.disconnect).toBe('function');
  expect(typeof s.PUBLIC.authenticate).toBe('undefined');
  expect(typeof s.PUBLIC.deauthenticate).toBe('undefined');

  expect(typeof s.PRIVATE.initialize).toBe('function');
  expect(typeof s.PRIVATE.connect).toBe('function');
  expect(typeof s.PRIVATE.disconnect).toBe('function');
  expect(typeof s.PRIVATE.authenticate).toBe('function');
  expect(typeof s.PRIVATE.deauthenticate).toBe('function');
});

test('get() should return injected services', () => {
  const dep = new ServiceBase(ServiceType.LOCAL, 'dep'),
    svc = new ServiceBase(ServiceType.LOCAL, 'svc', ['dep']);

  svc.manager().inject('dep', dep);
  expect(svc.get('dep')).toBe(dep);
});

test('initialize(), connect(), authenticate() should throw when called directly instead of by the manager', done => {
  const svc = new ServiceBase(ServiceType.PRIVATE, 'svc');

  expect(() => svc.initialize()).toThrow(
    'Expected state INITIALIZING, but got CREATED. Did you mean to call service.manager().initialize() instead of service.initialize()?'
  );

  svc
    .manager()
    .initialize()
    .then(() => {
      expect(() => svc.connect()).toThrow(
        'Expected state CONNECTING, but got OFFLINE. Did you mean to call service.manager().connect() instead of service.connect()?'
      );

      svc
        .manager()
        .connect()
        .then(() => {
          expect(() => svc.authenticate()).toThrow(
            'Expected state AUTHENTICATING, but got ONLINE. Did you mean to call service.manager().authenticate() instead of service.authenticate()?'
          );

          done();
        });
    });
});

test('manager() should return the service manager', () => {
  const s = {
    LOCAL: new ServiceBase(ServiceType.LOCAL, serviceName),
    PUBLIC: new ServiceBase(ServiceType.PUBLIC, serviceName),
    PRIVATE: new ServiceBase(ServiceType.PRIVATE, serviceName)
  };

  expect(s.LOCAL.manager()).toBeInstanceOf(ServiceManager);
  expect(s.PUBLIC.manager()).toBeInstanceOf(ServiceManager);
  expect(s.PRIVATE.manager()).toBeInstanceOf(ServiceManager);
});

test('manager() should have the right service type, name, and dependencies', () => {
  const s = {
    LOCAL: new ServiceBase(ServiceType.LOCAL, 'LocalService', ['L1', 'L2']),
    PUBLIC: new ServiceBase(ServiceType.PUBLIC, 'PublicService', [
      'PUB1',
      'PUB2'
    ]),
    PRIVATE: new ServiceBase(ServiceType.PRIVATE, 'PrivateService', [
      'PRV1',
      'PRV2'
    ])
  };

  expect(s.LOCAL.manager().type()).toBe(ServiceType.LOCAL);
  expect(s.LOCAL.manager().name()).toBe('LocalService');
  expect(s.LOCAL.manager().dependencies()).toEqual(['L1', 'L2']);

  expect(s.PUBLIC.manager().type()).toBe(ServiceType.PUBLIC);
  expect(s.PUBLIC.manager().name()).toBe('PublicService');
  expect(s.PUBLIC.manager().dependencies()).toEqual(['PUB1', 'PUB2']);

  expect(s.PRIVATE.manager().type()).toBe(ServiceType.PRIVATE);
  expect(s.PRIVATE.manager().name()).toBe('PrivateService');
  expect(s.PRIVATE.manager().dependencies()).toEqual(['PRV1', 'PRV2']);
});

test('manager().initialize() should call the initialize() method of the service and its dependencies', done => {
  let checkpoint = 0;
  const dep = new ServiceBase(ServiceType.LOCAL, 'dep'),
    svc = new ServiceBase(ServiceType.LOCAL, 'svc', ['dep']);

  dep.initialize = () => checkpoint++;
  svc.initialize = () => checkpoint++;

  svc
    .manager()
    .inject('dep', dep)
    .initialize()
    .then(() => {
      expect(dep.manager().state()).toBe(ServiceState.READY);
      expect(svc.manager().state()).toBe(ServiceState.READY);
      expect(checkpoint).toBe(2);
      done();
    });
});

test('manager().connect() should call the connect() method of the service and its dependencies', done => {
  let checkpoint = 0;
  const dep = new ServiceBase(ServiceType.PUBLIC, 'dep'),
    svc = new ServiceBase(ServiceType.PUBLIC, 'svc', ['dep']);

  dep.initialize = () => checkpoint++;
  svc.initialize = () => checkpoint++;
  dep.connect = () => checkpoint++;
  svc.connect = () => checkpoint++;

  svc
    .manager()
    .inject('dep', dep)
    .connect()
    .then(() => {
      expect(dep.manager().state()).toBe(ServiceState.READY);
      expect(svc.manager().state()).toBe(ServiceState.READY);
      expect(checkpoint).toBe(4);
      done();
    });
});

test('manager().authenticate() should call the authenticate() method of the service and its dependencies', done => {
  let checkpoint = 0;
  const dep = new ServiceBase(ServiceType.PRIVATE, 'dep'),
    svc = new ServiceBase(ServiceType.PRIVATE, 'svc', ['dep']);

  dep.initialize = () => checkpoint++;
  svc.initialize = () => checkpoint++;
  dep.connect = () => checkpoint++;
  svc.connect = () => checkpoint++;
  dep.authenticate = () => checkpoint++;
  svc.authenticate = () => checkpoint++;

  svc
    .manager()
    .inject('dep', dep)
    .authenticate()
    .then(() => {
      expect(dep.manager().state()).toBe(ServiceState.READY);
      expect(svc.manager().state()).toBe(ServiceState.READY);
      expect(checkpoint).toBe(6);
      done();
    });
});

test('disconnecting a dependency should disconnect the dependency and all its depending services', done => {
  const dep = new ServiceBase(ServiceType.PUBLIC, 'dep'),
    svc = new ServiceBase(ServiceType.PUBLIC, 'svc', ['dep']),
    svc2 = new ServiceBase(ServiceType.PUBLIC, 'svc2', ['dep']);

  svc.manager().inject('dep', dep);
  svc2.manager().inject('dep', dep);

  Promise.all([svc.manager().connect(), svc2.manager().connect()]).then(() => {
    expect(dep.manager().state()).toBe(ServiceState.READY);
    expect(svc.manager().state()).toBe(ServiceState.READY);
    expect(svc2.manager().state()).toBe(ServiceState.READY);

    expect(typeof dep.disconnect).toBe('function');
    expect(typeof svc.disconnect).toBe('function');
    expect(typeof svc2.disconnect).toBe('function');

    dep.disconnect();
    expect(dep.manager().state()).toBe(ServiceState.OFFLINE);
    expect(svc.manager().state()).toBe(ServiceState.OFFLINE);
    expect(svc2.manager().state()).toBe(ServiceState.OFFLINE);

    // Check that reconnecting one service will reconnect the dependency, but not the second depending service
    svc
      .manager()
      .connect()
      .then(() => {
        expect(dep.manager().state()).toBe(ServiceState.READY);
        expect(svc.manager().state()).toBe(ServiceState.READY);
        expect(svc2.manager().state()).toBe(ServiceState.OFFLINE);

        done();
      });
  });
});

test('deauthenticating a dependency should deauthenticate the dependency and all its depending services', done => {
  const dep = new ServiceBase(ServiceType.PRIVATE, 'dep'),
    svc = new ServiceBase(ServiceType.PRIVATE, 'svc', ['dep']),
    svc2 = new ServiceBase(ServiceType.PRIVATE, 'svc2', ['dep']);

  svc.manager().inject('dep', dep);
  svc2.manager().inject('dep', dep);

  Promise.all([
    svc.manager().authenticate(),
    svc2.manager().authenticate()
  ]).then(() => {
    expect(dep.manager().state()).toBe(ServiceState.READY);
    expect(svc.manager().state()).toBe(ServiceState.READY);
    expect(svc2.manager().state()).toBe(ServiceState.READY);

    expect(typeof dep.deauthenticate).toBe('function');
    expect(typeof svc.deauthenticate).toBe('function');
    expect(typeof svc2.deauthenticate).toBe('function');

    dep.deauthenticate();
    expect(dep.manager().state()).toBe(ServiceState.ONLINE);
    expect(svc.manager().state()).toBe(ServiceState.ONLINE);
    expect(svc2.manager().state()).toBe(ServiceState.ONLINE);

    // Check that reconnecting one service will reconnect the dependency, but not the second depending service
    svc
      .manager()
      .authenticate()
      .then(() => {
        expect(dep.manager().state()).toBe(ServiceState.READY);
        expect(svc.manager().state()).toBe(ServiceState.READY);
        expect(svc2.manager().state()).toBe(ServiceState.ONLINE);

        done();
      });
  });
});

class DummyService extends ServiceBase {
  /**
   * @param {string} name
   * @param {string[]} dependencies
   */
  constructor(name, dependencies = []) {
    super(ServiceType.LOCAL, name, dependencies);
  }
  initialize(settings) {
    this._type = settings.type;
  }
}

test('settings defined on ServiceManager need to be passed to initialize() correctly', done => {
  const s = new DummyService('DummyService');
  s.manager()
    .settings({ type: 1 })
    .initialize()
    .then(() => {
      expect(s._type).toBe(1);
      done();
    });
});
