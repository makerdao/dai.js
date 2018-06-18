import PrivateService from '../core/PrivateService';
import { eventIndexer, slug } from './index';
import isEqual from 'lodash.isequal';
import EventEmitterObj from 'eventemitter2';

const { EventEmitter2 } = EventEmitterObj;

export default class EventService extends PrivateService {
  /**
   * @param {string} name
   */
  constructor(name = 'event') {
    super(name, ['log']);

    this.block = null;
    // all of our emitters
    // we can have many of these
    // e.g. one for our maker object, a couple on some cdp objects, a few more on transaction objects, etc
    this.emitters = {};

    // this is our default emitter, it will likely be the maker object's personal emitter
    this.buildEmitter({ defaultEmitter: true });
    this.ping = this.ping.bind(this);
  }

  // check all of our active polls for new state
  // this is currently called on every new block from Web3Service
  ping(block) {
    this._setBlock(block);
    for (const emitter of Object.values(this.emitters)) {
      this._pingEmitter(emitter, block);
    }
  }

  _pingEmitter(emitter, block) {
    return Promise.all(emitter.getPolls().map(poll => poll.ping(block)));
  }

  _setBlock(block) {
    this.block = block;
  }

  _getBlock() {
    return this.block;
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

  disposeEmitter(name) {
    if (name === 'default') {
      this._logError(name, 'cannot dispose default emitter');
    } else delete this.emitters[name];
  }

  registerPollEvents(eventPayloadMap, emitter = this._defaultEmitter()) {
    return emitter.registerPollEvents(eventPayloadMap);
  }

  activatePollsForAllEmitters() {
    Object.values(this.emitters).forEach(emitter => emitter.activatePolls());
  }

  _defaultEmitter() {
    return this.emitters.default;
  }

  _logError(name, msg) {
    this.get('log').error(`Problem encountered in emitter ${name}: ${msg}`);
  }

  // emitter factory
  buildEmitter({
    _emitter = new EventEmitter2({
      wildcard: true,
      delimiter: '/'
    }),
    _name = slug(),
    indexer = eventIndexer(),
    defaultEmitter = false
  } = {}) {
    const name = defaultEmitter ? 'default' : _name;
    const disposer = this.disposeEmitter.bind(this, name);
    const _getBlock = this._getBlock.bind(this);
    const newEmitter = this._buildEmitter({
      _emitter,
      indexer,
      disposer,
      _getBlock
    });
    newEmitter.on('error', msg => this._logError(name, msg));
    this.emitters[name] = newEmitter;
    return newEmitter;
  }

  _buildEmitter({ _emitter, indexer, disposer, _getBlock, polls = [] }) {
    return {
      emit(event, payload = {}, block = _getBlock()) {
        const eventObj = {
          block,
          payload,
          type: event,
          index: indexer()
        };
        _emitter.emit(event, eventObj);
      },
      on(event, listener) {
        // start watching if we're not currently watching {event}?
        _emitter.on(event, listener);
      },
      removeListener(event, listener) {
        // stop watching if we're currently watching {event}?
        _emitter.removeListener(event, listener);
      },
      registerPollEvents(eventPayloadMap) {
        for (const [eventType, payloadGetterMap] of Object.entries(
          eventPayloadMap
        )) {
          const payloadFetcher = EventService._createPayloadFetcher(
            payloadGetterMap
          );
          const memoizedPoll = EventService._createMemoizedPoll({
            type: eventType,
            emit: this.emit,
            getState: payloadFetcher
          });
          polls.push(memoizedPoll);
        }
        return this;
      },
      activatePolls() {
        polls.forEach(poll => poll.heat());
      },
      activatePoll(type) {
        const staged = polls.filter(poll => poll.type() === type);
        staged.forEach(poll => poll.heat());
      },
      getPolls() {
        return polls;
      },
      dispose() {
        disposer();
      }
    };
  }

  //////////////////////////////
  /////  Polling Helpers  //////
  //////////////////////////////

  static _createPayloadFetcher(payloadSchema) {
    return () => {
      return Promise.all(
        Object.entries(payloadSchema).map(([key, getter]) =>
          getter().then(state => [key, state])
        )
      ).then(states => {
        const payload = {};
        for (const [key, state] of states) {
          payload[key] = state;
        }
        return payload;
      });
    };
  }

  static _createMemoizedPoll({
    type,
    getState,
    emit,
    curr = {},
    live = false
  }) {
    return {
      async ping(block) {
        if (!live) return;
        try {
          const next = await getState();
          if (!isEqual(curr, next)) {
            emit(type, next, block);
            curr = next;
          }
        } catch (err) {
          const msg = `failed to get latest ${type} state: ${err}`;
          emit('error', msg, block);
        }
      },
      type() {
        return type;
      },
      heat() {
        if (!live) live = true;
      },
      cool() {
        if (live) live = false;
      }
    };
  }
}
