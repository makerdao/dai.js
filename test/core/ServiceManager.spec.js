import ServiceManager, {
  UnknownDependencyError,
  DependencyNotResolvedError
} from '../../src/core/ServiceManager';

const name = 'IAmAService',
  _ = () => {};

test('should only mark objects with a method manager() returning a ServiceManager as valid', () => {
  expect(
    ServiceManager.isValidService({ manager: () => new ServiceManager(name) })
  ).toBe(true);
  expect(ServiceManager.isValidService(null)).toBe(false);
  expect(ServiceManager.isValidService({ manager: true })).toBe(false);
  expect(ServiceManager.isValidService({ manager: () => true })).toBe(false);
  expect(ServiceManager.isValidService({ manager: () => ({}) })).toBe(false);
});

test('should throw an error when no name is provided', () => {
  expect(() => new ServiceManager()).toThrow('Service name must not be empty.');
  expect(() => new ServiceManager('')).toThrow(
    'Service name must not be empty.'
  );
  expect(() => new ServiceManager(null)).toThrow(
    'Service name must not be empty.'
  );
});

test('should expose the provided service name through name()', () => {
  expect(new ServiceManager(name).name()).toBe('IAmAService');
});

test('should return an empty list of dependencies by default', () => {
  expect(new ServiceManager(name).dependencies()).toEqual([]);
});

test('should expose the provided dependencies through dependencies()', () => {
  expect(new ServiceManager(name, [name, name]).dependencies()).toEqual([
    name,
    name
  ]);
});

test('should have null dependencies after instantiation', () => {
  const serviceA = new ServiceManager('ServiceA', ['ServiceB', 'ServiceC']);
  expect(serviceA._injections.ServiceB).toBe(null);
  expect(serviceA._injections.ServiceC).toBe(null);
});

test('should throw when injecting an unknown dependency', () => {
  expect(() =>
    new ServiceManager(name, ['ValidDependency']).inject(
      'InvalidDependency',
      {}
    )
  ).toThrow(UnknownDependencyError.Error);
});

test('should throw when injecting an invalid service as dependency', () => {
  expect(() =>
    new ServiceManager(name, ['ValidDependency']).inject('ValidDependency', {
      manager: 'NotAServiceManager'
    })
  ).toThrow('Cannot inject invalid service in ' + name);
});

test('should return an injected dependency by name', () => {
  const serviceA = new ServiceManager('ServiceA').createService();
  expect(
    new ServiceManager(name, ['ServiceA'])
      .inject('ServiceA', serviceA)
      .dependency('ServiceA')
  ).toBe(serviceA);
});

test('should throw when requesting an unresolved dependency', () => {
  expect(() =>
    new ServiceManager(name, ['ServiceA']).dependency('ServiceA')
  ).toThrow('Dependency ServiceA of service ' + name + ' is unavailable.');
});

test('should initialize, connect, or authenticate its dependencies before itself', done => {
  const log = [],
    dep = new ServiceManager(
      'dep',
      [],
      () => log.push('DI'),
      () => log.push('DC'),
      () => log.push('DA')
    ),
    svc = new ServiceManager(
      'svc',
      ['dep'],
      () => log.push('SI'),
      () => log.push('SC'),
      () => log.push('SA')
    );

  svc
    .inject('dep', dep.createService())
    .authenticate()
    .then(() => {
      expect(log).toEqual(['DI', 'DC', 'DA', 'SI', 'SC', 'SA']);
      done();
    });
});

test('should build and return a valid service object when calling createService()', () => {
  expect(
    ServiceManager.isValidService(
      new ServiceManager(name, ['ServiceA']).createService()
    )
  ).toBe(true);
});

test('should throw when initializing, connecting, or authenticating dependencies before injection', () => {
  const serviceA = new ServiceManager(
    'ServiceA',
    ['ServiceB', 'ServiceC'],
    _,
    _,
    _
  );
  expect(() => serviceA.initializeDependencies()).toThrow(
    DependencyNotResolvedError.Error
  );
  expect(() => serviceA.connectDependencies()).toThrow(
    DependencyNotResolvedError.Error
  );
  expect(() => serviceA.authenticateDependencies()).toThrow(
    DependencyNotResolvedError.Error
  );
});

test('should resolve to empty array when initializing, connecting or authenticating empty list of dependencies', () => {
  const serviceA = new ServiceManager('ServiceA', [], _, _, _);
  expect.assertions(3);
  serviceA.initializeDependencies().then(d => expect(d).toEqual([]));
  serviceA.connectDependencies().then(d => expect(d).toEqual([]));
  serviceA.authenticateDependencies().then(d => expect(d).toEqual([]));
});

test("should reject with dependency's reason when initializing, connecting or authenticating failing dependency", () => {
  const serviceA = new ServiceManager('ServiceA', [], _, _, _);
  serviceA.initialize = () => Promise.reject('InitErrorA');
  serviceA.connect = () => Promise.reject('ConnectErrorA');
  serviceA.authenticate = () => Promise.reject('AuthenticationErrorA');

  const serviceB = new ServiceManager('ServiceB', ['ServiceA'], _, _, _);
  serviceB._injections.ServiceA = serviceA.createService();

  expect.assertions(3);
  serviceB
    .initializeDependencies()
    .then(null, reason => expect(reason).toBe('InitErrorA'));
  serviceB
    .connectDependencies()
    .then(null, reason => expect(reason).toBe('ConnectErrorA'));
  serviceB
    .authenticateDependencies()
    .then(null, reason => expect(reason).toBe('AuthenticationErrorA'));
});
