import ServiceBase from '../src/ServiceBase';
import LocalService from '../src/LocalService';
import ServiceType from '../src/ServiceType';

test('should be a service of type LOCAL, with the provided name and dependencies', () => {
  const service = new LocalService('MyName', ['X', 'Y', 'Z']);

  expect(service).toBeInstanceOf(ServiceBase);
  expect(service.manager().type()).toBe(ServiceType.LOCAL);
  expect(service.manager().name()).toBe('MyName');
  expect(service.manager().dependencies()).toEqual(['X', 'Y', 'Z']);

  expect(new LocalService('MyName').manager().dependencies()).toEqual([]);
});
