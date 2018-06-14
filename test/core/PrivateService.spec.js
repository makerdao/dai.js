import ServiceBase from '../../src/core/ServiceBase';
import PrivateService from '../../src/core/PrivateService';
import ServiceType from '../../src/core/ServiceType';

test('should be a service of type PRIVATE, with the provided name and dependencies', () => {
  const service = new PrivateService('MyName', ['X', 'Y', 'Z']);

  expect(service).toBeInstanceOf(ServiceBase);
  expect(service.manager().type()).toBe(ServiceType.PRIVATE);
  expect(service.manager().name()).toBe('MyName');
  expect(service.manager().dependencies()).toEqual(['X', 'Y', 'Z']);

  expect(new PrivateService('MyName').manager().dependencies()).toEqual([]);
});
