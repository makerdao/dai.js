import Service from './Service';

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

test("should return promises resolving to true, when calling the life cycle methods", () => {
  expect.assertions(2);

  return Promise
    .all([
      (new Service(name)).initialize(),
      (new Service(name)).connect()
    ])
    .then(results => {
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(true);
    });
});
