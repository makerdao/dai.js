import { buildTestEventService } from '../helpers/serviceBuilders';
import { promiseWait } from '../../src/utils';

let eventService;

beforeEach(() => {
  eventService = buildTestEventService();
});

test('can use the default emitter to emit and listen to a basic event', done => {
  eventService.on('music', arg => {
    expect(arg.payload).toBe('dance');
    done();
  });
  eventService.emit('music', 'dance');
});

test('can create additional emitter instances', done => {
  const cdpEmitter = eventService.buildEmitter({ group: 'cdp' });
  const txEmitter = eventService.buildEmitter({ group: 'tx' });

  cdpEmitter.on('a', arg => {
    expect(arg.payload).toBe('cdp');
    done();
  });
  txEmitter.on('a', arg => {
    expect(arg.payload).toBe('tx');
    cdpEmitter.emit('a', 'cdp');
  });

  txEmitter.emit('a', 'tx');
});

test('can emit an event when some state that is being polled for, changes', done => {
  const interval = setInterval(eventService.ping, 250);

  let num = 1;
  const incrementNum = () => {
    num += 1;
  };
  setTimeout(incrementNum, 100);

  const getNumPromise = () => {
    return promiseWait(50).then(() => num);
  };

  eventService.registerPollEvents({
    'real/int': {
      num: () => getNumPromise()
    }
  });

  eventService.on('real/int', arg => {
    expect(arg.payload.num).toBe(2);
    clearInterval(interval);
    done();
  });
});

test('can emit an event from a non-default emitter when some state that is being polled for, changes', done => {
  const otherEmitter = eventService.buildEmitter({ group: 'other' });
  const interval = setInterval(eventService.ping, 250);

  let num = 1;
  const incrementNum = () => {
    num++;
  };
  setTimeout(incrementNum, 100);

  const getNumPromise = () => {
    return promiseWait(50).then(() => num);
  };

  otherEmitter.registerPollEvents({
    'real/rational/int': {
      num: () => getNumPromise()
    }
  });

  otherEmitter.on('real/rational/int', arg => {
    expect(arg.payload.num).toBe(2);
    clearInterval(interval);
    done();
  });
});

test('can listen to a category of events using wildcards', done => {
  expect.assertions(2);

  eventService.on('real/*', arg => {
    if (arg.type === 'real/rational') {
      expect(arg.payload).toBe(1);
    } else if (arg.type === 'real/irrational') {
      expect(arg.payload).toBe(Math.PI);
      done();
    }
  });

  eventService.emit('real/rational', 1);
  eventService.emit('real/irrational', Math.PI);
});

test('can use a wildcard that will match all levels', done => {
  eventService.on('real/**', arg => {
    expect(arg.payload).toBe(1);
    done();
  });

  eventService.emit('real/rational/int', 1);
});

test('can use a wildcard that will match everything', done => {
  eventService.on('**', arg => {
    expect(arg.payload).toBe(1);
    done();
  });

  eventService.emit('real/rational/int', 1);
});

test('can have event sequence numbers', done => {
  eventService.on('first', arg => {
    expect(arg.index).toBe(1);
    eventService.emit('second');
  });

  eventService.on('second', arg => {
    expect(arg.index).toBe(2);
    done();
  });

  eventService.emit('first');
});

test('can have the latest block number', done => {
  eventService.ping(100);

  eventService.on('event', arg => {
    expect(arg.block).toBe(100);
    done();
  });

  eventService.emit('event');
});

test('will check state of active polls on ping', done => {
  const poll = () => {
    done();
  };

  eventService
    .registerPollEvents({
      'real/rational/int': {
        _: () => poll()
      }
    })
    .startPolls();

  eventService.ping();
});

test('can remove an event listener', done => {
  eventService.ping(100);

  const callback = () => {
    throw new Error('This listener should have been removed');
  };

  eventService.on('event', callback);
  eventService.removeListener('event', callback);
  eventService.emit('event');
  done();
});

test('will only poll for state changes if somebody is listening to the relevant event', done => {
  let num = 1;
  let timesPolled = 0;
  const incrementNum = () => {
    num++;
  };

  const getNumPromise = () => {
    timesPolled++;
    return promiseWait(50).then(() => num);
  };

  eventService.registerPollEvents({
    'real/rational/int': {
      num: () => getNumPromise()
    }
  });

  setTimeout(() => {
    eventService.ping();
    eventService.ping();
    eventService.ping();
    eventService.ping();
    eventService.ping();
  }, 100);

  setTimeout(() => {
    eventService.on('real/rational/int', () => {
      // polled once when this listener was added & once when the ping below was called
      // should not reflect the pings that happen above (which were called before this listener was added)
      expect(timesPolled).toBe(2);
      done();
    });
  }, 200);

  setTimeout(incrementNum, 300);
  setTimeout(eventService.ping, 400);
});

test('will emit an error event', done => {
  const poll = () => {
    throw new Error();
  };

  eventService.on('error', () => {
    done();
  });

  eventService
    .registerPollEvents({
      'real/rational/int': {
        _: () => poll()
      }
    })
    .startPolls();

  eventService.ping();
});

test('can dispose emitter instances', done => {
  const dummyEmitter = eventService.buildEmitter({ group: 'dummy' });

  let num = 1;
  const poll = () => {
    num++;
    return promiseWait(50).then(() => num);
  };

  dummyEmitter
    .registerPollEvents({
      'real/rational/int': {
        _: () => poll()
      }
    })
    .startPolls();

  dummyEmitter.dispose();

  dummyEmitter.on('**', () => {
    throw new Error('This emitter should have been disposed');
  });

  // polling events should have stopped
  eventService.ping();
  // and normal emits should not work anymore either
  dummyEmitter.emit('event');
  setTimeout(done, 100);
});
