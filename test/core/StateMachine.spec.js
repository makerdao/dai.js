import StateMachine, { IllegalStateError } from '../../src/core/StateMachine';
import ServiceState from '../../src/core/ServiceState';

function getTransitionMap() {
  const transitions = {};
  transitions[ServiceState.CREATED] = [ServiceState.INITIALIZING];
  transitions[ServiceState.INITIALIZING] = [
    ServiceState.CONNECTING,
    ServiceState.OFFLINE
  ];
  transitions[ServiceState.CONNECTING] = [
    ServiceState.OFFLINE,
    ServiceState.ONLINE
  ];
  transitions[ServiceState.OFFLINE] = [ServiceState.CONNECTING];
  transitions[ServiceState.ONLINE] = [ServiceState.OFFLINE];
  return transitions;
}

function buildStateMachine() {
  return new StateMachine(ServiceState.CREATED, getTransitionMap());
}

test('should reject invalid transition maps', () => {
  const missingState = getTransitionMap();
  delete missingState[ServiceState.ONLINE];

  const illegalType = getTransitionMap();
  illegalType[ServiceState.ONLINE] = { not: 'an array' };

  expect(() => new StateMachine(ServiceState.CREATED, missingState)).toThrow();
  expect(() => new StateMachine(ServiceState.CREATED, illegalType)).toThrow();
  expect(
    () => new StateMachine(ServiceState.CREATED, 'not an object')
  ).toThrow();
  expect(
    () => new StateMachine('MISSING_INITIAL_STATE', getTransitionMap())
  ).toThrow();
});

test('should start in the initial state', () => {
  expect(buildStateMachine().state()).toBe(ServiceState.CREATED);
});

test('inState should only return true for the current state', () => {
  expect(buildStateMachine().inState(ServiceState.CREATED)).toBe(true);
  expect(buildStateMachine().inState([ServiceState.CREATED])).toBe(true);
  expect(
    buildStateMachine().inState([ServiceState.OFFLINE, ServiceState.CREATED])
  ).toBe(true);

  expect(buildStateMachine().inState(ServiceState.ONLINE)).toBe(false);
  expect(buildStateMachine().inState([ServiceState.ONLINE])).toBe(false);
  expect(
    buildStateMachine().inState([ServiceState.OFFLINE, ServiceState.ONLINE])
  ).toBe(false);
});

test('should call onStateChanged callbacks on state transitions', () => {
  let md = buildStateMachine();
  let states = [];

  // Create two listeners and log their calls in the states array
  md.onStateChanged((oldState, newState) =>
    states.push([1, oldState, newState])
  );
  md.onStateChanged((oldState, newState) =>
    states.push([2, oldState, newState])
  );

  // Transform CREATED > INITIALIZING > OFFLINE > CONNECTING > ONLINE
  md.transitionTo(ServiceState.CREATED)
    .transitionTo(ServiceState.INITIALIZING)
    .transitionTo(ServiceState.OFFLINE)
    .transitionTo(ServiceState.CONNECTING)
    .transitionTo(ServiceState.ONLINE);

  expect(states).toEqual([
    [1, ServiceState.CREATED, ServiceState.INITIALIZING],
    [2, ServiceState.CREATED, ServiceState.INITIALIZING],
    [1, ServiceState.INITIALIZING, ServiceState.OFFLINE],
    [2, ServiceState.INITIALIZING, ServiceState.OFFLINE],
    [1, ServiceState.OFFLINE, ServiceState.CONNECTING],
    [2, ServiceState.OFFLINE, ServiceState.CONNECTING],
    [1, ServiceState.CONNECTING, ServiceState.ONLINE],
    [2, ServiceState.CONNECTING, ServiceState.ONLINE]
  ]);
});

test('should throw an error when trying to set an illegal state', () => {
  expect(() =>
    buildStateMachine().transitionTo('NOT_AN_EXISTING_STATE')
  ).toThrow(IllegalStateError.Error);
});

test('should throw an error when trying to do an illegal state transition', () => {
  expect(() => buildStateMachine().transitionTo('OFFLINE')).toThrow(
    IllegalStateError.Error
  );
});

test('should do nothing when asserting the current state', () => {
  expect(buildStateMachine().assertState('CREATED')).toBeFalsy();
});

test('should throw an error when asserting a state that is not the current state', () => {
  expect(() => buildStateMachine().assertState('OFFLINE')).toThrow(
    IllegalStateError.Error
  );
  expect(() =>
    buildStateMachine().assertState('OFFLINE', 'myOperation')
  ).toThrow(IllegalStateError.Error);
});

test('should do nothing when transitioning to the current state', () => {
  const md = buildStateMachine();
  let triggered = false;
  md.onStateChanged(() => (triggered = true));

  md.transitionTo(md.state());

  expect(md.state()).toBe('CREATED');
  expect(triggered).toBe(false);
});
