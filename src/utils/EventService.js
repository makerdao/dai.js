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

    this.emitters = {};

    // this is our default emitter, this will be the maker object's emitter in all likelihood
    this.createEmitter({ defaultEmitter: true });
    // I'd rather assign the default pipeline directly in the constructor

    this.ping = this.ping.bind(this);
    // null service
    // pub sub
    // cast
  }

  // add a listener to an emitter
  on(event, listener, emitter = this._defaultEmitter()) {
    emitter.on(event, listener);
  }

  // push an event through an emitter
  emit(event, payload, block, emitter = this._defaultEmitter()) {
    emitter.emit(event, payload, block);
  }

  removeListener(event, listener, emitter = this._defaultEmitter()) {
    emitter.removeListener(event, listener);
  }

  // checks all of the state we are watching for updates
  // this is called on every new block from the web3service
  // but it could be called anytime we want to check for state changes
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

  registerPollEvents(eventPayloadHash, emitter = this._defaultEmitter()) {
    emitter.registerPollEvents(eventPayloadHash);
  }

  _defaultEmitter() {
    return this.emitters.default;
  }

  watchAllRegisteredEvents() {
    for (const emitter of Object.values(this.emitters)) {
      emitter.watchAll();
    }
  }

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
        // start watching if we're not currently watching it?
        _emitter.on(event, listener);
      },
      removeListener(event, listener) {
        // stop watching if we're currently watching it?
        _emitter.removeListener(event, listener);
      },
      async registerPollEvents(eventPayloadHash) {
        for (let [eventType, payloadSchema] of Object.entries(
          eventPayloadHash
        )) {
          const payloadFetcher = EventService._createPayloadFetcher(
            payloadSchema
          );
          const memoizedPoll = await EventService._createMemoizedPoll({
            type: eventType,
            emit: this.emit,
            getState: payloadFetcher
          });
          coldPolls.push(memoizedPoll);
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

  // this could be optimized with promise.all, but that
  // might be premature
  static _createPayloadFetcher(payloadSchema) {
    return async () => {
      const payload = {};
      for (let [key, getter] of Object.entries(payloadSchema)) {
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
