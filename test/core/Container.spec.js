import Container, { InvalidServiceError, ServiceAlreadyRegisteredError, ServiceDependencyLoopError, ServiceNotFoundError }
  from '../../src/core/Container';

import ServiceManager from '../../src/core/ServiceManager';

const serviceA = new ServiceManager('ServiceA').createService();
const serviceB = new ServiceManager('ServiceB', ['ServiceA']).createService();
const serviceC = new ServiceManager('ServiceC', ['ServiceA', 'ServiceB']).createService();
const serviceD = new ServiceManager('ServiceD', ['ServiceC']).createService();
const serviceE = new ServiceManager('ServiceE', ['ServiceF']).createService();
const serviceF = new ServiceManager('ServiceF', ['ServiceE']).createService();
const serviceG = new ServiceManager('ServiceG', ['ServiceG']).createService();

test('register() should throw when registering an invalid service', () => {
  expect(() => (new Container()).register()).toThrow(InvalidServiceError.Error);
  expect(() => (new Container({name: 'NotAService'})).register()).toThrow(InvalidServiceError.Error);
  expect(() => (new Container('NotAService')).register()).toThrow(InvalidServiceError.Error);
});

test('register() should throw when registering a duplicate service', () => {
  expect(() => (new Container()).register(serviceA, 'MyService').register(serviceB, 'MyService'))
    .toThrow(ServiceAlreadyRegisteredError.Error);
});

test('register() should do nothing when registering the same service twice', () => {
  new Container()
    .register(serviceA)
    .register(serviceA)
    .register(serviceA, 'MyService')
    .register(serviceA, 'MyService')
    .register(serviceA, 'MyOtherService')
    .register(serviceA, 'MyOtherService');
});

test('service() should return a registered service by name', () => {
  const c = new Container()
    .register(serviceA)
    .register(serviceB)
    .register(serviceA, 'MyOtherNameForA')
    .register(serviceB, 'MyOtherNameForB');

  expect(c.service(serviceA.manager().name())).toBe(serviceA);
  expect(c.service('MyOtherNameForA')).toBe(serviceA);
  expect(c.service(serviceB.manager().name())).toBe(serviceB);
  expect(c.service('MyOtherNameForB')).toBe(serviceB);
});

test('service() should by default throw when a service is not found', () => {
  expect(() => new Container().service('IDontExist')).toThrow(ServiceNotFoundError.Error);
});

test('service() should not throw when a service is not found and throwIfMissing = false', () => {
  expect(new Container().service('IDontExist', false)).toBe(undefined);
});

test('service() should always throw when a service is requested but no name is provided', () => {
  expect(() => new Container().service()).toThrow(ServiceNotFoundError.Error);
  expect(() => new Container().service('', false)).toThrow(ServiceNotFoundError.Error);
});

test('getServices() should return an empty services list, if none are registered', () => {
  expect(new Container().getServices()).toEqual([]);
});

test('getServices() should return the services in load order, regardless of registration order', () => {
  expect(new Container().register(serviceD).register(serviceC).register(serviceB).register(serviceA).getServices())
    .toEqual([serviceA, serviceB, serviceC, serviceD]);

  expect(new Container().register(serviceA).register(serviceB).register(serviceC).register(serviceD).getServices())
    .toEqual([serviceA, serviceB, serviceC, serviceD]);

  const processed = {};
  [serviceA, serviceB, serviceC, serviceD].forEach(s => {
    s.manager().dependencies().forEach(d => expect(processed[d]).toBe(true));
    processed[s.manager().name()] = true;
  });
});

test('getServices() should correctly set all service dependencies', () => {
  new Container().register(serviceD).register(serviceC).register(serviceB).register(serviceA).getServices()
    .forEach(s => s.manager().dependencies().forEach(d => expect(s.manager().dependency(d).manager() instanceof ServiceManager && s.manager().dependency(d).manager().name() === d).toBe(true)));
});

test('getServices() should throw on dependency loops', () => {
  expect(() => new Container().register(serviceG).getServices()).toThrow(ServiceDependencyLoopError.Error);
  expect(() => new Container().register(serviceE).register(serviceF).getServices())
    .toThrow(ServiceDependencyLoopError.Error);
});

test('getServices() should throw on missing dependencies', () => {
  expect(() => new Container().register(serviceB).getServices()).toThrow(ServiceNotFoundError.Error);
  expect(() => new Container().register(serviceC).getServices()).toThrow(ServiceNotFoundError.Error);
});
