import Service, {DependencyNotResolvedError} from './Service';

const name = 'IAmAService';

test("should throw an error when no name is provided", () => {
  expect(() => new Service()).toThrow('Service name must not be empty.');
  expect(() => new Service("")).toThrow('Service name must not be empty.');
  expect(() => new Service(null)).toThrow('Service name must not be empty.');
});

test("should expose the provided service name through getName()", () => {
  expect((new Service(name)).getName()).toBe('IAmAService');
});

test("should return an empty list of dependencies by default", () => {
  expect((new Service(name)).getDependencies()).toEqual([]);
});

test("should expose the provided dependencies through getDependencies()", () => {
  expect((new Service(name, [name, name])).getDependencies()).toEqual([name, name]);
});

test("should have uninitialized dependency properties after instantiation", () => {
  const serviceA = new Service("ServiceA", ["ServiceB", "ServiceC"]);
  expect(serviceA.ServiceB).toBe(null);
  expect(serviceA.ServiceC).toBe(null);
});

test("should throw when initializing or connecting dependencies before dependency injection", () => {
  const serviceA = new Service("ServiceA", ["ServiceB", "ServiceC"]);
  expect(() => serviceA.initializeDependencies()).toThrow(DependencyNotResolvedError.Error);
  expect(() => serviceA.connectDependencies()).toThrow(DependencyNotResolvedError.Error);
});

test("should resolve to empty array when initializing or connecting empty list of dependencies", () => {
  const serviceA = new Service("ServiceA", []);
  expect.assertions(2);
  serviceA.initializeDependencies().then(d => expect(d).toEqual([]));
  serviceA.connectDependencies().then(d => expect(d).toEqual([]));
});

test("should reject with dependency's reason when initializing or connecting failing dependency", () => {
  const serviceA = new Service("ServiceA", []);
  serviceA.initialize = () => Promise.reject('InitErrorA');
  serviceA.connect = () => Promise.reject('ConnectErrorA');

  const serviceB = new Service("ServiceB", ["ServiceA"]);
  serviceB.ServiceA = serviceA;

  expect.assertions(2);
  serviceB.initializeDependencies().then(null, (reason) => expect(reason).toBe('InitErrorA'));
  serviceB.connectDependencies().then(null, (reason) => expect(reason).toBe('ConnectErrorA'));
});

