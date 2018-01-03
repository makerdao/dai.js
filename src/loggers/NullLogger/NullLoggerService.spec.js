import ServiceManager from '../../services/ServiceManager';
import NullLoggerService from './NullLoggerService';

test('should have a valid logger interface', () => {
  const logger = new NullLoggerService();
  expect(logger.trace({}, '')).toBeFalsy();
  expect(logger.debug({}, '')).toBeFalsy();
  expect(logger.info({}, '')).toBeFalsy();
  expect(logger.warn({}, '')).toBeFalsy();
  expect(logger.error({}, '')).toBeFalsy();
  expect(logger.fatal({}, '')).toBeFalsy();
});

test('serviceLogger() should return a valid logger interface', () => {
  const logger = new NullLoggerService().serviceLogger(new ServiceManager('MyService').createService());
  expect(logger.trace({}, '')).toBeFalsy();
  expect(logger.debug({}, '')).toBeFalsy();
  expect(logger.info({}, '')).toBeFalsy();
  expect(logger.warn({}, '')).toBeFalsy();
  expect(logger.error({}, '')).toBeFalsy();
  expect(logger.fatal({}, '')).toBeFalsy();
});

test('serviceLogger() should throw when given an invalid service object', () => {
  expect(() => new NullLoggerService().serviceLogger()).toThrow('Invalid service object');
  expect(() => new NullLoggerService().serviceLogger({})).toThrow('Invalid service object');
  expect(() => new NullLoggerService().serviceLogger({ manager: null })).toThrow('Invalid service object');
  expect(() => new NullLoggerService().serviceLogger({ manager: () => ({}) })).toThrow('Invalid service object');
});
