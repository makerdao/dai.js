import TimerService from '../../src/utils/TimerService';

const DURATION_SHORT = 10,
  DURATION_LONG = 20;

test('allows setting repeating timers', done => {
  const timer = new TimerService();
  let calls = 0;

  timer.createTimer('repeater', 1, true, () => {
    calls += 1;

    if (calls >= 3) {
      // Allow failure if this isn't disposed of.
      done();
      timer.disposeTimer('repeater');
    }
  });
});

test('allows setting non-repeating timers', done => {
  const timer = new TimerService();
  timer.createTimer('once', 1, false, done);
});

test('only allow one timer per name, disposing on collision', done => {
  const timer = new TimerService();
  timer.createTimer('collide', DURATION_SHORT, false, done.fail);
  timer.createTimer('collide', DURATION_LONG, false, done);
});

test('only allow one repeating timer per name, disposing on collision', done => {
  const timer = new TimerService();
  timer.createTimer('collide', DURATION_SHORT, true, done.fail);
  timer.createTimer('collide', DURATION_LONG, true, () => {
    done();
    timer.disposeTimer('collide');
  });
});

test('dispose of timers by name', done => {
  const timer = new TimerService();
  timer.createTimer('fail', DURATION_SHORT, false, done.fail);
  timer.createTimer('pass', DURATION_LONG, false, done);
  timer.disposeTimer('fail');
});

test('dispose of all timers', done => {
  const timer = new TimerService();
  timer.createTimer('fail1', DURATION_SHORT, false, done.fail);
  timer.createTimer('fail2', DURATION_SHORT, false, done.fail);
  timer.createTimer('fail3', DURATION_SHORT, false, done.fail);
  timer.disposeAllTimers();

  timer.createTimer('pass', DURATION_LONG, false, done);
});

test('list all timers', () => {
  const timer = new TimerService();
  timer.createTimer('a', DURATION_SHORT, false, () => {});
  timer.createTimer('b', DURATION_SHORT, false, () => {});
  timer.createTimer('c', DURATION_SHORT, false, () => {});
  expect(timer.listTimers()).toEqual(['a', 'b', 'c']);
  timer.disposeAllTimers();
});
