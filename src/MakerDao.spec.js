import { default as MakerDao, State, IllegalStateError } from './MakerDao';

test('should reflect state through isState()', () => {
  const md = new MakerDao();
  expect(md.inState(md.state())).toBe(true);
  expect(md.inState([md.state()])).toBe(true);
  expect(md.inState([State.ONLINE, md.state()])).toBe(true);
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
