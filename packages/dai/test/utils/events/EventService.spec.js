import { buildTestEventService } from '../../helpers/serviceBuilders';
import { promiseWait } from '../../../src/utils';

let eventService;

beforeEach(() => {
  eventService = buildTestEventService();
});

test('can use the default emitter to emit and listen for events', done => {
  eventService.on('music', eventObj => {
    expect(eventObj.payload).toBe('dance');
    done();
  });
  eventService.emit('music', 'dance');
});

test('can create additional emitter instances', done => {
  const cdpEmitter = eventService.buildEmitter({ group: 'cdp' });
  const txEmitter = eventService.buildEmitter({ group: 'tx' });

  cdpEmitter.on('a', eventObj => {
    expect(eventObj.payload).toBe('cdp');
    done();
  });
  txEmitter.on('a', eventObj => {
    expect(eventObj.payload).toBe('tx');
    cdpEmitter.emit('a', 'cdp');
  });

  txEmitter.emit('a', 'tx');
});

test('should emit an event when some state that is being polled changes', done => {
  const interval = setInterval(eventService.ping, 250);

  let num = 1;
  const incrementNum = () => {
    num += 1;
  };
  const getNumPromise = () => {
    return promiseWait(50).then(() => num);
  };

  eventService.registerPollEvents({
    'real/int': {
      num: () => getNumPromise()
    }
  });

  eventService.on('real/int', eventObj => {
    expect(eventObj.payload.num).toBe(2);
    clearInterval(interval);
    done();
  });

  setTimeout(incrementNum, 100);
});

test('should emit an event from a non-default emitter when some state that is being polled for that instance changes', done => {
  const interval = setInterval(eventService.ping, 250);
  const otherEmitter = eventService.buildEmitter();

  let num = 1;
  const incrementNum = () => {
    num++;
  };
  const getNumPromise = () => {
    return promiseWait(50).then(() => num);
  };
  otherEmitter.registerPollEvents({
    'real/int': {
      num: () => getNumPromise()
    }
  });
  otherEmitter.on('real/int', eventObj => {
    expect(eventObj.payload.num).toBe(2);
    clearInterval(interval);
    done();
  });

  setTimeout(incrementNum, 100);
});

test('can listen for a set of events using wildcards', done => {
  expect.assertions(2);

  eventService.on('real/*', eventObj => {
    if (eventObj.type === 'real/rational') {
      expect(eventObj.payload).toBe(1);
    } else if (eventObj.type === 'real/irrational') {
      expect(eventObj.payload).toBe(Math.PI);
      done();
    }
  });

  eventService.emit('real/rational', 1);
  eventService.emit('real/irrational', Math.PI);
});

test('can listen for events at any level of depth with a ** wildcard', done => {
  eventService.on('real/**', eventObj => {
    expect(eventObj.payload).toBe(1);
    done();
  });

  eventService.emit('real/rational/int', 1);
});

test('can listen all events with a ** wildcard', done => {
  eventService.on('**', eventObj => {
    expect(eventObj.payload).toBe(1);
    done();
  });

  eventService.emit('real/rational/int', 1);
});

test('should add an event sequence number to the event object', done => {
  eventService.on('first', eventObj => {
    expect(eventObj.sequence).toBe(1);
    eventService.emit('second');
  });

  eventService.on('second', eventObj => {
    expect(eventObj.sequence).toBe(2);
    done();
  });

  eventService.emit('first');
});

test('should have the latest block number in the event object', done => {
  eventService.ping(100);

  eventService.on('event', eventObj => {
    expect(eventObj.block).toBe(100);
    done();
  });

  eventService.emit('event');
});

test('should check the state of active polls when ping is called', done => {
  const poll = () => {
    done();
  };

  eventService
    .registerPollEvents({
      event: {
        _: () => poll()
      }
    })
    ._startPolls();

  eventService.ping();
});

test('can remove an event listener', done => {
  const callback = () => {
    throw new Error('This listeners emitter should have been removed');
  };
  eventService.on('event', callback);
  eventService.removeListener('event', callback);
  eventService.emit('event');
  done();
});

test('should only poll for state changes if the associated event is being listened for', done => {
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
    event: {
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
    eventService.on('event', () => {
      // polled once when this listener was added & once when the ping below is called
      // should not reflect the above pings (which were called before this listener was added)
      expect(timesPolled).toBe(2);
      done();
    });
  }, 200);

  setTimeout(incrementNum, 300);
  setTimeout(eventService.ping, 400);
});

test('should emit an error event if a poll has a problem', done => {
  const poll = () => {
    throw new Error();
  };

  eventService.on('error', () => {
    done();
  });

  eventService
    .registerPollEvents({
      event: {
        _: () => poll()
      }
    })
    ._startPolls();

  // ^ this starts all of the polls w/o worrying whether somebody is listening
  eventService.ping();
});

test('can dispose emitter instances', done => {
  const emitterInstance = eventService.buildEmitter();
  let num = 1;
  const poll = () => {
    num++;
    return promiseWait(50).then(() => num);
  };

  emitterInstance
    .registerPollEvents({
      event: {
        _: () => poll()
      }
    })
    ._startPolls();

  emitterInstance.dispose();
  emitterInstance.on('**', () => {
    throw new Error('This emitter should be disposed');
  });
  // polling should have stopped for that emitter
  eventService.ping();
  // and normal emits should not work either
  emitterInstance.emit('event');
  setTimeout(done, 100);
});

test('can register event payloads with multiple elements', done => {
  let num = 0;
  const one = () => {
    return promiseWait(50).then(() => num + 1);
  };
  const two = () => {
    return promiseWait(50).then(() => num + 2);
  };
  const three = () => {
    return promiseWait(50).then(() => num + 3);
  };

  eventService
    .registerPollEvents({
      nums: {
        one: () => one(),
        two: () => two(),
        three: () => three()
      }
    })
    ._startPolls();

  eventService.on('nums', arg => {
    const { one, two, three } = arg.payload;
    expect(one).toBeDefined();
    expect(two).toBeDefined();
    expect(three).toBeDefined();
    done();
  });
  setTimeout(() => num++, 100);
  setTimeout(eventService.ping, 200);
});

test('can create multiple polls on multiple emitters and the correct events will be emitted', done => {
  expect.assertions(2);
  let num = 0;
  const otherEmitterInstance = eventService.buildEmitter();
  const pollA = () => {
    return promiseWait(50).then(() => num);
  };
  const pollB = () => {
    return promiseWait(50).then(() => num);
  };

  eventService
    .registerPollEvents({
      event: {
        a: () => pollA()
      }
    })
    ._startPolls();

  otherEmitterInstance
    .registerPollEvents({
      event: {
        b: () => pollB()
      }
    })
    ._startPolls();

  eventService.on('event', eventObj => {
    expect(eventObj.payload.a).toBeDefined();
  });

  otherEmitterInstance.on('event', eventObj => {
    expect(eventObj.payload.b).toBeDefined();
  });

  setTimeout(() => num++, 100);
  setTimeout(eventService.ping, 200);
  setTimeout(done, 500);
});
