import { State } from '../MakerDao';
import StateMachine, { IllegalStateError } from '../services/StateMachine';

function getTransitionMap() {
  const transitions = {};
  transitions[State.CREATED] = [State.INITIALIZING];
  transitions[State.INITIALIZING] = [State.CONNECTING, State.OFFLINE];
  transitions[State.CONNECTING] = [State.OFFLINE, State.ONLINE];
  transitions[State.OFFLINE] = [State.CONNECTING];
  transitions[State.ONLINE] = [State.OFFLINE];
  return transitions;
}

function buildStateMachine() {
  return new StateMachine(State.CREATED, getTransitionMap());
}

test('should reject invalid transition maps', () => {
  const missingState = getTransitionMap();
  delete missingState[State.ONLINE];

  const illegalType = getTransitionMap();
  illegalType[State.ONLINE] = {not: 'an array'};

  expect(() => new StateMachine(State.CREATED, missingState)).toThrow();
  expect(() => new StateMachine(State.CREATED, illegalType)).toThrow();
  expect(() => new StateMachine(State.CREATED, 'not an object')).toThrow();
  expect(() => new StateMachine('MISSING_INITIAL_STATE', getTransitionMap())).toThrow();
});

test('should start in the initial state', () => {
  expect(buildStateMachine().state()).toBe(State.CREATED);
});

test('inState should only return true for the current state', () => {
  expect(buildStateMachine().inState(State.CREATED)).toBe(true);
  expect(buildStateMachine().inState([State.CREATED])).toBe(true);
  expect(buildStateMachine().inState([State.OFFLINE, State.CREATED])).toBe(true);

  expect(buildStateMachine().inState(State.ONLINE)).toBe(false);
  expect(buildStateMachine().inState([State.ONLINE])).toBe(false);
  expect(buildStateMachine().inState([State.OFFLINE, State.ONLINE])).toBe(false);
});

test('should call onStateChanged callbacks on state transitions', () => {
  let md = buildStateMachine();
  let states = [];

  // Create two listeners and log their calls in the states array
  md.onStateChanged((oldState, newState) => states.push([1, oldState, newState]));
  md.onStateChanged((oldState, newState) => states.push([2, oldState, newState]));

  // Transform CREATED > INITIALIZING > OFFLINE > CONNECTING > ONLINE
  md.transitionTo(State.CREATED)
    .transitionTo(State.INITIALIZING)
    .transitionTo(State.OFFLINE)
    .transitionTo(State.CONNECTING)
    .transitionTo(State.ONLINE);

  expect(states).toEqual([
    [1, State.CREATED, State.INITIALIZING],
    [2, State.CREATED, State.INITIALIZING],
    [1, State.INITIALIZING, State.OFFLINE],
    [2, State.INITIALIZING, State.OFFLINE],
    [1, State.OFFLINE, State.CONNECTING],
    [2, State.OFFLINE, State.CONNECTING],
    [1, State.CONNECTING, State.ONLINE],
    [2, State.CONNECTING, State.ONLINE],
  ]);
});

test('should throw an error when trying to set an illegal state', () => {
  expect(() => buildStateMachine().transitionTo('NOT_AN_EXISTING_STATE')).toThrow(IllegalStateError.Error);
});

test('should throw an error when trying to do an illegal state transition', () => {
  expect(() => buildStateMachine().transitionTo('OFFLINE')).toThrow(IllegalStateError.Error);
});

test('should do nothing when asserting the current state', () => {
  expect(buildStateMachine().assertState('CREATED')).toBeFalsy();
});

test('should throw an error when asserting a state that is not the current state', () => {
  expect(() => buildStateMachine().assertState('OFFLINE')).toThrow(IllegalStateError.Error);
  expect(() => buildStateMachine().assertState('OFFLINE', 'myOperation')).toThrow(IllegalStateError.Error);
});

test('should do nothing when transitioning to the current state', () => {
  const md = buildStateMachine();
  let triggered = false;
  md.onStateChanged(() => triggered = true);

  md.transitionTo(md.state());

  expect(md.state()).toBe('CREATED');
  expect(triggered).toBe(false);
});
