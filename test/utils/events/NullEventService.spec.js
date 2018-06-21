import NullEventService from '../../../src/utils/events/NullEventService';

test('should have a valid event service interface', () => {
  const nullEventService = new NullEventService();
  expect(nullEventService.on({}, '')).toBeFalsy();
  expect(nullEventService.emit({}, '')).toBeFalsy();
  expect(nullEventService.ping({}, '')).toBeFalsy();
  expect(nullEventService.removeListener({}, '')).toBeFalsy();
  expect(nullEventService.registerPollEvents({}, '')).toBeFalsy();
  expect(nullEventService.buildEmitter({}, '')).toBeDefined();
});

test('buildEmitter() should return new emitter with a valid interface', () => {
  const nullEventService = new NullEventService();
  const emitterInstance = nullEventService.buildEmitter();
  expect(emitterInstance.emit({}, '')).toBeFalsy();
  expect(emitterInstance.on({}, '')).toBeFalsy();
  expect(emitterInstance.removeListener({}, '')).toBeFalsy();
  expect(emitterInstance.dispose({}, '')).toBeFalsy();
});
