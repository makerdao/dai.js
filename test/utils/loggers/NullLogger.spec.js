import ServiceManager from '../../../src/core/ServiceManager';
import NullLogger from '../../../src/utils/loggers/NullLogger';

test('should have a valid logger interface', () => {
  const logger = new NullLogger();
  expect(logger.trace({}, '')).toBeFalsy();
  expect(logger.debug({}, '')).toBeFalsy();
  expect(logger.info({}, '')).toBeFalsy();
  expect(logger.warn({}, '')).toBeFalsy();
  expect(logger.error({}, '')).toBeFalsy();
  expect(logger.fatal({}, '')).toBeFalsy();
});

test('serviceLogger() should return a valid logger interface', () => {
  const logger = new NullLogger().serviceLogger(
    new ServiceManager('MyService').createService()
  );
  expect(logger.trace({}, '')).toBeFalsy();
  expect(logger.debug({}, '')).toBeFalsy();
  expect(logger.info({}, '')).toBeFalsy();
  expect(logger.warn({}, '')).toBeFalsy();
  expect(logger.error({}, '')).toBeFalsy();
  expect(logger.fatal({}, '')).toBeFalsy();
});

test('serviceLogger() should throw when given an invalid service object', () => {
  expect(() => new NullLogger().serviceLogger()).toThrow(
    'Invalid service object'
  );
  expect(() => new NullLogger().serviceLogger({})).toThrow(
    'Invalid service object'
  );
  expect(() => new NullLogger().serviceLogger({ manager: null })).toThrow(
    'Invalid service object'
  );
  expect(() => new NullLogger().serviceLogger({ manager: () => ({}) })).toThrow(
    'Invalid service object'
  );
});
