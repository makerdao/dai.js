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
  setTimeout(incrementNum, 1000);

  const getNumPromise = () => {
    return promiseWait(500).then(() => num);
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
  const otherEmitter = eventService.buildEmitter({ group: 'cdp' });
  const interval = setInterval(eventService.ping, 250);

  let num = 1;
  const incrementNum = () => {
    num += 1;
  };
  setTimeout(incrementNum, 1000);

  const getNumPromise = () => {
    return promiseWait(500).then(() => num);
  };

  otherEmitter.registerPollEvents({
    'real/int': {
      num: () => getNumPromise()
    }
  });

  otherEmitter.on('real/int', arg => {
    expect(arg.payload.num).toBe(2);
    clearInterval(interval);
    done();
  });
});

//NOTE: more tests to come
