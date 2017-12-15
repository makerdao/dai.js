import { default as MakerDao, State, IllegalStateError } from './MakerDao';

test('should start in state CREATED', () => {
  expect((new MakerDao()).state()).toBe(State.CREATED);
});

test('inState should only return true for the current state', () => {
  expect((new MakerDao()).inState(State.CREATED)).toBe(true);
  expect((new MakerDao()).inState([State.CREATED])).toBe(true);
  expect((new MakerDao()).inState([State.OFFLINE, State.CREATED])).toBe(true);

  expect((new MakerDao()).inState(State.ONLINE)).toBe(false);
  expect((new MakerDao()).inState([State.ONLINE])).toBe(false);
  expect((new MakerDao()).inState([State.OFFLINE, State.ONLINE])).toBe(false);
});

test('should transition to the ONLINE state after initialize()', () => {
  let md = new MakerDao();
  md.initialize();
  expect(md.state()).toBe(State.ONLINE);
});

test('should transition to the OFFLINE state after initialize(false)', () => {
  let md = new MakerDao();
  md.initialize(false);
  expect(md.state()).toBe(State.OFFLINE);
});

test('should transition to the ONLINE state on connect()', () => {
  let md = new MakerDao();
  md.initialize(false);
  md.connect();
  expect(md.state()).toBe(State.ONLINE);
});

test('should only allow connect() in the appropriate states', () => {
  const statesAllowingConnect = [State.OFFLINE, State.CONNECTING, State.ONLINE];
  const md = new MakerDao();
  md.onStateChanged((newState) => {
    if (statesAllowingConnect.indexOf(newState) === -1) {
      expect(() => md.connect()).toThrow(IllegalStateError.Error);
    } else {
      expect(md.connect()).toBeFalsy();
    }
  });
});

test('should throw an error when initialized twice', () => {
  let md = new MakerDao();
  md.initialize();
  expect(() => md.initialize()).toThrow(IllegalStateError.Error);
});

test('should throw an error when trying to connect without initialization', () => {
  expect(() => (new MakerDao()).connect()).toThrow(IllegalStateError.Error);
});

test('should call onStateChanged callbacks on state transitions', () => {
  let md = new MakerDao();
  let states = [];

  // Create two listeners and log their calls in the states array
  md.onStateChanged((oldState, newState) => states.push([1, oldState, newState]));
  md.onStateChanged((oldState, newState) => states.push([2, oldState, newState]));

  // Transform CREATED > INITIALIZING > OFFLINE > CONNECTING > ONLINE
  md.initialize();

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
  expect(() => (new MakerDao())._setState('NOT_AN_EXISTING_STATE')).toThrow(IllegalStateError.Error);
});

test('should throw an error when trying to do an illegal state transition', () => {
  expect(() => (new MakerDao())._setState('OFFLINE')).toThrow(IllegalStateError.Error);
});

test('should throw an error when asserting a state that is not the current state', () => {
  expect(() => (new MakerDao())._assertState('OFFLINE')).toThrow(IllegalStateError.Error);
});

test('should do nothing when transitioning to the current state', () => {
  const md = new MakerDao();
  let triggered = false;
  md.onStateChanged(() => triggered = true);

  md._setState(md.state());

  expect(md.state()).toBe("CREATED");
  expect(triggered).toBe(false);
});