import LocalService from '../core/LocalService';
import { eventIndexer, slug } from './index';
import isEqual from 'lodash.isequal';
import EventEmitterObj from 'eventemitter2';

const { EventEmitter2 } = EventEmitterObj;

export default class EventService extends LocalService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name);

    // all of our emitters
    // we can have many of these
    // e.g. one for our maker object, a couple on some cdp objects, a few more for transaction objects, etc
    this.emitters = {};

    // this is our default emitter, it will likely be the maker object's personal emitter
    this.createEmitter({ defaultEmitter: true });

    this.ping = this.ping.bind(this);
  }

  // checks all of our active polls for new state
  // this is currently called on every new block from Web3Service
  ping(block) {
    for (const emitter of Object.values(this.emitters)) {
      this._pingEmitter(emitter, block);
    }
  }

  _pingEmitter(emitter, block) {
    for (const poll of emitter.getHotPolls()) {
      poll.ping(block);
    }
  }

  // add a event listener to an emitter
  on(event, listener, emitter = this._defaultEmitter()) {
    emitter.on(event, listener);
  }

  // push an event through an emitter
  emit(event, payload, block, emitter = this._defaultEmitter()) {
    emitter.emit(event, payload, block);
  }

  // remove a listener from an emitter
  removeListener(event, listener, emitter = this._defaultEmitter()) {
    emitter.removeListener(event, listener);
  }

  registerPollEvents(eventPayloadMap, emitter = this._defaultEmitter()) {
    return emitter.registerPollEvents(eventPayloadMap);
  }

  _defaultEmitter() {
    return this.emitters.default;
  }

  // start polling for all of the events that have been registered (regardless of emitter)
  watchAllRegisteredEvents() {
    for (const emitter of Object.values(this.emitters)) {
      emitter.watchAll();
    }
  }

  // decorated emitter factory
  createEmitter({
    _emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '/'
    }),
    indexer = eventIndexer(),
    name = slug(),
    defaultEmitter = false
  } = {}) {
    const newEmitter = this._createEmitter({ _emitter, indexer, name });

    if (defaultEmitter) {
      this.emitters.default = newEmitter;
    } else this.emitters[name] = newEmitter;

    return newEmitter;
  }

  _createEmitter({ _emitter, indexer }) {
    let hotPolls = [];
    let coldPolls = [];

    return {
      emit(event, payload, block) {
        const eventObj = {
          block,
          payload,
          type: event,
          index: indexer()
        };
        _emitter.emit(event, eventObj);
      },
      on(event, listener) {
        // const service = event.split('/')[0];
        // if (!EventService._isValidService(service)) {
        //     throw new Error(`no service called ${service}`);
        // }
        // start watching if we're not currently watching {event}?
        _emitter.on(event, listener);
      },
      removeListener(event, listener) {
        // stop watching if we're currently watching {event}?
        _emitter.removeListener(event, listener);
      },
      async registerPollEvents(eventPayloadMap) {
        for (const [eventType, payloadGetterMap] of Object.entries(
          eventPayloadMap
        )) {
          const payloadFetcher = EventService._createPayloadFetcher(
            payloadGetterMap
          );
          const memoizedPoll = await EventService._createMemoizedPoll({
            type: eventType,
            emit: this.emit,
            getState: payloadFetcher
          });
          // right now we push straight into hot polls for convenience while testing
          hotPolls.push(memoizedPoll);
        }
      },
      watchAll() {
        hotPolls = [...coldPolls, ...hotPolls];
        coldPolls = [];
      },
      watch(type) {
        const staged = coldPolls.filter(poll => poll.type() === type);
        coldPolls = coldPolls.filter(poll => poll.type() !== type);
        hotPolls = [...hotPolls, ...staged];
      },
      getHotPolls() {
        return hotPolls;
      }
    };
  }

  //   static _isValidService(service) {
  //     return true;
  //   }

  //////////////////////////////
  /////  Polling Helpers  //////
  //////////////////////////////

  // this could be made more efficient with promise.all
  static _createPayloadFetcher(payloadSchema) {
    return async () => {
      const payload = {};
      for (const [key, getter] of Object.entries(payloadSchema)) {
        payload[key] = await getter();
      }
      return payload;
    };
  }

  static async _createMemoizedPoll({ type, getState, emit }) {
    let curr = await getState();
    return {
      async ping(block) {
        const next = await getState();
        if (!isEqual(curr, next)) {
          emit(type, next, block);
          curr = next;
        }
      },
      type() {
        return type;
      }
    };
  }
}
