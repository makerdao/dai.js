import ServiceBase from '../../src/core/ServiceBase';
import PublicService from '../../src/core/PublicService';
import ServiceType from '../../src/core/ServiceType';

test('should be a service of type PUBLIC, with the provided name and dependencies', () => {
  const service = new PublicService('MyName', ['X', 'Y', 'Z']);

  expect(service).toBeInstanceOf(ServiceBase);
  expect(service.manager().type()).toBe(ServiceType.PUBLIC);
  expect(service.manager().name()).toBe('MyName');
  expect(service.manager().dependencies()).toEqual(['X', 'Y', 'Z']);

  expect(new PublicService('MyName').manager().dependencies()).toEqual([]);
});
