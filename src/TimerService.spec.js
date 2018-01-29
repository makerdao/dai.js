import TimerService from './TimerService';


test('allows setting repeating timers', (done) => {
  const timer = new TimerService();
  let calls = 0;

  timer.createTimer('repeater', 1, true, () => {
    calls += 1;

    if (calls >= 3) { // Allow failure if this isn't disposed of.
      done();
      timer.disposeTimer('repeater');
    }
  });
});

test('allows setting non-repeating timers', (done) => {
  const timer = new TimerService();
  timer.createTimer('once', 1, false, done);
});

test('only allow one timer per name, disposing on collision', (done) => {
  const timer = new TimerService();
  timer.createTimer('collide', 500, false, done.fail);
  timer.createTimer('collide', 1000, false, done);
});

test('only allow one repeating timer per name, disposing on collision', (done) => {
  const timer = new TimerService();
  timer.createTimer('collide', 500, true, done.fail);
  timer.createTimer('collide', 1000, true, () => {
    done();
    timer.disposeTimer('collide');
  });
});

test('dispose of timers by name', (done) => {
  const timer = new TimerService();
  timer.createTimer('fail', 100, false, done.fail);
  timer.createTimer('pass', 200, false, done);
  timer.disposeTimer('fail');
});

test('dispose of all timers', (done) => {
  const timer = new TimerService();
  timer.createTimer('fail1', 500, false, done.fail);
  timer.createTimer('fail2', 500, false, done.fail);
  timer.createTimer('fail3', 500, false, done.fail);
  timer.disposeAllTimers();

  timer.createTimer('pass', 600, false, done);
});

test('list all timers', () => {
  const timer = new TimerService();
  timer.createTimer('a', 500, false, () => {});
  timer.createTimer('b', 500, false, () => {});
  timer.createTimer('c', 500, false, () => {});
  expect(timer.listTimers()).toEqual(['a','b','c']);
  timer.disposeAllTimers();
});
